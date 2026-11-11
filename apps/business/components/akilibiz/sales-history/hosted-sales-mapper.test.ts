import { describe, expect, it } from "vitest";
import { mapHostedSale, mapHostedSaleItem, saleDetailFromRows } from "./hosted-sales-mapper";
import type { FinancialMirrorRow } from "@/components/akilibiz/finance/financial-mirror-client";

const sale: FinancialMirrorRow = {
  localRecordId: 41, capturedAt: "2026-11-11T01:00:00Z",
  record: {
    sale_number: "SAL-41", created_at: "2026-11-10T12:00:00Z",
    total_amount_ugx: 9000, subtotal_ugx: 8500, tax_amount_ugx: 500,
    discount_amount_ugx: 0, status: "completed", payment_method: "cash",
    items_count: 1, customer_name_snapshot: "Walk-in",
    cashier_name_snapshot: "Cashier", tax_classification: "STANDARD_RATED",
  },
};
const item: FinancialMirrorRow = {
  localRecordId: 91, capturedAt: sale.capturedAt,
  record: {
    sale_id: 41, product_name_snapshot: "Rice", sku_snapshot: "R-01",
    stock_unit: "kg", quantity_milli: 1500, unit_price_ugx: 6000,
    line_total_ugx: 9000, tax_amount_ugx: 500,
    discount_amount_ugx: 0,
  },
};
describe("hosted sale mirror validation", () => {
  it("uses integer UGX and milliquantities without inventing payment facts", () => {
    expect(mapHostedSale(sale)).toMatchObject({
      id: 41, sale_number: "SAL-41", total_amount: 9000,
      payment_method: "cash", status: "completed",
    });
    expect(mapHostedSaleItem(item)).toMatchObject({
      saleId: 41, quantity: 1.5, unit_price: 6000, tax_amount: 500,
    });
  });
  it("rejects unsupported states, methods or missing monetary amounts", () => {
    expect(mapHostedSale({ ...sale, record: { ...sale.record, status: "unknown" } })).toBeNull();
    expect(mapHostedSale({ ...sale, record: { ...sale.record, payment_method: "other" } })).toBeNull();
    expect(mapHostedSale({ ...sale, record: { ...sale.record, total_amount_ugx: null, total_amount: null } })).toBeNull();
    expect(mapHostedSaleItem({ ...item, record: { ...item.record, tax_amount_ugx: null, tax_amount: null } })).toBeNull();
  });
  it("requires all expected line items before showing a complete sale detail", () => {
    const parsed = mapHostedSale(sale);
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    expect(saleDetailFromRows(parsed, [item])).toMatchObject({ items: [{ name: "Rice", quantity: 1.5 }] });
    expect(saleDetailFromRows(parsed, [])).toBeNull();
    expect(saleDetailFromRows(parsed, [{ ...item, record: { ...item.record, sale_id: 42 } }])).toBeNull();
  });
});
