"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  pilotCartFingerprint, pilotCashAmount, pilotQuoteItems,
  type CashPilotCartItem,
} from "@/lib/pos-cash-pilot";

type Quote = {
  business_id?: string;
  ok?: boolean;
  subtotal_ugx?: number;
  error?: string;
};
type SaleResponse = {
  sale_id?: string;
  receipt_number?: string;
  status?: string;
  replayed?: boolean;
  error?: string;
};
type Attempt = {
  id: string;
  cartFingerprint: string;
  cashReceived: number;
  stage: "submitting" | "unknown" | "pending_desktop" | "desktop_applied" | "reconciled" | "voided";
  receipt?: string;
};

/** Pilot only. Production checkout remains locked by the hosted DB control. */
export function CashSalePilot({
  businessId,
  cartItems,
}: {
  businessId: string;
  cartItems: CashPilotCartItem[];
}) {
  const [open, setOpen] = useState(false);
  const [cash, setCash] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<{ fingerprint: string; total: number } | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [busy, setBusy] = useState(false);
  const [restored, setRestored] = useState(false);
  const storageKey = `akilibiz.cash-pilot.${businessId}`;
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as { attempt?: Attempt; cash?: string; quote?: { fingerprint: string; total: number } };
        if (saved.attempt && typeof saved.attempt.id === "string" &&
            typeof saved.attempt.cartFingerprint === "string" &&
            Number.isSafeInteger(saved.attempt.cashReceived) &&
            ["unknown","submitting","pending_desktop","desktop_applied","reconciled","voided"].includes(saved.attempt.stage)) {
          setAttempt({ ...saved.attempt, stage: saved.attempt.stage === "submitting" ? "unknown" : saved.attempt.stage });
          setCash(typeof saved.cash === "string" ? saved.cash : String(saved.attempt.cashReceived));
          if (saved.quote && typeof saved.quote.fingerprint === "string" &&
              Number.isSafeInteger(saved.quote.total)) setQuote(saved.quote);
          setOpen(true);
        }
      }
    } catch { /* Browser storage is optional; never create a new ID automatically for an unverified sale. */ }
    setRestored(true);
  }, [storageKey]);
  useEffect(() => {
    if (!restored) return;
    try {
      if (!attempt) window.sessionStorage.removeItem(storageKey);
      else window.sessionStorage.setItem(storageKey, JSON.stringify({ attempt, cash, quote }));
    } catch { /* A failed storage write must not be treated as confirmation of a sale. */ }
  }, [attempt, cash, quote, restored, storageKey]);
  const items = useMemo(() => pilotQuoteItems(cartItems), [cartItems]);
  const fingerprint = useMemo(
    () => items ? pilotCartFingerprint(businessId, items) : null,
    [businessId, items],
  );
  const validQuote = quote && fingerprint && quote.fingerprint === fingerprint
    ? quote : null;
  const received = pilotCashAmount(cash);
  const attemptMatches = attempt && attempt.cartFingerprint === fingerprint &&
    attempt.cashReceived === received;

  const verify = async () => {
    if (!items || !fingerprint || busy || attempt) return;
    setBusy(true);
    setError(null);
    setQuote(null);
    try {
      const response = await fetch("/api/pos/quote", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        cache:"no-store",
        body:JSON.stringify({items}),
      });
      const body = await response.json() as Quote;
      if (!response.ok || body.business_id !== businessId ||
          body.ok !== true || typeof body.subtotal_ugx !== "number" ||
          !Number.isSafeInteger(body.subtotal_ugx) || body.subtotal_ugx < 0) {
        throw new Error(body.error ?? "Stock and prices could not be verified.");
      }
      setQuote({fingerprint,total:body.subtotal_ugx});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not check this sale.");
    } finally { setBusy(false); }
  };

  const checkStatus = async () => {
    if (!attempt || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/pos/sales/status?requestId=${encodeURIComponent(attempt.id)}`,
        {cache:"no-store"},
      );
      const status = await response.json() as {
        state?: "not_found" | "pending_desktop" | "desktop_applied" | "reconciled" | "voided";
        receiptNumber?: string;
        error?: string;
      };
      if (!response.ok || !status.state) {
        throw new Error(status.error ?? "Could not verify this sale's status.");
      }
      if (status.state === "not_found") {
        setError("No accepted sale has been found for this request. Keep the original request ID and confirm with the desktop before starting another sale.");
      } else {
        setAttempt({...attempt, stage:status.state, receipt:status.receiptNumber ?? attempt.receipt});
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not verify this sale.");
    } finally { setBusy(false); }
  };

  const submit = async () => {
    if (!restored || !items || !fingerprint || !validQuote || received === null || busy) return;
    if (received < validQuote.total) {
      setError("Cash received is less than the verified subtotal.");
      return;
    }
    // A network timeout is ambiguous: reuse this exact key, cash and cart.
    // Never generate a second key to retry the same transaction.
    if (attempt && !attemptMatches) {
      setError("This sale has an unresolved request. Restore the original cart and cash amount to retry safely.");
      return;
    }
    if (attempt && !["unknown","submitting"].includes(attempt.stage)) return;
    const next = attempt ?? {
      id: crypto.randomUUID(), cartFingerprint:fingerprint,
      cashReceived:received, stage:"submitting" as const,
    };
    // Persist the idempotency key BEFORE the network call. Do not risk a
    // duplicate new key if the browser is refreshed during transmission.
    try { window.sessionStorage.setItem(storageKey, JSON.stringify({
      attempt:{...next,stage:"unknown"}, cash, quote,
    })); } catch {
      setError("Safe sale recovery is unavailable in this browser. Do not proceed.");
      return;
    }
    setAttempt({...next, stage:"submitting"});
    setBusy(true);
    setError(null);
    let safelyRejected = false;
    try {
      const response=await fetch("/api/pos/sales",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        cache:"no-store",
        body:JSON.stringify({
          idempotency_key:next.id,
          cash_received_ugx:next.cashReceived,
          items,
        }),
      });
      const body=await response.json() as SaleResponse;
      if (!response.ok) {
        // Auth/validation/closed-gate failures cannot have posted a sale.
        // Conflicts or service failures are not conclusive: preserve the
        // original key until a desktop/operator reconciliation.
        safelyRejected = [400,401,403,423].includes(response.status);
        throw new Error(body.error ?? "The sale was not confirmed.");
      }
      if (body.status !== "pending_desktop" || typeof body.sale_id !== "string") {
        throw new Error("The sale response was not verified. Check the desktop before retrying.");
      }
      setAttempt({...next,stage:"pending_desktop",receipt:body.receipt_number});
      setQuote(null);
    } catch (cause) {
      if (safelyRejected) {
        setAttempt(null);
        setQuote(null);
        try { window.sessionStorage.removeItem(storageKey); } catch { /* optional */ }
      } else {
        setAttempt(current=>current?.stage === "pending_desktop"
          ? current : {...next,stage:"unknown"});
      }
      setError(cause instanceof Error ? cause.message : "Sale status is uncertain. Retry with the same request ID.");
    } finally { setBusy(false); }
  };

  return <>
    <Button type="button" variant="outline"
      disabled={!restored || (!items?.length && !attempt)}
      onClick={()=>setOpen(true)}>
      Cash sale pilot
    </Button>
    <Dialog open={open} onOpenChange={value=>{
      // Preserve an uncertain request; closing the UI must not hide it.
      if (!value && busy) return;
      setOpen(value);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cash sale pilot</DialogTitle>
          <DialogDescription>
            This is a controlled pilot for paired businesses. It does not
            confirm a desktop sale or issue a final receipt.
          </DialogDescription>
        </DialogHeader>
        {attempt && ["pending_desktop","desktop_applied","reconciled","voided"].includes(attempt.stage) ? (
          <div className="space-y-2 rounded-md border p-4 text-sm" role="status">
            <p className="font-semibold">{attempt.stage === "pending_desktop"
              ? "Sale queued for desktop reconciliation"
              : attempt.stage === "desktop_applied"
                ? "Desktop has applied the sale; stock reconciliation is pending"
                : attempt.stage === "reconciled"
                  ? "Sale reconciled with desktop"
                  : "Sale voided"}</p>
            <p>Reference: {attempt.receipt ?? attempt.id}</p>
            <p>Verify final receipt and accounting details on AkiliBiz Desktop.</p>
            <Button type="button" variant="outline" disabled={busy} onClick={()=>void checkStatus()}>
              {busy ? "Checking…" : "Check latest status"}
            </Button>
          </div>
        ) : <>
          {attempt && <p role="status" className="rounded-md border p-3 text-sm">
            A previous request has an uncertain outcome. Retry using the same
            request ID; do not submit another sale for this payment.
            <span className="mt-1 block font-mono text-xs">{attempt.id}</span>
            <Button type="button" variant="outline" className="mt-2" disabled={busy} onClick={()=>void checkStatus()}>
              {busy ? "Checking…" : "Check request status"}
            </Button>
          </p>}
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" disabled={busy || !!attempt || !items}
              onClick={()=>void verify()}>
              {busy ? "Checking…" : "Verify stock and prices"}
            </Button>
            {validQuote && <span className="text-sm">
              Verified subtotal: UGX {validQuote.total.toLocaleString("en-UG")}
            </span>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="pilot-cash">Cash received (UGX)</Label>
            <Input id="pilot-cash" inputMode="numeric" value={cash}
              disabled={busy || Boolean(attempt)}
              onChange={event=>setCash(event.target.value)}
              placeholder="Enter whole shillings"/>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        </>}
        <DialogFooter>
          <Button variant="outline" type="button" disabled={busy}
            onClick={()=>setOpen(false)}>Close</Button>
          {(!attempt || ["unknown","submitting"].includes(attempt.stage)) && <Button type="button"
            disabled={busy || !validQuote || received === null || (
              attempt !== null && !attemptMatches
            )} onClick={()=>void submit()}>
            {busy ? "Submitting…" : attempt ? "Retry same request" : "Request cash sale"}
          </Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
