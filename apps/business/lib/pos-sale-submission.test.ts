import { describe, expect, it } from "vitest";
import { classifySalePostError, parseCashSaleSubmission } from "./pos-sale-submission";

const product = "11111111-1111-4111-8111-111111111111";
const key = "22222222-2222-4222-8222-222222222222";
const good = {
  idempotency_key: key,
  cash_received_ugx: 12000,
  items: [{ product_id: product, quantity_milli: 1250 }],
};

describe("staged hosted cash sale validation", () => {
  it("accepts exact milli-quantities, UGX cash and a v4 key", () => {
    expect(parseCashSaleSubmission(good)).toEqual(good);
  });
  it("rejects extra pricing, actor and business fields", () => {
    expect(parseCashSaleSubmission({ ...good, business_id: product })).toBeNull();
    expect(parseCashSaleSubmission({ ...good, unit_price_ugx: 1 })).toBeNull();
    expect(parseCashSaleSubmission({ ...good, items: [{ ...good.items[0], price: 1 }] }))
      .toBeNull();
  });
  it("rejects non-v4 idempotency keys and invalid cash values", () => {
    expect(parseCashSaleSubmission({ ...good, idempotency_key: product.slice(0, 14) + "1" + product.slice(15) })).toBeNull();
    for (const cash of [NaN, Infinity, -1, 1.2, Number.MAX_SAFE_INTEGER + 1, "12000"]) {
      expect(parseCashSaleSubmission({ ...good, cash_received_ugx: cash })).toBeNull();
    }
  });
  it("rejects duplicate products and non-integer milli-quantities", () => {
    expect(parseCashSaleSubmission({ ...good, items: [...good.items, ...good.items] })).toBeNull();
    expect(parseCashSaleSubmission({ ...good, items: [{ product_id: product, quantity_milli: .5 }] })).toBeNull();
  });
  it("classifies permission, release-gate, stock and internal errors", () => {
    expect(classifySalePostError("42501")).toBe(403);
    expect(classifySalePostError("55000")).toBe(423);
    expect(classifySalePostError("23514")).toBe(409);
    expect(classifySalePostError("23505")).toBe(409);
    expect(classifySalePostError("22023")).toBe(400);
    expect(classifySalePostError()).toBe(503);
  });
});
