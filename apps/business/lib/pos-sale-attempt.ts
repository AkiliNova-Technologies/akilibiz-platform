/**
 * Safety rules for submitting a web cash sale, shared by the POS checkout.
 * A request ID is reused for the same sale until its outcome is known, so a
 * lost response can never record the payment twice.
 */
export type SaleAttempt = { fingerprint: string; key: string };

export function saleFingerprint(
  businessId: string,
  items: ReadonlyArray<{ product_id: string; quantity_milli: number }>,
  cashReceived: number,
): string {
  return JSON.stringify([businessId, [...items].sort((a, b) => a.product_id.localeCompare(b.product_id)), cashReceived]);
}

/** Reuse the saved request ID for the same sale; any other sale gets a new one. */
export function attemptFor(saved: unknown, fingerprint: string, newKey: () => string): SaleAttempt {
  const candidate = saved as Partial<SaleAttempt> | null;
  return candidate && candidate.fingerprint === fingerprint && typeof candidate.key === "string"
    ? { fingerprint, key: candidate.key }
    : { fingerprint, key: newKey() };
}

/**
 * Refusals that prove nothing was posted: invalid request, not signed in, not
 * allowed, posting gate closed (423), or web sales disabled (503 before any
 * database call). Anything else is uncertain and keeps the request ID.
 */
export function isDefinitiveRefusal(status: number, code: string | undefined): boolean {
  return [400, 401, 403, 423].includes(status) || (status === 503 && code === "SYNC_UNAVAILABLE");
}
