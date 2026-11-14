import { describe, expect, it } from "vitest";
import { validateContactChanges } from "./contact-update-validation";

function validateCreation(entity: "customer" | "supplier", fields: Record<string, unknown>) {
  const required = entity === "customer"
    ? ["name"] : ["name", "contact_person", "phone", "payment_terms"];
  if (required.some(key=>typeof fields[key]!=="string"||!(fields[key] as string).trim())) {
    return "Complete all required contact fields.";
  }
  return validateContactChanges(entity,fields);
}

describe("pilot contact creation payloads", () => {
  it("requires a name for customer creation", () => {
    expect(validateCreation("customer",{name:""})).not.toBeNull();
    expect(validateCreation("customer",{name:"Kampala Retailer"})).toBeNull();
  });
  it("requires supplier person, phone and payment terms", () => {
    expect(validateCreation("supplier",{name:"Supplier"})).not.toBeNull();
    expect(validateCreation("supplier",{
      name:"Supplier",contact_person:"Agent",phone:"0700000000",payment_terms:"Immediate",
    })).toBeNull();
  });
  it("rejects assignment of balances or a foreign business identity", () => {
    expect(validateCreation("customer",{name:"User",business_id:"another-business"})).not.toBeNull();
    expect(validateCreation("supplier",{
      name:"Supplier",contact_person:"Agent",phone:"0700000000",
      payment_terms:"Immediate",outstanding_balance:120000,
    })).not.toBeNull();
  });
});
