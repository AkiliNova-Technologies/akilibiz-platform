// GENERATED from the AkiliBiz Desktop repository (src/components/product-units.ts). Do not edit here:
// change the desktop file, then run `node apps/business/scripts/sync-desktop-i18n.mjs`.
/** Display-only unit catalog. These labels do not activate quantity conversions in POS or receiving. */
export type InventoryMeasure = "count" | "weight" | "liquid" | "length" | "area" | "volume";
export const inventoryUnitOptions: Record<InventoryMeasure, readonly string[]> = {
  count: ["pcs", "bottle", "pair", "set", "dozen", "score", "pack", "packet", "box", "carton", "case",
    "tray", "bag", "sack", "bale", "bundle", "crate", "pallet", "can", "tin",
    "jar", "tube", "sachet", "strip", "blister", "roll", "reel", "spool", "sheet",
    "bar", "loaf", "bunch", "head", "bucket", "drum", "container", "unit"],
  weight: ["mg", "g", "kg", "tonne", "oz", "lb", "stone"],
  liquid: ["ml", "cl", "dl", "ltr", "fl oz (US)", "pint (US)", "quart (US)", "gallon (US)", "gallon (UK)"],
  length: ["mm", "cm", "m", "km", "inch", "ft", "yd", "mile"],
  area: ["sqmm", "sqcm", "sqm", "sqkm", "sqft", "sqyd", "acre", "hectare"],
  volume: ["cc", "cbcm", "cbm", "cbft", "cb inch", "cb yard"],
};
export function unitChoices(type: InventoryMeasure, current: string): string[] {
  const list = [...new Set(inventoryUnitOptions[type])];
  const selected = current.trim();
  return selected && !list.includes(selected) ? [selected, ...list] : list;
}
export function isPositiveNumber(value: string): boolean {
  return value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) > 0;
}
export function isNonnegativeNumber(value: string): boolean {
  return value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 0;
}
/**
 * Exact decimal quantity -> stock milli-units.
 *
 * Uses integer fractions, not binary floating-point multiplication. Only
 * quantities exactly representable in stock thousandths may be posted.
 * This converts an explicitly entered purchase-unit quantity into the product's
 * stock unit; it does NOT convert PO prices, receipts, or sales prices.
 */
export function purchaseToStockQuantity(quantity: string, factor: number): number | null {
  if (!Number.isFinite(factor) || factor <= 0) return null;
  function fraction(raw: string): [bigint, bigint] | null {
    const cleaned = raw.trim();
    if (!/^[0-9]+(?:[.][0-9]{1,9})?$/.test(cleaned)) return null;
    const [whole, decimals = ""] = cleaned.split(".");
    return [BigInt(whole + decimals), 10n ** BigInt(decimals.length)];
  }
  const qty = fraction(quantity);
  const conversion = fraction(String(factor));
  if (!qty || !conversion || qty[0] <= 0n || conversion[0] <= 0n) return null;
  const numerator = qty[0] * conversion[0] * 1000n;
  const denominator = qty[1] * conversion[1];
  if (numerator % denominator !== 0n) return null;
  const milli = numerator / denominator;
  if (milli <= 0n || milli > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(milli) / 1000;
}
