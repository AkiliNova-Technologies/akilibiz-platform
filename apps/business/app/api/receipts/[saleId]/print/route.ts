import { NextRequest } from "next/server";
import { apiCompatJson } from "@/lib/api-response";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";

const headers = { "Cache-Control": "private, no-store" };

/** Record that the receipt was printed from the web (desktop: record_sale_print_audit). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = await params;
  const body = (await request.json().catch(() => null)) as { source?: unknown } | null;
  if (!/^[1-9][0-9]{0,17}$/.test(saleId) || typeof body?.source !== "string" || !body.source) {
    return apiCompatJson({ error: "Invalid receipt print." }, { status: 400, headers });
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return apiCompatJson({ error: "Sign in required." }, { status: 401, headers });
  const business = await requireActiveBusiness();
  const { error } = await supabase.rpc("record_web_receipt_print", {
    target_business_id: business.id,
    source_business_public_id: body.source,
    target_sale_id: Number(saleId),
  });
  if (error) {
    return apiCompatJson({ error: "Print acknowledgement could not be recorded." },
      { status: error.code === "42501" ? 403 : error.code === "23503" ? 404 : 502, headers });
  }
  return apiCompatJson({ recorded: true }, { headers });
}
