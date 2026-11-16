import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { calculateReadOnlyQuote, parseQuoteItems } from "@/lib/pos-quote";
import { isHostedServiceCategory } from "@/lib/pos-catalogue";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return apiError("UNAUTHORIZED", "Authentication required.", 401);

  const body = await request.json().catch(() => null);
  const items = parseQuoteItems(body);
  if (!items)
    return apiError(
      "VALIDATION_FAILED",
      "Invalid cart quantities or product identities.",
      400,
    );
  const business = await requireActiveBusiness();

  // Verify prices against hosted catalogue, stock against the effective
  // desktop replay model, and never use client-submitted pricing or totals.
  const [products, categories, stock] = await Promise.all([
    supabase
      .from("desktop_products")
      .select("id,name,category_id,selling_price_ugx,is_active")
      .eq("business_id", business.id)
      .in(
        "id",
        items.map((item) => item.product_id),
      ),
    supabase
      .from("desktop_categories")
      .select("id,name")
      .eq("business_id", business.id),
    supabase.rpc(
      process.env.AKILIBIZ_WEB_POS_HOLDS_AWARE === "1"
        ? "list_web_pos_sellable_inventory"
        : "list_desktop_effective_inventory",
      {
        target_business_id: business.id,
      },
    ),
  ]);
  if (products.error || categories.error || stock.error) {
    return apiError(
      "SERVICE_UNAVAILABLE",
      "Current products and stock could not be verified.",
      503,
    );
  }
  const serviceCategories = new Set(
    (categories.data ?? [])
      .filter((category) => isHostedServiceCategory(category.name))
      .map((category) => category.id),
  );
  const quoteProducts = (products.data ?? []).map((product) => ({
    ...product,
    is_service:
      product.category_id !== null &&
      serviceCategories.has(product.category_id),
  }));
  const quote = calculateReadOnlyQuote(items, quoteProducts, stock.data ?? []);
  if (!quote.ok)
    return apiError(
      "CONFLICT",
      "The cart requires review before a sale can be processed.",
      409,
      { reason: quote.reason },
    );
  return apiSuccess({
    business_id: business.id,
    ...quote,
    message:
      "Stock and prices checked. No sale, payment or stock movement was posted.",
  });
}
