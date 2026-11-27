import { describe, expect, it } from "vitest";
import { pilotCashAmount, pilotCartFingerprint, pilotQuoteItems } from "./pos-cash-pilot";

const a="11111111-1111-4111-8111-111111111111";
const b="22222222-2222-4222-8222-222222222222";

describe("cash POS pilot safeguards", () => {
  it("converts quantities into exact milli units", () => {
    expect(pilotQuoteItems([{product_id:a,quantity:1.25}]))
      .toEqual([{product_id:a,quantity_milli:1250}]);
    expect(pilotQuoteItems([{product_id:a,quantity:0}])).toBeNull();
    expect(pilotQuoteItems([{product_id:a,quantity:0.0001}])).toBeNull();
    expect(pilotQuoteItems([{product_id:a,quantity:Number.NaN}])).toBeNull();
    expect(pilotQuoteItems([{product_id:a,quantity:1},{product_id:a,quantity:2}])).toBeNull();
  });
  it("keeps the retry fingerprint stable for row ordering, but not business or quantity changes", () => {
    const items=[{product_id:a,quantity_milli:1000},{product_id:b,quantity_milli:500}];
    expect(pilotCartFingerprint("business-a",items))
      .toBe(pilotCartFingerprint("business-a",[items[1],items[0]]));
    expect(pilotCartFingerprint("business-a",items))
      .not.toBe(pilotCartFingerprint("business-b",items));
    expect(pilotCartFingerprint("business-a",items))
      .not.toBe(pilotCartFingerprint("business-a",[{...items[0],quantity_milli:2000},items[1]]));
  });
  it("accepts only whole nonnegative UGX cash amounts", () => {
    expect(pilotCashAmount("7500")).toBe(7500);
    for(const text of ["","-1","1.25","1e3","NaN","10000000000000000"]) {
      expect(pilotCashAmount(text)).toBeNull();
    }
  });
});

describe("hosted cash checkout helpers", () => {
  it("computes exact change only when cash covers the amount due", async () => {
    const { cashChangeDue } = await import("./pos-cash-pilot");
    expect(cashChangeDue(5000, 2419)).toBe(2581);
    expect(cashChangeDue(2419, 2419)).toBe(0);
    expect(cashChangeDue(2418, 2419)).toBeNull();
    expect(cashChangeDue(null, 2419)).toBeNull();
    expect(cashChangeDue(5000, null)).toBeNull();
  });
  it("never clears an uncertain or in-flight request for the next sale", async () => {
    const { canStartNextSale } = await import("./pos-cash-pilot");
    expect(canStartNextSale(null)).toBe(false);
    expect(canStartNextSale("submitting")).toBe(false);
    expect(canStartNextSale("unknown")).toBe(false);
    for (const stage of ["pending_desktop", "desktop_applied", "reconciled", "voided"] as const) {
      expect(canStartNextSale(stage)).toBe(true);
    }
  });
  it("polls only while the desktop has not finished confirming", async () => {
    const { awaitsDesktopConfirmation } = await import("./pos-cash-pilot");
    expect(awaitsDesktopConfirmation("pending_desktop")).toBe(true);
    expect(awaitsDesktopConfirmation("desktop_applied")).toBe(true);
    expect(awaitsDesktopConfirmation("reconciled")).toBe(false);
    expect(awaitsDesktopConfirmation("unknown")).toBe(false);
  });
});
