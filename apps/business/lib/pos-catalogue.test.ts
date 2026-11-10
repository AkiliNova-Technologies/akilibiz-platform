import { describe, expect, it } from "vitest";
import { mapHostedPosCatalogue } from "./pos-catalogue";

const products = [
  {
    id: "product-a",
    name: "Ground coffee",
    sku: "COF-1",
    category_id: "category-a",
    selling_price_ugx: 12_500,
    stock_unit: "kg",
    is_active: true,
  },
  {
    id: "product-b",
    name: "Retired item",
    sku: "OLD-1",
    category_id: null,
    selling_price_ugx: null,
    stock_unit: "pcs",
    is_active: false,
  },
];

const categories = [
  { id: "category-a", name: "Beverages", is_active: true },
  { id: "category-b", name: "Archived", is_active: false },
];

describe("hosted POS catalogue mapping", () => {
  it("preserves canonical IDs, catalogue fields, UGX price, unit, and active categories", () => {
    const result = mapHostedPosCatalogue(products, categories, [
      { product_id: "product-a", on_hand_milli: 2_750, reserved_milli: 0, damaged_milli: 0, is_current: true },
    ]);

    expect(result.categories).toEqual([{ id: "category-a", name: "Beverages" }]);
    expect(result.products[0]).toMatchObject({
      id: "product-a",
      name: "Ground coffee",
      sku: "COF-1",
      category_id: "category-a",
      selling_price: 12_500,
      stock_unit: "kg",
      is_active: true,
    });
  });

  it("retains exact three-decimal effective inventory quantities", () => {
    const result = mapHostedPosCatalogue(products, categories, [
      { product_id: "product-a", on_hand_milli: 1_234, reserved_milli: 0, damaged_milli: 0, is_current: true },
    ]);
    expect(result.products[0].stock_quantity).toBe(1.234);
    expect(result.products[0].inventory_available).toBe(true);
  });

  it("treats zero stock as known and unavailable for sale", () => {
    const result = mapHostedPosCatalogue(products, categories, [
      { product_id: "product-a", on_hand_milli: 0, reserved_milli: 0, damaged_milli: 0, is_current: true },
    ]);
    expect(result.products[0]).toMatchObject({
      stock_quantity: 0,
      inventory_available: true,
    });
  });

  it("never turns missing, stale, or unsafe inventory into positive stock", () => {
    const result = mapHostedPosCatalogue(products, categories, [
      { product_id: "product-a", on_hand_milli: 9_000, reserved_milli: 0, damaged_milli: 0, is_current: false },
      { product_id: "product-b", on_hand_milli: Number.MAX_SAFE_INTEGER + 1, reserved_milli: 0, damaged_milli: 0, is_current: true },
    ]);
    expect(result.products.every((product) => product.stock_quantity === 0)).toBe(true);
    expect(result.products.every((product) => !product.inventory_available)).toBe(true);
  });

  it("deducts reserved and damaged quantities from the stock shown to cashiers", () => {
    const result = mapHostedPosCatalogue(products, categories, [
      { product_id: "product-a", on_hand_milli: 4000, reserved_milli: 1250,
        damaged_milli: 500, is_current: true },
    ]);
    expect(result.products[0].stock_quantity).toBe(2.25);
  });

  it("fails closed when reservation or damage balances are unknown", () => {
    const result = mapHostedPosCatalogue(products, categories, [
      { product_id: "product-a", on_hand_milli: 4000, reserved_milli: null,
        damaged_milli: 0, is_current: true },
    ]);
    expect(result.products[0].inventory_available).toBe(false);
    expect(result.products[0].stock_quantity).toBe(0);
  });

  it("does not invent a price and preserves inactive status", () => {
    const result = mapHostedPosCatalogue(products, categories, []);
    expect(result.products[1]).toMatchObject({ selling_price: null, is_active: false });
  });

  it("reflects changed effective inventory on each mapping", () => {
    const before = mapHostedPosCatalogue(products, categories, [
      { product_id: "product-a", on_hand_milli: 1_000, reserved_milli: 0, damaged_milli: 0, is_current: true },
    ]);
    const after = mapHostedPosCatalogue(products, categories, [
      { product_id: "product-a", on_hand_milli: 4_500, reserved_milli: 0, damaged_milli: 0, is_current: true },
    ]);
    expect(before.products[0].stock_quantity).toBe(1);
    expect(after.products[0].stock_quantity).toBe(4.5);
  });
});
