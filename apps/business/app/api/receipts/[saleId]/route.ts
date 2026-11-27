import { NextRequest } from "next/server";
import { apiCompatJson } from "@/lib/api-response";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "private, no-store" };

/**
 * The desktop's canonical receipt for one sale (published by the desktop as a
 * receipt_snapshots mirror record), plus the business identity and receipt
 * settings the desktop receipt layout uses. The web never re-derives a receipt.
 * Owner, manager and cashier may read it (desktop: pos.view_sales).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = await params;
  if (!/^[1-9][0-9]{0,17}$/.test(saleId)) {
    return apiCompatJson({ error: "Invalid sale." }, { status: 400, headers });
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return apiCompatJson({ error: "Sign in required." }, { status: 401, headers });
  const business = await requireActiveBusiness();
  const { data, error } = await supabase.rpc("get_web_receipt", {
    target_business_id: business.id,
    target_sale_id: Number(saleId),
  });
  if (error) {
    // Messages the desktop receipt dialog recognises.
    if (error.code === "42501") return apiCompatJson({ error: "Missing permission: pos.view_sales" }, { status: 403, headers });
    if (error.code === "P0002") return apiCompatJson({ error: "Sale not found" }, { status: 404, headers });
    if (error.code === "21000") return apiCompatJson({ error: "Receipt is ambiguous across linked desktops." }, { status: 409, headers });
    return apiCompatJson({ error: "The receipt could not be loaded." }, { status: 502, headers });
  }
  const body = data as { source: string; receipt: unknown; businessProfile: unknown; receiptSettings: unknown };
  let receipt: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = typeof body.receipt === "string" ? JSON.parse(body.receipt) : body.receipt;
    receipt = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch { receipt = null; }
  if (!receipt) return apiCompatJson({ error: "The receipt could not be loaded." }, { status: 502, headers });
  if (receipt.schema_version === "unavailable") {
    return apiCompatJson({ error: String(receipt.reason ?? "Receipt unavailable") }, { status: 422, headers });
  }
  return apiCompatJson({
    receipt,
    source: body.source,
    businessProfile: body.businessProfile,
    receiptSettings: body.receiptSettings,
  }, { headers });
}
