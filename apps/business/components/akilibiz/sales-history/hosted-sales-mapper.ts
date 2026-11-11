import type { FinancialMirrorRow } from "@/components/akilibiz/finance/financial-mirror-client";
import type { SaleDetail, SaleDetailItem, SaleListResponse, SalePaymentMethod, SaleStatus } from "./sales-history-data";

const amount = (v: unknown): number | null =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 ? v : null;
const numericId = (v: unknown): number | null =>
  typeof v === "number" && Number.isSafeInteger(v) && v > 0 ? v : null;
const name = (v: unknown, fallback: string): string =>
  typeof v === "string" && v.trim() ? v : fallback;
const paymentMethod = (v: unknown): SalePaymentMethod =>
  v === "mobile_money" || v === "card" || v === "split" ? v : "cash";
const status = (v: unknown): SaleStatus =>
  v === "cancelled" || v === "refunded" || v === "pending" ? v : "completed";
const money = (r: Record<string, unknown>, exact: string, legacy: string) =>
  amount(r[exact]) ?? amount(r[legacy]);
const dateValue = (value: unknown): string | null =>
  typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;

/** Reject malformed financial facts rather than presenting zero-value sales. */
export function mapHostedSale(row: FinancialMirrorRow): SaleListResponse | null {
  const r = row.record;
  const total = money(r, "total_amount_ugx", "total_amount");
  const subtotal = money(r, "subtotal_ugx", "subtotal");
  const discount = money(r, "discount_amount_ugx", "discount_amount");
  const tax = money(r, "tax_amount_ugx", "tax_amount");
  const createdAt = dateValue(r.created_at);
  const saleId = numericId(row.localRecordId);
  if (saleId === null || total === null || subtotal === null ||
      discount === null || tax === null || createdAt === null ||
      typeof r.sale_number !== "string" || !r.sale_number.trim()) return null;
  const itemCount = amount(r.items_count);
  if (itemCount === null) return null;
  return {
    id: saleId, sale_number: r.sale_number,
    customer_name: typeof r.customer_name_snapshot === "string" ? r.customer_name_snapshot : null,
    customer_phone: typeof r.customer_phone_snapshot === "string" ? r.customer_phone_snapshot : null,
    cashier_name: name(r.cashier_name_snapshot, "Desktop cashier"),
    items_count: itemCount, subtotal, discount_amount: discount, tax_amount: tax,
    tax_classification: typeof r.tax_classification === "string" ? r.tax_classification : null,
    tax_rate: typeof r.tax_rate === "number" && Number.isFinite(r.tax_rate) ? r.tax_rate : null,
    total_amount: total, payment_method: paymentMethod(r.payment_method),
    status: status(r.status), created_at: createdAt,
    staff_id: numericId(r.cashier_user_id) ?? undefined,
  };
}

export function mapHostedSaleItem(row: FinancialMirrorRow): (SaleDetailItem & { saleId: number }) | null {
  const r = row.record;
  const saleId = numericId(r.sale_id);
  const qtyMilli = amount(r.quantity_milli);
  const qtyLegacy = typeof r.quantity === "number" && Number.isFinite(r.quantity) && r.quantity > 0 ? r.quantity : null;
  const quantity = qtyMilli !== null ? qtyMilli / 1000 : qtyLegacy;
  const unit = money(r, "unit_price_ugx", "unit_price");
  const total = money(r, "line_total_ugx", "line_total");
  const tax = money(r, "tax_amount_ugx", "tax_amount");
  if (saleId === null || quantity === null || quantity <= 0 || unit === null || total === null || tax === null) return null;
  const product = name(r.product_name_snapshot, "Desktop product");
  return {
    saleId, id: row.localRecordId, name: product, product_name: product,
    sku: name(r.sku_snapshot, "—"), stock_unit: name(r.stock_unit, "unit"),
    quantity, unit_price: unit, line_total: total,
    discount_amount: money(r, "discount_amount_ugx", "discount_amount") ?? 0,
    tax_amount: tax,
    tax_classification: typeof r.tax_classification === "string" ? r.tax_classification : null,
    tax_rate: typeof r.tax_rate === "number" && Number.isFinite(r.tax_rate) ? r.tax_rate : null,
  };
}
export function saleDetailFromRows(sale: SaleListResponse, rows: FinancialMirrorRow[]): SaleDetail | null {
  const relevant = rows.filter(row => row.record.sale_id === sale.id);
  const parsed = relevant.map(mapHostedSaleItem);
  // Never show a partial receipt when the mirror is incomplete.
  if (parsed.length !== sale.items_count || parsed.some(row => row === null)) return null;
  return { ...sale, items: parsed.filter((row): row is NonNullable<typeof row> => row !== null) };
}
