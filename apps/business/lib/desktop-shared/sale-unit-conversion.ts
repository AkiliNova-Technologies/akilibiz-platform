// GENERATED from the AkiliBiz Desktop repository (src/components/sale-unit-conversion.ts). Do not edit here:
// change the desktop file, then run `node apps/business/scripts/sync-desktop-i18n.mjs`.
import { purchaseToStockQuantity } from "./product-units";
import { isCountableStockUnit } from "./product-quantity-behavior";

/** Exact metric dimensions only. Imperial/custom dimensions are not silently converted. */
const metric: Record<string, { dimension: string; size: number }> = {
  mg: { dimension: "weight", size: 1 }, g: { dimension: "weight", size: 1000 },
  kg: { dimension: "weight", size: 1000000 }, tonne: { dimension: "weight", size: 1000000000 },
  ml: { dimension: "liquid", size: 1 }, cl: { dimension: "liquid", size: 10 },
  dl: { dimension: "liquid", size: 100 }, ltr: { dimension: "liquid", size: 1000 },
  mm: { dimension: "length", size: 1 }, cm: { dimension: "length", size: 10 },
  m: { dimension: "length", size: 1000 }, km: { dimension: "length", size: 1000000 },
  sqmm: { dimension: "area", size: 1 }, sqcm: { dimension: "area", size: 100 },
  sqm: { dimension: "area", size: 1000000 },
  cc: { dimension: "volume", size: 1 }, cbcm: { dimension: "volume", size: 1 },
  cbm: { dimension: "volume", size: 1000000 },
};

export function compatibleSaleUnits(stockUnit: string): string[] {
  if (isCountableStockUnit(stockUnit) || !metric[stockUnit]) return [stockUnit];
  return [stockUnit, ...Object.entries(metric)
    .filter(([name, info]) => name !== stockUnit && info.dimension === metric[stockUnit].dimension)
    .map(([name]) => name)];
}

/** Convert a cashier-entered sales quantity to the authoritative stock quantity.
 * Reject unrepresentable thousandths and incompatible dimensions.
 */
export function saleToStockQuantity(raw: string, saleUnit: string, stockUnit: string): number | null {
  if (saleUnit === stockUnit) return purchaseToStockQuantity(raw, 1);
  const source = metric[saleUnit], target = metric[stockUnit];
  if (!source || !target || source.dimension !== target.dimension ||
    isCountableStockUnit(stockUnit)) return null;
  return purchaseToStockQuantity(raw, source.size / target.size);
}

export function stockToSaleQuantity(stockQuantity: number, stockUnit: string, saleUnit: string): number | null {
  if (!Number.isFinite(stockQuantity) || stockQuantity < 0) return null;
  if (stockUnit === saleUnit) return stockQuantity;
  const source = metric[stockUnit], target = metric[saleUnit];
  if (!source || !target || source.dimension !== target.dimension ||
    isCountableStockUnit(stockUnit)) return null;
  const result = stockQuantity * source.size / target.size;
  return Number.isFinite(result) ? Number(result.toFixed(6)) : null;
}
