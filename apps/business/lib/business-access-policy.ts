export const ASSIGNABLE_BUSINESS_ROLES = [
  "manager", "cashier", "inventory_staff", "accountant",
] as const;

export type AssignableBusinessRole = typeof ASSIGNABLE_BUSINESS_ROLES[number];

/** Only the current owner may administer business memberships. */
export function canManageStaff(role: string): boolean {
  return role === "owner";
}

/** Owner access must never be created through staff assignment. */
export function isAssignableBusinessRole(role: string): role is AssignableBusinessRole {
  return ASSIGNABLE_BUSINESS_ROLES.some((allowed) => allowed === role);
}

/** A selection is valid only if it is in the server-fetched membership list. */
export function isAccessibleBusinessSelection(
  memberships: ReadonlyArray<{ id: string }>,
  selectedId: string,
): boolean {
  return memberships.some((business) => business.id === selectedId);
}
