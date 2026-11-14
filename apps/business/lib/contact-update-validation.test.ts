import { describe, expect, it } from "vitest";
import { validateContactChanges } from "./contact-update-validation";

describe("hosted contact edit validation", () => {
  it("accepts allowed customer and supplier details", () => {
    expect(validateContactChanges("customer", { name: "Nakawa Shop", email: null })).toBeNull();
    expect(validateContactChanges("supplier", { phone: "+256700000000", payment_terms: "30 days" })).toBeNull();
  });
  it("rejects unknown fields and unexpected types", () => {
    expect(validateContactChanges("customer", { business_id: "other" })).toBeTruthy();
    expect(validateContactChanges("customer", { loyalty_points: 99 })).toBeTruthy();
    expect(validateContactChanges("customer", { name: 22 })).toBeTruthy();
  });
  it("rejects blank required fields", () => {
    expect(validateContactChanges("customer", { name: "   " })).toBeTruthy();
    expect(validateContactChanges("supplier", { phone: null })).toBeTruthy();
  });
  it("enforces lengths, safe characters, and basic email syntax", () => {
    expect(validateContactChanges("supplier", { contact_person: "x".repeat(201) })).toBeTruthy();
    expect(validateContactChanges("customer", { phone: "x\u0000z" })).toBeTruthy();
    expect(validateContactChanges("customer", { email: "bad-at-example" })).toBeTruthy();
  });
});
