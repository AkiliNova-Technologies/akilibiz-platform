import { describe, expect, it } from "vitest";
import { desktopProductRow, type HostedCatalogueProduct } from "./desktop-product-row";

const base: HostedCatalogueProduct = {
  id: "8d0f1c2e-1111-4a6b-9c3d-000000000001", local_business_public_id: "src", local_product_id: 7, category_id: "c1", name: "Sugar 1kg",
  sku: "SUG-1", barcode: null, description: null, brand: null, stock_unit: "pcs", sales_unit: "pcs",
  selling_price_ugx: 5000, cost_price_ugx: 4000, allow_decimal_quantity: false, tax_inclusive: true,
  is_active: true, updated_at: "2026-11-27T10:00:00Z",
  details: { product_type: "stock_item", inventory_type: "count", min_stock_level_milli: 5000,
    max_stock_level_milli: 50000, wholesale_price_ugx: 4500, is_taxable: true,
    tax_classification: "Standard Rated", track_expiry: true, created_at: "2026-11-01 08:00:00" },
};

describe("desktop product row", () => {
  it("applies the desktop margin and low-stock rules", () => {
    const row = desktopProductRow(base, { local_category_id: 3, name: "Groceries" }, 5000);
    expect(row.profit_margin).toBeCloseTo(20);
    expect(row.stock_quantity).toBe(5);
    expect(row.min_stock_level).toBe(5);
    expect(row.is_low_stock).toBe(true); // desktop: stock <= minimum
    expect(row).toMatchObject({ id: 7, category_id: 3, category_name: "Groceries", tax_classification_id: 1,
      wholesale_price: 4500, track_expiry: true, max_stock_level: 50, created_at: "2026-11-01 08:00:00" });
  });

  it("keeps an older desktop's product usable without details", () => {
    const row = desktopProductRow({ ...base, details: null, selling_price_ugx: 0 }, null, null);
    expect(row).toMatchObject({ product_type: "stock_item", inventory_type: "count", profit_margin: 0,
      tax_classification_id: null, stock_known: false, purchase_unit: "pcs", unit_conversion_factor: 1 });
  });
});
