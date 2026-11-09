import { NextRequest, NextResponse } from "next/server";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { canReadFinancialMirrors, financialMirrorPagination, FINANCIAL_MIRROR_ENTITIES } from "@/lib/financial-mirror-policy";

export async function GET(request: NextRequest) {
  const business = await requireActiveBusiness();
  if (!canReadFinancialMirrors(business.role)) {
    return NextResponse.json({ error: "Financial mirrors are restricted to the business owner." }, { status: 403 });
  }
  const entity = request.nextUrl.searchParams.get("entity") ?? "";
  if (!FINANCIAL_MIRROR_ENTITIES.has(entity)) {
    return NextResponse.json({ error: "Unsupported financial mirror." }, { status: 400 });
  }
  const { page, pageSize, from } = financialMirrorPagination(request.nextUrl.searchParams.get("page"), request.nextUrl.searchParams.get("pageSize"));
  const supabase = await createClient();
  const { data, error, count } = await supabase
    .from("desktop_business_records")
    .select("local_record_id,record,captured_at", { count: "exact" })
    .eq("business_id", business.id)
    .eq("entity_type", entity)
    .order("local_record_id", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error) {
    return NextResponse.json({ error: "The synchronized financial mirror could not be loaded." }, { status: 502 });
  }
  const rows = (data ?? []).map((row) => ({ localRecordId: row.local_record_id, capturedAt: row.captured_at, record: row.record }));
  const lastSuccessfulSync = rows.reduce<string | null>((latest, row) => !latest || row.capturedAt > latest ? row.capturedAt : latest, null);
  const syncTime = lastSuccessfulSync ? new Date(lastSuccessfulSync).getTime() : Number.NaN;
  const isStale = lastSuccessfulSync !== null && (Number.isNaN(syncTime) || Date.now() - syncTime > 24 * 60 * 60 * 1000);
  return NextResponse.json({ entity, rows, page, pageSize, total: count ?? 0, lastSuccessfulSync, isStale, readOnly: true });
}
