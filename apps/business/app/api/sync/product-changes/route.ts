import { NextRequest } from "next/server";
import { apiCompatJson } from "@/lib/api-response";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "private, no-store" };
const reply = (value: unknown, status: number) => apiCompatJson(value, { status, headers });
const v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Ask the paired desktop to edit or deactivate a product. Desktop staff review
 * the request; an approved change runs through the desktop's own product update.
 * The database re-reads the synced product, so a change made on the desktop
 * since this request is refused there rather than overwritten.
 */
export async function POST(request: NextRequest) {
  if (process.env.AKILIBIZ_ENABLE_PRODUCT_CHANGE_REQUESTS !== "1")
    return reply({ error: "Product changes from the web are not enabled yet." }, 503);
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return reply({ error: "Sign in required." }, 401);
  const business = await requireActiveBusiness();
  if (business.role !== "owner") return reply({ error: "Only the business owner can change products from the web." }, 403);
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const operation = body?.operation;
  if (!body || (operation !== "update" && operation !== "deactivate") ||
      typeof body.requestId !== "string" || !v4.test(body.requestId) ||
      typeof body.source !== "string" || !body.source ||
      typeof body.productId !== "number" || !Number.isSafeInteger(body.productId) || body.productId <= 0 ||
      (operation === "update" && (!body.changes || typeof body.changes !== "object" || Array.isArray(body.changes))))
    return reply({ error: "Invalid product change." }, 400);
  const common = { target_business_id: business.id, request_id: body.requestId,
    source_business_public_id: body.source, product_id: body.productId };
  const { data, error } = operation === "update"
    ? await supabase.rpc("request_desktop_product_update", { ...common, changes: body.changes })
    : await supabase.rpc("request_desktop_product_deactivation", common);
  if (error) {
    const status = error.code === "55000" ? 503 : error.code === "42501" ? 403 :
      error.code === "23503" || error.code === "23505" ? 409 : error.code === "22023" ? 400 : 502;
    return reply({ error:
      status === 503 ? "Product changes are not enabled for this business yet." :
      status === 403 ? "The paired desktop is unavailable to this owner." :
      error.code === "23503" ? "This product is not available for this change. Refresh the catalogue." :
      status === 409 ? "This request was already sent with different details." :
      status === 400 ? "Review the product details and try again." :
      "Could not send the change to the desktop." }, status);
  }
  if (typeof data !== "string" || !v4.test(data)) return reply({ error: "The request could not be confirmed." }, 503);
  return reply({ commandId: data, state: "pending" }, 202);
}
