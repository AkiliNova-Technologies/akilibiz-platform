import { describe, expect, it } from "vitest";
import { canReadFinancialMirrors, financialMirrorPagination, FINANCIAL_MIRROR_ENTITIES } from "./financial-mirror-policy";

describe("financial mirror policy", () => {
  it("allows only the owner role", () => {
    expect(canReadFinancialMirrors("owner")).toBe(true);
    for (const role of ["accountant", "manager", "cashier", "inventory_staff", ""]) expect(canReadFinancialMirrors(role)).toBe(false);
  });

  it("allow-lists synchronized read-only domains", () => {
    expect(FINANCIAL_MIRROR_ENTITIES.has("finance_transactions")).toBe(true);
    expect(FINANCIAL_MIRROR_ENTITIES.has("authoritative_expenses")).toBe(true);
    expect(FINANCIAL_MIRROR_ENTITIES.has("users")).toBe(false);
  });

  it("bounds pagination and rejects invalid values", () => {
    expect(financialMirrorPagination("2", "25")).toEqual({ page: 2, pageSize: 25, from: 25 });
    expect(financialMirrorPagination("-1", "1000")).toEqual({ page: 1, pageSize: 100, from: 0 });
    expect(financialMirrorPagination("x", "x")).toEqual({ page: 1, pageSize: 50, from: 0 });
  });
});
