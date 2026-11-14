export type ContactEntity = "customer" | "supplier";

const fieldLimits = {
  customer: { name: 200, email: 320, phone: 40, address: 1000 },
  supplier: { name: 200, contact_person: 200, phone: 40, email: 320, address: 1000, payment_terms: 200 },
} as const;

const requiredFields: Record<ContactEntity, readonly string[]> = {
  customer: ["name"],
  supplier: ["name", "contact_person", "phone", "payment_terms"],
};

export function validateContactChanges(
  entity: ContactEntity,
  changes: Record<string, unknown>,
): string | null {
  const limits: Record<string, number> = fieldLimits[entity];
  const fields = Object.entries(changes);
  if (!fields.length) return "Choose at least one contact field to update.";
  for (const [key, value] of fields) {
    if (!(key in limits)) return "Unsupported contact field.";
    if (value !== null && typeof value !== "string") return "Invalid contact value.";
    if (value !== null && (value.length > limits[key] || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))) {
      return "Contact details contain invalid or overly long text.";
    }
    if (requiredFields[entity].includes(key) && (value === null || !value.trim())) {
      return "Required contact details cannot be blank.";
    }
    if (key === "email" && typeof value === "string" && value.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      return "Enter a valid email address.";
    }
  }
  return null;
}
