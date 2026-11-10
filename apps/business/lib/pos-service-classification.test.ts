import { describe, expect, it } from "vitest";
import { normalizePosServiceProducts } from "./pos-service-classification";

const categories = [
  { id: "services", name: "Services & Fees" },
  { id: "goods", name: "Hardware & Tools" },
];

describe("POS service eligibility", () => {
  it("treats every verified Services & Fees item as non-stock even if the incoming flag is stale", () => {
    const result = normalizePosServiceProducts([
      { category_id: "services", is_service: false, inventory_available: false, selling_price: 300 },
      { category_id: "services", is_service: false, inventory_available: false, selling_price: 10000 },
    ], categories);
    expect(result).toEqual([
      { category_id: "services", is_service: true, inventory_available: true, selling_price: 300 },
      { category_id: "services", is_service: true, inventory_available: true, selling_price: 10000 },
    ]);
  });

  it("never promotes a physical item to a service or invents missing stock", () => {
    const result = normalizePosServiceProducts([
      { category_id: "goods", is_service: true, inventory_available: false, selling_price: 5000 },
      { category_id: null, is_service: true, inventory_available: false, selling_price: null },
    ], categories);
    expect(result.every((item) => item.is_service === false && item.inventory_available === false)).toBe(true);
    expect(result[1].selling_price).toBeNull();
  });

  it("does not change correctly classified stock-tracked and service products", () => {
    const products = [
      { category_id: "services", is_service: true, inventory_available: true },
      { category_id: "goods", is_service: false, inventory_available: true },
    ];
    expect(normalizePosServiceProducts(products, categories)).toEqual(products);
  });
});
