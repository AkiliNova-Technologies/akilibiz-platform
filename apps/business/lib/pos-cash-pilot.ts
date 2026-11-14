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
