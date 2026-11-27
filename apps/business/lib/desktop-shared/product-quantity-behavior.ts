// GENERATED from the AkiliBiz Desktop repository (src/components/product-quantity-behavior.ts). Do not edit here:
// change the desktop file, then run `node apps/business/scripts/sync-desktop-i18n.mjs`.
/** Product package contents (e.g. 500 ml) are not POS quantities. */
const COUNTABLE_UNITS = new Set([
  "pcs", "pc", "piece", "pieces", "unit", "units", "bottle", "bottles",
  "pack", "packet", "box", "carton", "case", "pair", "set", "dozen",
  "sachet", "can", "tin", "jar", "tube", "bag", "sack", "crate",
  "roll", "bucket", "drum", "blister", "strip", "bale", "bundle",
  "tray", "pallet", "bar", "loaf", "reel", "spool",
]);
export function isCountableStockUnit(stockUnit: string): boolean {
  return COUNTABLE_UNITS.has(stockUnit.trim().toLowerCase());
}
export function permitsFractionalSales(stockUnit: string, allowDecimal: boolean): boolean {
  return allowDecimal && !isCountableStockUnit(stockUnit);
}
export function isLikelyPackagedVolume(name: string, stockUnit: string): boolean {
  if (!/^(?:ml|ltr|l|cl|dl|litre|liter|litres|liters)$/i.test(stockUnit.trim())) return false;
  return /(?:^|[^a-z0-9])\d+(?:\.\d+)?\s*(?:ml|l|ltr|litres?|liters?)(?![a-z])/i.test(name);
}
