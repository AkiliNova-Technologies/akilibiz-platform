import type { QuoteItem } from "@/lib/pos-quote";

export type CashPilotCartItem = { product_id: string; quantity: number };

export function pilotQuoteItems(items: readonly CashPilotCartItem[]): QuoteItem[] | null {
  if (!items.length || items.length > 100) return null;
  const seen = new Set<string>();
  const results: QuoteItem[] = [];
  for (const item of items) {
    const milli = Math.round(item.quantity * 1000);
    if (!Number.isFinite(item.quantity) || !Number.isSafeInteger(milli) ||
      milli < 1 || milli > 1_000_000_000 ||
      Math.abs(item.quantity * 1000 - milli) > 0.000001 ||
      seen.has(item.product_id)) return null;
    seen.add(item.product_id);
    results.push({ product_id: item.product_id, quantity_milli: milli });
  }
  return results;
}

/** Stable fingerprint: an amount change requires an entirely new request. */
export function pilotCartFingerprint(businessId: string, items: readonly QuoteItem[]): string {
  return JSON.stringify([businessId, [...items].sort((a,b)=>a.product_id.localeCompare(b.product_id))]);
}

export function pilotCashAmount(value: string): number | null {
  if (!/^(?:0|[1-9][0-9]{0,14})$/.test(value.trim())) return null;
  const amount = Number(value.trim());
  return Number.isSafeInteger(amount) ? amount : null;
}

/** Change due in whole UGX, or null when cash does not cover the amount due. */
export function cashChangeDue(received: number | null, amountDue: number | null): number | null {
  if (received === null || amountDue === null || !Number.isSafeInteger(received) ||
    !Number.isSafeInteger(amountDue) || received < amountDue) return null;
  return received - amountDue;
}

export type CashSaleStage =
  | "submitting" | "unknown" | "pending_desktop" | "desktop_applied" | "reconciled" | "voided";

/**
 * A finished request may be cleared to start the next sale only once the web
 * has accepted it (or it was voided). An uncertain or in-flight request must
 * keep its idempotency key so a retry can never record the payment twice.
 */
export function canStartNextSale(stage: CashSaleStage | null): boolean {
  return stage === "pending_desktop" || stage === "desktop_applied" ||
    stage === "reconciled" || stage === "voided";
}

/** Stages the dialog keeps polling while the desktop confirms the sale. */
export function awaitsDesktopConfirmation(stage: CashSaleStage | null): boolean {
  return stage === "pending_desktop" || stage === "desktop_applied";
}
