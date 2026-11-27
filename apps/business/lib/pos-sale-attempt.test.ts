import { describe, expect, it } from "vitest";
import { attemptFor, isDefinitiveRefusal, saleFingerprint } from "./pos-sale-attempt";

const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";

describe("web cash sale attempts", () => {
  it("fingerprints the same sale identically regardless of item order", () => {
    expect(saleFingerprint("biz", [{ product_id: b, quantity_milli: 1000 }, { product_id: a, quantity_milli: 2000 }], 5000))
      .toBe(saleFingerprint("biz", [{ product_id: a, quantity_milli: 2000 }, { product_id: b, quantity_milli: 1000 }], 5000));
    expect(saleFingerprint("biz", [{ product_id: a, quantity_milli: 1000 }], 5000))
      .not.toBe(saleFingerprint("biz", [{ product_id: a, quantity_milli: 1000 }], 6000));
  });
  it("reuses the request ID only for the same sale", () => {
    const saved = { fingerprint: "F", key: "kept" };
    expect(attemptFor(saved, "F", () => "new")).toEqual({ fingerprint: "F", key: "kept" });
    expect(attemptFor(saved, "G", () => "new")).toEqual({ fingerprint: "G", key: "new" });
    expect(attemptFor(null, "F", () => "new")).toEqual({ fingerprint: "F", key: "new" });
    expect(attemptFor({ fingerprint: "F" }, "F", () => "new")).toEqual({ fingerprint: "F", key: "new" });
  });
  it("treats only refusals that cannot have posted as definitive", () => {
    for (const status of [400, 401, 403, 423]) expect(isDefinitiveRefusal(status, undefined)).toBe(true);
    expect(isDefinitiveRefusal(503, "SYNC_UNAVAILABLE")).toBe(true);
    expect(isDefinitiveRefusal(503, "SERVICE_UNAVAILABLE")).toBe(false);
    expect(isDefinitiveRefusal(409, "CONFLICT")).toBe(false);
    expect(isDefinitiveRefusal(500, undefined)).toBe(false);
  });
});
