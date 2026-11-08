import { describe, expect, it } from "vitest";
import {
  ASSIGNABLE_BUSINESS_ROLES,
  canManageStaff,
  isAccessibleBusinessSelection,
  isAssignableBusinessRole,
} from "./business-access-policy";

describe("business access policy", () => {
  it("only lets an owner manage staff", () => {
    expect(canManageStaff("owner")).toBe(true);
    for (const role of ["manager", "cashier", "inventory_staff", "accountant", ""]) {
      expect(canManageStaff(role)).toBe(false);
    }
  });

  it("accepts exactly the non-owner staff roles", () => {
    for (const role of ASSIGNABLE_BUSINESS_ROLES) {
      expect(isAssignableBusinessRole(role)).toBe(true);
    }
  });

  it("rejects owner, arbitrary and empty role values", () => {
    for (const role of ["owner", "super_admin", "", "OWNER"]) {
      expect(isAssignableBusinessRole(role)).toBe(false);
    }
  });

  it("accepts a selected business only when it is among accessible memberships", () => {
    const accessible = [{ id: "business-a" }, { id: "business-b" }];
    expect(isAccessibleBusinessSelection(accessible, "business-a")).toBe(true);
    expect(isAccessibleBusinessSelection(accessible, "business-b")).toBe(true);
    expect(isAccessibleBusinessSelection(accessible, "business-c")).toBe(false);
  });

  it("rejects selection when no active business membership exists", () => {
    expect(isAccessibleBusinessSelection([], "business-a")).toBe(false);
  });
});
