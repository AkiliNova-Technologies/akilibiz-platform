/**
 * Read-only checkout preflight. Prices and stock are supplied by the server,
 * never trusted from the browser cart. This is NOT a sale commitment or stock lock.
 */
export type QuoteItem = { product_id: string; quantity_milli: number };
export type QuoteProduct = {
  id: string;
  name: string;
  selling_price_ugx: number | null;
  is_active: boolean;
};
export type QuoteStock = {
  product_id: string;
  on_hand_milli: number | null;
  reserved_milli: number | null;
  damaged_milli: number | null;
  is_current: boolean;
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseQuoteItems(input: unknown): QuoteItem[] | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const obj = input as Record<string, unknown>;
  if (Object.keys(obj).length !== 1 || !Array.isArray(obj.items) ||
      obj.items.length === 0 || obj.items.length > 100) return null;
  const seen = new Set<string>();
  const result: QuoteItem[] = [];
  for (const item of obj.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const data = item as Record<string, unknown>;
    if (Object.keys(data).length !== 2 ||
        typeof data.product_id !== "string" || !uuid.test(data.product_id) ||
        !Number.isSafeInteger(data.quantity_milli) ||
        (data.quantity_milli as number) < 1 ||
        (data.quantity_milli as number) > 1_000_000_000 ||
        seen.has(data.product_id)) return null;
    seen.add(data.product_id);
    result.push({ product_id: data.product_id, quantity_milli: data.quantity_milli as number });
  }
  return result;
}

export function calculateReadOnlyQuote(items: QuoteItem[], products: QuoteProduct[], stock: QuoteStock[]) {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const stockMap = new Map(stock.filter((row) => row.is_current).map((row) => [row.product_id, row]));
  const lines = [];
  let subtotal = 0n;
  for (const item of items) {
    const product = productMap.get(item.product_id);
    const position = stockMap.get(item.product_id);
    if (!product?.is_active) return { ok: false as const, reason: "PRODUCT_UNAVAILABLE" };
    if (product.selling_price_ugx === null ||
        !Number.isSafeInteger(product.selling_price_ugx) ||
        product.selling_price_ugx < 0) return { ok: false as const, reason: "PRICE_UNAVAILABLE" };
    if (!position || !Number.isSafeInteger(position.on_hand_milli) ||
        !Number.isSafeInteger(position.reserved_milli) ||
        !Number.isSafeInteger(position.damaged_milli)) {
      return { ok: false as const, reason: "INVENTORY_UNAVAILABLE" };
    }
    const available = BigInt(position.on_hand_milli!) -
      BigInt(position.reserved_milli!) - BigInt(position.damaged_milli!);
    if (available < BigInt(item.quantity_milli)) {
      return { ok: false as const, reason: "INSUFFICIENT_STOCK" };
    }
    const lineTotal = (BigInt(product.selling_price_ugx) * BigInt(item.quantity_milli) + 500n) / 1000n;
    subtotal += lineTotal;
    if (subtotal > BigInt(Number.MAX_SAFE_INTEGER)) {
      return { ok: false as const, reason: "AMOUNT_TOO_LARGE" };
    }
    lines.push({
      product_id: product.id,
      name: product.name,
      quantity_milli: item.quantity_milli,
      unit_price_ugx: product.selling_price_ugx,
      line_total_ugx: Number(lineTotal),
      available_milli: Number(available),
    });
  }
  return {
    ok: true as const,
    lines,
    subtotal_ugx: Number(subtotal),
    currency: "UGX" as const,
    read_only: true as const,
    checkout_enabled: false as const,
  };
}
