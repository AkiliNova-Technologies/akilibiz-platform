/** Field-by-field view of a web contact change against the current desktop values. */
export type ContactEntity = "customer" | "supplier";
export type ContactValue = string | null;
export type ContactConflictField = {
  field: string;
  label: string;
  mine: ContactValue;
  desktop: ContactValue;
  differs: boolean;
};

const LABELS: Record<string, string> = {
  name: "Name",
  contact_person: "Contact person",
  email: "Email",
  phone: "Phone",
  address: "Address",
  payment_terms: "Payment terms",
};
const ORDER = ["name", "contact_person", "email", "phone", "address", "payment_terms"];

function asValue(value: unknown): ContactValue {
  return typeof value === "string" ? value : null;
}

/** Only the fields the owner asked to change, in a stable order. */
export function contactConflictFields(
  requested: Record<string, unknown> | null | undefined,
  current: Record<string, unknown> | null | undefined,
): ContactConflictField[] {
  if (!requested) return [];
  return Object.keys(requested)
    .filter((field) => field in LABELS)
    .sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))
    .map((field) => {
      const mine = asValue(requested[field]);
      const desktop = current ? asValue(current[field]) : null;
      return { field, label: LABELS[field], mine, desktop, differs: mine !== desktop };
    });
}

export type ContactChangeRequest = {
  commandId: string;
  entity: ContactEntity;
  contactName: string;
  state: "pending" | "applied" | "conflict" | "expired" | "withdrawn";
  requestedAt: string;
  appliedAt: string | null;
  conflictReason: string | null;
  resolution: "kept_desktop" | "reapplied" | "already_current" | null;
  replacementCommandId: string | null;
  expiresAt: string | null;
  withdrawnReason: "owner" | "expired_resent" | "expired_superseded" | "already_current" | null;
  resentCommandId: string | null;
  fields: ContactConflictField[];
  contactActive: boolean;
};

/** Unresolved conflicts and expired changes need the owner's decision. */
export function needsDecision(request: Pick<ContactChangeRequest, "state" | "resolution">): boolean {
  return (request.state === "conflict" && request.resolution === null) || request.state === "expired";
}

/** A withdrawn change the owner may still resend (not yet resent or already current). */
export function canResend(
  request: Pick<ContactChangeRequest, "state" | "resentCommandId" | "withdrawnReason">,
): boolean {
  return (request.state === "expired" || request.state === "withdrawn") &&
    request.resentCommandId === null && request.withdrawnReason !== "already_current";
}
