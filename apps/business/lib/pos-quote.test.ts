import { describe, expect, it } from "vitest";
import { calculateReadOnlyQuote, parseQuoteItems } from "./pos-quote";

const id = "11111111-1111-4111-8111-111111111111";
const products = [{ id, name: "Flour", selling_price_ugx: 4500, is_active: true }];
const stock = [{ product_id: id, on_hand_milli: 7500, reserved_milli: 1000, damaged_milli: 500, is_current: true }];
const items = [{ product_id: id, quantity_milli: 2500 }];

describe("POS hosted checkout preflight", () => {
  it("rejects malformed, duplicate and unbounded requests", () => {
    expect(parseQuoteItems({ items })).toEqual(items);
    expect(parseQuoteItems({ items: [...items, ...items] })).toBeNull();
    expect(parseQuoteItems({ items: [{ ...items[0], quantity_milli: 0 }] })).toBeNull();
    expect(parseQuoteItems({ items: [{ ...items[0], quantity_milli: 1.5 }] })).toBeNull();
    expect(parseQuoteItems({ items: [{ ...items[0], quantity_milli: 1, price: 1 }] })).toBeNull();
    expect(parseQuoteItems({ items: [], business_id: "other" })).toBeNull();
    expect(parseQuoteItems({ items: [] })).toBeNull();
  });

  it("quotes exact milliquantities using authoritative prices and stock", () => {
    expect(calculateReadOnlyQuote(items, products, stock)).toMatchObject({
      ok: true, subtotal_ugx: 11250, read_only: true, checkout_enabled: false,
      lines: [{ unit_price_ugx: 4500, quantity_milli: 2500, available_milli: 6000 }],
    });
  });

  it("excludes reserved and damaged stock from the available quantity", () => {
    expect(calculateReadOnlyQuote([{ ...items[0], quantity_milli: 6500 }], products, stock))
      .toMatchObject({ ok: false, reason: "INSUFFICIENT_STOCK" });
  });

  it("fails closed if effective inventory fields are unknown", () => {
    expect(calculateReadOnlyQuote(items, products, [{ ...stock[0], reserved_milli: null }]))
      .toMatchObject({ ok: false, reason: "INVENTORY_UNAVAILABLE" });
    expect(calculateReadOnlyQuote(items, products, []))
      .toMatchObject({ ok: false, reason: "INVENTORY_UNAVAILABLE" });
  });

  it("rejects inactive, missing-price and missing products", () => {
    expect(calculateReadOnlyQuote(items, [{ ...products[0], is_active: false }], stock))
      .toMatchObject({ ok: false, reason: "PRODUCT_UNAVAILABLE" });
    expect(calculateReadOnlyQuote(items, [{ ...products[0], selling_price_ugx: null }], stock))
      .toMatchObject({ ok: false, reason: "PRICE_UNAVAILABLE" });
    expect(calculateReadOnlyQuote(items, [], stock))
      .toMatchObject({ ok: false, reason: "PRODUCT_UNAVAILABLE" });
  });

  it("rounds fractional UGX at line level using integers", () => {
    expect(calculateReadOnlyQuote(
      [{ ...items[0], quantity_milli: 333 }],
      [{ ...products[0], selling_price_ugx: 1001 }],
      stock,
    )).toMatchObject({ ok: true, subtotal_ugx: 333 });
  });

  it("rejects unsafe combined totals", () => {
    expect(calculateReadOnlyQuote(
      [{ ...items[0], quantity_milli: 1_000_000_000 }],
      [{ ...products[0], selling_price_ugx: Number.MAX_SAFE_INTEGER }],
      [{ ...stock[0], on_hand_milli: 2_000_000_000, reserved_milli: 0, damaged_milli: 0 }],
    )).toMatchObject({ ok: false, reason: "AMOUNT_TOO_LARGE" });
  });
});
