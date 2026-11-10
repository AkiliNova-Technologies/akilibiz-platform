import { parseQuoteItems, type QuoteItem } from "./pos-quote";

/** Strict browser payload; business, actor, prices and tax are resolved on the server. */
export type CashSaleSubmission = {
  idempotency_key: string;
  cash_received_ugx: number;
  items: QuoteItem[];
};

const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCashSaleSubmission(value: unknown): CashSaleSubmission | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).length !== 3 ||
      !uuidV4.test(typeof input.idempotency_key === "string" ? input.idempotency_key : "") ||
      typeof input.cash_received_ugx !== "number" ||
      !Number.isSafeInteger(input.cash_received_ugx) ||
      input.cash_received_ugx < 0) return null;
  const items = parseQuoteItems({ items: input.items });
  return items ? {
    idempotency_key: input.idempotency_key as string,
    cash_received_ugx: input.cash_received_ugx,
    items,
  } : null;
}

export function classifySalePostError(code?: string): number {
  switch (code) {
    case "42501": return 403;
    case "22023": return 400;
    case "23505": case "23514": return 409;
    case "55000": return 423; // Posting gate closed, or tax policy incomplete.
    default: return 503;
  }
}
