"use client";

import { useMemo, useState } from "react";
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
  stage: "submitting" | "unknown" | "pending_desktop";
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

  const submit = async () => {
    if (!items || !fingerprint || !validQuote || received === null || busy) return;
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
    if (attempt?.stage === "pending_desktop") return;
    const next = attempt ?? {
      id: crypto.randomUUID(), cartFingerprint:fingerprint,
      cashReceived:received, stage:"submitting" as const,
    };
    setAttempt({...next, stage:"submitting"});
    setBusy(true);
    setError(null);
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
        // A known HTTP rejection can safely be retried under the same key.
        // Keep the key even for 423 and 409; never silently start a new sale.
        setAttempt({...next, stage:"unknown"});
        throw new Error(body.error ?? "The sale was not confirmed.");
      }
      if (body.status !== "pending_desktop" || typeof body.sale_id !== "string") {
        throw new Error("The sale response was not verified. Check the desktop before retrying.");
      }
      setAttempt({...next,stage:"pending_desktop",receipt:body.receipt_number});
      setQuote(null);
    } catch (cause) {
      setAttempt(current=>current?.stage === "pending_desktop"
        ? current : {...next,stage:"unknown"});
      setError(cause instanceof Error ? cause.message : "Sale status is uncertain. Retry with the same request ID.");
    } finally { setBusy(false); }
  };

  return <>
    <Button type="button" variant="outline"
      disabled={!items?.length || Boolean(attempt)}
      onClick={()=>setOpen(true)}>
      Cash sale pilot
    </Button>
    <Dialog open={open} onOpenChange={value=>{
      // Preserve an uncertain request; closing the UI must not hide it.
      if (!value && (busy || (attempt && attempt.stage !== "pending_desktop"))) return;
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
        {attempt?.stage === "pending_desktop" ? (
          <div className="space-y-2 rounded-md border p-4 text-sm" role="status">
            <p className="font-semibold">Sale queued for desktop reconciliation</p>
            <p>Reference: {attempt.receipt ?? attempt.id}</p>
            <p>Confirm the final sale status on AkiliBiz Desktop before handing over a receipt.</p>
          </div>
        ) : <>
          {attempt && <p role="status" className="rounded-md border p-3 text-sm">
            A previous request has an uncertain outcome. Retry using the same
            request ID; do not submit another sale for this payment.
            <span className="mt-1 block font-mono text-xs">{attempt.id}</span>
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
          <Button variant="outline" type="button" disabled={busy || (attempt !== null && attempt.stage !== "pending_desktop")}
            onClick={()=>setOpen(false)}>Close</Button>
          {attempt?.stage !== "pending_desktop" && <Button type="button"
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
