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
  // VAT and the amount due come from the same database pricing that posts the
  // sale (desktop-published tax profile, invoice-level rounding), so the total
  // a cashier collects always equals the posted total.
  const priced = await supabase.rpc("quote_web_pos_cash_sale", {
    target_business_id: business.id,
    sale_items: items,
  });
  if (priced.error) {
    const reason =
      priced.error.code === "55000"
        ? "TAX_PROFILE_UNAVAILABLE"
        : priced.error.code === "22023"
          ? "LINE_NOT_WHOLE_UGX"
          : priced.error.code === "23514"
            ? "CART_CHANGED"
            : null;
    if (!reason)
      return apiError(
        "SERVICE_UNAVAILABLE",
        "The sale total could not be calculated.",
        503,
      );
    return apiError(
      "CONFLICT",
      "The cart requires review before a sale can be processed.",
      409,
      { reason },
    );
  }
  const totals = priced.data as {
    subtotal_ugx: number;
    tax_ugx: number;
    total_ugx: number;
  };
  return apiSuccess({
    business_id: business.id,
    ...quote,
    subtotal_ugx: totals.subtotal_ugx,
    tax_ugx: totals.tax_ugx,
    total_ugx: totals.total_ugx,
    message:
      "Stock, prices and VAT checked. No sale, payment or stock movement was posted.",
  });
}
