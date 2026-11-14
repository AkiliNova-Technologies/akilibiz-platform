import type { FinancialMirrorRow } from "@/components/akilibiz/finance/financial-mirror-client";

type PurchaseOrderIdentity = { id: number; localBusinessPublicId: string };

export type PurchaseOrderLine = {
  id: number;
  product_id: number;
  ordered_quantity_milli: number;
  received_quantity_milli: number;
  unit_price_ugx: number;
  line_total_ugx: number;
  stock_unit: string | null;
};

export type PurchaseOrderReceipt = {
  id: number;
  receipt_number: string;
  receipt_date: string;
  status: "posted" | "voided";
  total_amount_ugx: number;
};

const integer = (value: unknown): number | null =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;

const positive = (value: unknown): number | null => {
  const parsed = integer(value);
  return parsed !== null && parsed > 0 ? parsed : null;
};

function matchesOrder(row: FinancialMirrorRow, order: PurchaseOrderIdentity) {
  // Numeric IDs from SQLite are NOT globally unique. Only the paired source
  // and the local parent ID together identify an order.
  return row.localBusinessPublicId === order.localBusinessPublicId &&
    row.record.purchase_order_id === order.id;
}

export function mapPurchaseOrderLines(
  order: PurchaseOrderIdentity,
  rows: FinancialMirrorRow[],
): PurchaseOrderLine[] {
  const result: PurchaseOrderLine[] = [];
  const ids = new Set<number>();
  for (const row of rows) {
    if (!matchesOrder(row, order)) continue;
    const r = row.record;
    const id = positive(row.localRecordId);
    const product = positive(r.product_id);
    const ordered = positive(r.quantity_milli);
    const received = integer(r.received_quantity_milli);
    const unitPrice = integer(r.unit_price_ugx);
    const lineTotal = integer(r.line_total_ugx);
    if (id === null || product === null || ordered === null ||
      received === null || received > ordered ||
      unitPrice === null || lineTotal === null || ids.has(id) ||
      (r.currency_code !== undefined && r.currency_code !== "UGX")) {
      throw new Error("Purchase-order line details could not be verified.");
    }
    // Whole UGX only. Never fabricate rounded or partial purchasing amounts.
    const scaled = ordered * unitPrice;
    if (!Number.isSafeInteger(scaled) || scaled % 1000 !== 0 ||
      scaled / 1000 !== lineTotal) {
      throw new Error("Purchase-order line totals do not reconcile.");
    }
    ids.add(id);
    result.push({
      id, product_id: product,
      ordered_quantity_milli: ordered, received_quantity_milli: received,
      unit_price_ugx: unitPrice, line_total_ugx: lineTotal,
      stock_unit: typeof r.stock_unit_snapshot === "string" &&
        r.stock_unit_snapshot.trim() ? r.stock_unit_snapshot : null,
    });
  }
  return result.sort((a,b) => a.id - b.id);
}

export function mapPurchaseOrderReceipts(
  order: PurchaseOrderIdentity,
  rows: FinancialMirrorRow[],
): PurchaseOrderReceipt[] {
  const result: PurchaseOrderReceipt[] = [];
  const ids = new Set<number>();
  for (const row of rows) {
    if (!matchesOrder(row, order)) continue;
    const r = row.record;
    const id = positive(row.localRecordId);
    const number = typeof r.receipt_number === "string" ? r.receipt_number.trim() : "";
    const date = typeof r.receipt_date === "string" ? r.receipt_date : "";
    const total = integer(r.total_amount_ugx);
    if (!id || !number || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date)) || total === null ||
      (r.status !== "posted" && r.status !== "voided") ||
      ids.has(id) || (r.currency_code !== undefined && r.currency_code !== "UGX")) {
      throw new Error("Purchase-order goods-receipt history could not be verified.");
    }
    ids.add(id);
    result.push({
      id, receipt_number: number, receipt_date: date,
      status: r.status, total_amount_ugx: total,
    });
  }
  return result.sort((a,b) => b.id - a.id);
}

export function verifyOrderLinesTotal(expectedTotal: number, lines: PurchaseOrderLine[]) {
  if (!lines.length) return false; // Older orders may not have saved item lines.
  let sum = 0;
  for (const line of lines) {
    sum += line.line_total_ugx;
    if (!Number.isSafeInteger(sum)) return false;
  }
  return sum === expectedTotal;
}
