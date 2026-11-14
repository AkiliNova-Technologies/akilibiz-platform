import { NextRequest, NextResponse } from "next/server";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import {
  EXPORT_BATCH_SIZE,
  EXPORT_MAX_ROWS,
  exportColumns,
  formatContactExport,
  type ExportEntity,
} from "@/lib/contact-export";

export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  const entity = request.nextUrl.searchParams.get("entity");
  if (entity !== "customers" && entity !== "suppliers") {
    return NextResponse.json({ error: "Choose customers or suppliers." }, { status: 400, headers });
  }
  const kind: ExportEntity = entity;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401, headers });
  }
  const business = await requireActiveBusiness();
  const table = kind === "customers" ? "desktop_customers" : "desktop_suppliers";

  // The authenticated Supabase client applies RLS. Never use a service-role
  // key here and never accept business_id from the browser.
  const count = await supabase.from(table)
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id);
  if (count.error || count.count == null) {
    return NextResponse.json({ error: "Could not verify contact export." }, { status: 502, headers });
  }
  if (count.count > EXPORT_MAX_ROWS) {
    return NextResponse.json(
      { error: "This directory is too large for a single export. Contact support for a larger export." },
      { status: 413, headers },
    );
  }
  const rows: Record<string, unknown>[] = [];
  const select = exportColumns(kind).join(",");
  for (let offset = 0; offset < count.count; offset += EXPORT_BATCH_SIZE) {
    const result = await supabase.from(table).select(select)
      .eq("business_id", business.id)
      .order("id", { ascending: true })
      .range(offset, offset + EXPORT_BATCH_SIZE - 1);
    if (result.error || !result.data) {
      return NextResponse.json({ error: "Could not complete this export." }, { status: 502, headers });
    }
    rows.push(...(result.data as Record<string, unknown>[]));
  }
  // Do not hand out a silently partial dataset if rows changed while fetching.
  if (rows.length !== count.count) {
    return NextResponse.json(
      { error: "Contacts changed during export. Please try again." },
      { status: 409, headers },
    );
  }
  const csv = formatContactExport(kind, rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="akilibiz-${kind}.csv"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
