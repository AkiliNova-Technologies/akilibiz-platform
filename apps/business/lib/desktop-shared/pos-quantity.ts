// GENERATED from the AkiliBiz Desktop repository (src/components/pos-quantity.ts). Do not edit here:
// change the desktop file, then run `node apps/business/scripts/sync-desktop-i18n.mjs`.
/**
 * Quantities are expressed in the product's stock unit. A separate sales-unit
 * conversion must not be inferred from its purchase conversion factor.
 */
import { permitsFractionalSales } from "./product-quantity-behavior";

export function validatePosQuantity(
  quantity: number,
  stock: number,
  allowDecimal: boolean,
  wholeUgxUnitPrice: number,
  stockUnit = "pcs",
): { ok: true } | { ok: false; message: string } {
  const milli = Math.round(quantity * 1000);
  const fractional = permitsFractionalSales(stockUnit, allowDecimal);
  if (!Number.isFinite(quantity) || !Number.isSafeInteger(milli) ||
    Math.abs(milli / 1000 - quantity) > 0.0000001 || milli <= 0 ||
    (!fractional && milli % 1000 !== 0)) {
    return { ok: false, message: fractional
      ? "Enter a quantity with up to three decimal places."
      : "This product must be sold in whole units." };
  }
  if (quantity > stock) return { ok: false, message: "Quantity exceeds available stock." };
  const totalMilli = milli * wholeUgxUnitPrice;
  if (!Number.isSafeInteger(wholeUgxUnitPrice) || wholeUgxUnitPrice < 0 ||
    !Number.isSafeInteger(totalMilli) || totalMilli % 1000 !== 0) {
    return { ok: false, message: "This quantity does not produce an exact whole-UGX total." };
  }
  return { ok: true };
}
