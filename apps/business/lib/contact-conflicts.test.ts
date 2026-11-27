import { describe, expect, it } from "vitest";
import { contactConflictFields, needsDecision } from "./contact-conflicts";

describe("contact conflict fields", () => {
  it("lists only requested fields in a stable order with desktop values", () => {
    expect(contactConflictFields(
      { phone: "+256700000002", contact_person: "Web Person" },
      { name: "Mill", contact_person: "Desk Person", phone: "+256700000002", email: null },
    )).toEqual([
      { field: "contact_person", label: "Contact person", mine: "Web Person", desktop: "Desk Person", differs: true },
      { field: "phone", label: "Phone", mine: "+256700000002", desktop: "+256700000002", differs: false },
    ]);
  });
  it("treats a removed contact as having no desktop values and ignores unknown fields", () => {
    expect(contactConflictFields({ email: null, credit_limit: "9" }, null)).toEqual([
      { field: "email", label: "Email", mine: null, desktop: null, differs: false },
    ]);
    expect(contactConflictFields(null, {})).toEqual([]);
  });
  it("asks for a decision only on unresolved conflicts", () => {
    expect(needsDecision({ state: "conflict", resolution: null })).toBe(true);
    expect(needsDecision({ state: "conflict", resolution: "kept_desktop" })).toBe(false);
    expect(needsDecision({ state: "pending", resolution: null })).toBe(false);
  });
});

describe("contact change recovery", () => {
  it("asks for a decision on expired changes and allows a single resend", async () => {
    const { needsDecision, canResend } = await import("./contact-conflicts");
    expect(needsDecision({ state: "expired", resolution: null })).toBe(true);
    expect(canResend({ state: "expired", resentCommandId: null, withdrawnReason: null })).toBe(true);
    expect(canResend({ state: "withdrawn", resentCommandId: null, withdrawnReason: "owner" })).toBe(true);
    expect(canResend({ state: "withdrawn", resentCommandId: "x", withdrawnReason: "expired_resent" })).toBe(false);
    expect(canResend({ state: "withdrawn", resentCommandId: null, withdrawnReason: "already_current" })).toBe(false);
    expect(canResend({ state: "pending", resentCommandId: null, withdrawnReason: null })).toBe(false);
  });
});
