import { describe, expect, it } from "vitest";
import { requiredAmount, requiredEnum, requiredId } from "./mirror-field-validation";

describe("financial mirror field validation", () => {
  it("preserves genuine zero balances without inventing missing amounts", () => {
    expect(requiredAmount({ value: 0 }, "value")).toBe(0);
    expect(requiredAmount({ value: "15000" }, "value")).toBe(15000);
    for (const value of [undefined, null, "", " ", "NaN", "Infinity", true, -10, 10.5, {}, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => requiredAmount({ value }, "value")).toThrow();
    }
  });
  it("requires real identifiers and supported payment statuses", () => {
    expect(requiredId({ id: 12 }, "id")).toBe(12);
    expect(() => requiredId({ id: 0 }, "id")).toThrow();
    expect(requiredEnum({ status: "Paid" }, "status", ["Pending", "Paid"] as const)).toBe("Paid");
    expect(() => requiredEnum({}, "status", ["Pending", "Paid"] as const)).toThrow();
    expect(() => requiredEnum({ status: "Unknown" }, "status", ["Pending", "Paid"] as const)).toThrow();
  });
});
