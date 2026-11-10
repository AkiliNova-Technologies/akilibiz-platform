import { mirrorValue } from "./financial-mirror-client";

/** Mirror records are untrusted snapshots: absence is not zero or a payment state. */
export function requiredAmount(record: Record<string, unknown>, ...fields: string[]): number {
  const raw = mirrorValue(record, ...fields);
  if (raw === null || raw === undefined || raw === "" || typeof raw === "boolean") {
    throw new Error(`Missing amount: ${fields.join("/")}`);
  }
  if (typeof raw !== "number" && typeof raw !== "string") {
    throw new Error(`Invalid amount: ${fields.join("/")}`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Invalid amount: ${fields.join("/")}`);
  }
  return value;
}

export function requiredEnum<T extends string>(
  record: Record<string, unknown>,
  field: string,
  values: readonly T[],
): T {
  const raw = mirrorValue(record, field);
  if (typeof raw !== "string" || !values.includes(raw as T)) {
    throw new Error(`Missing or invalid ${field}`);
  }
  return raw as T;
}

export function requiredId(record: Record<string, unknown>, field: string): number {
  const value = requiredAmount(record, field);
  if (value <= 0) throw new Error(`Invalid ${field}`);
  return value;
}
