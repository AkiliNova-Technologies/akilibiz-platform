import { describe, expect, it } from "vitest";
import { desktopProductRow } from "@/lib/desktop-product-row";
import { productChanges } from "./product-change-requests";
import type { DesktopCreateProduct } from "./use-redux-products";

const row = desktopProductRow({
  id: "8d0f1c2e-1111-4a6b-9c3d-000000000001", local_business_public_id: "src", local_product_id: 7,
  category_id: "c1", name: "Tea", sku: "TEA-1", barcode: null, description: null, brand: null,
  stock_unit: "pcs", sales_unit: "pcs", selling_price_ugx: 2500, cost_price_ugx: 1000,
  allow_decimal_quantity: false, tax_inclusive: false, is_active: true, updated_at: "2026-11-27T10:00:00Z",
  details: { product_type: "stock_item", inventory_type: "count", purchase_unit: "pcs", unit_conversion_factor: 1,
    min_stock_level_milli: 10000, max_stock_level_milli: 100000, is_taxable: true, tax_classification: "Standard Rated" },
}, { local_category_id: 3, name: "Drinks" }, 5000);

// What the desktop Products screen submits on edit (its full form).
const form = (over: Partial<DesktopCreateProduct> = {}): DesktopCreateProduct => ({
  name: "Tea", sku: "TEA-1", barcode: null, category_id: 3, brand: null, description: null,
  product_type: "stock_item", inventory_type: "count", stock_unit: "pcs", sales_unit: "pcs", purchase_unit: "pcs",
  unit_conversion_factor: 1, pack_size: null, package_content_quantity: null, package_content_unit: null,
  cost_price: 1000, selling_price: 2500, wholesale_price: null, minimum_selling_price: null,
  min_stock_level: 10, max_stock_level: 100, allow_decimal_quantity: false, allow_negative_stock: false,
  track_expiry: false, track_batches: false, is_taxable: true, tax_classification_id: 1, tax_inclusive: false,
  is_active: true, ...over,
});

describe("web product change", () => {
  it("sends nothing when the form is unchanged", () => {
    expect(productChanges(row, form())).toEqual({});
  });
  it("sends only changed fields, with the tax class as a code", () => {
    expect(productChanges(row, form({ name: "Tea 500g", selling_price: 3000, tax_classification_id: 2 })))
      .toEqual({ name: "Tea 500g", selling_price: 3000, tax_classification_code: "ZERO_RATED" });
  });
  it("never sends stock", () => {
    expect(Object.keys(productChanges(row, form({ name: "X" })))).not.toContain("stock_quantity");
  });
});
