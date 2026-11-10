import { NextRequest, NextResponse } from "next/server";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { calculateReadOnlyQuote, parseQuoteItems } from "@/lib/pos-quote";

const noStore = { "Cache-Control": "private, no-store" };
const reply = (body: unknown, status: number) =>
  NextResponse.json(body, { status, headers: noStore });

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return reply({ error: "Authentication required." }, 401);

  const body = await request.json().catch(() => null);
  const items = parseQuoteItems(body);
  if (!items) return reply({ error: "Invalid cart quantities or product identities." }, 400);
  const business = await requireActiveBusiness();

  // Verify prices against hosted catalogue, stock against the effective
  // desktop replay model, and never use client-submitted pricing or totals.
  const [products, stock] = await Promise.all([
    supabase.from("desktop_products")
      .select("id,name,selling_price_ugx,is_active")
      .eq("business_id", business.id)
      .in("id", items.map((item) => item.product_id)),
    supabase.rpc(
      process.env.AKILIBIZ_WEB_POS_HOLDS_AWARE === "1"
        ? "list_web_pos_sellable_inventory"
        : "list_desktop_effective_inventory", {
      target_business_id: business.id,
    }),
  ]);
  if (products.error || stock.error) {
    return reply({ error: "Current products and stock could not be verified." }, 503);
  }
  const quote = calculateReadOnlyQuote(items, products.data ?? [], stock.data ?? []);
  if (!quote.ok) return reply({
    error: "The cart requires review before a sale can be processed.",
    reason: quote.reason,
  }, 409);
  return reply({
    business_id: business.id,
    ...quote,
    message: "Stock and prices checked. No sale, payment or stock movement was posted.",
  }, 200);
}
