import { NextRequest } from "next/server";
import { apiCompatJson } from "@/lib/api-response";
import { requireActiveBusiness } from "@/lib/business-context";
import { canReadFinancialMirrors } from "@/lib/financial-mirror-policy";
import { createClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "private, no-store" };

/**
 * The desktop's canonical receipt for one sale (published by the desktop as a
 * receipt_snapshots mirror record), plus the business profile and receipt
 * settings the desktop receipt layout uses. The web never re-derives a receipt.
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
  if (!canReadFinancialMirrors(business.role)) {
    return apiCompatJson({ error: "Missing permission: pos.view_sales" }, { status: 403, headers });
  }
  const { data, error } = await supabase
    .from("desktop_business_records")
    .select("entity_type,local_business_public_id,local_record_id,record")
    .eq("business_id", business.id)
    .or(`and(entity_type.eq.receipt_snapshots,local_record_id.eq.${saleId}),entity_type.eq.business_profiles,entity_type.eq.receipt_settings`);
  if (error) return apiCompatJson({ error: "The receipt could not be loaded." }, { status: 502, headers });
  const rows = data ?? [];
  const receipts = rows.filter((row) => row.entity_type === "receipt_snapshots");
  if (receipts.length === 0) {
    return apiCompatJson({ error: "Sale not found" }, { status: 404, headers });
  }
  if (receipts.length > 1) {
    return apiCompatJson({ error: "Receipt is ambiguous across linked desktops." }, { status: 409, headers });
  }
  const source = receipts[0].local_business_public_id;
  const raw = (receipts[0].record as { receipt_json?: unknown }).receipt_json;
  let receipt: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = typeof raw === "string" ? JSON.parse(raw) : raw;
    receipt = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch { receipt = null; }
  if (!receipt) return apiCompatJson({ error: "The receipt could not be loaded." }, { status: 502, headers });
  if (receipt.schema_version === "unavailable") {
    return apiCompatJson({ error: String(receipt.reason ?? "Receipt unavailable") }, { status: 422, headers });
  }
  const sameSource = (entity: string) =>
    rows.find((row) => row.entity_type === entity && row.local_business_public_id === source)?.record ?? null;
  return apiCompatJson({
    receipt,
    source,
    businessProfile: sameSource("business_profiles"),
    receiptSettings: sameSource("receipt_settings"),
  }, { headers });
}
