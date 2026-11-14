import { NextRequest, NextResponse } from "next/server";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import {
  CATALOGUE_EXPORT_BATCH,
  CATALOGUE_EXPORT_LIMIT,
  catalogueExportColumns,
  catalogueExportCsv,
  type CatalogueExportEntity,
} from "@/lib/catalogue-export";

const headers = { "Cache-Control": "private, no-store" };
const fail = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers });

export async function GET(request: NextRequest) {
  const entity = request.nextUrl.searchParams.get("entity");
  if (entity !== "products" && entity !== "categories") {
    return fail("Choose products or categories.", 400);
  }
  const kind: CatalogueExportEntity = entity;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return fail("Sign in required.", 401);
  const business = await requireActiveBusiness();
  const table = kind === "products" ? "desktop_products" : "desktop_categories";

  const counted = await supabase.from(table).select("id", { count: "exact", head: true })
    .eq("business_id", business.id);
  if (counted.error || counted.count === null) {
    return fail("Could not verify catalogue export.", 502);
  }
  if (counted.count > CATALOGUE_EXPORT_LIMIT) {
    return fail("This catalogue is too large to export in one file. Please contact support.", 413);
  }
  const fields = catalogueExportColumns(kind).join(",");
  const rows: Record<string, unknown>[] = [];
  for (let offset = 0; offset < counted.count; offset += CATALOGUE_EXPORT_BATCH) {
    const result = await supabase.from(table).select(fields)
      .eq("business_id", business.id)
      .order("id", { ascending: true })
      .range(offset, offset + CATALOGUE_EXPORT_BATCH - 1);
    if (result.error) return fail("Could not complete catalogue export.", 502);
    const batch: unknown = result.data;
    if (!Array.isArray(batch) || batch.some(row =>
      row === null || typeof row !== "object" || Array.isArray(row))) {
      return fail("Could not validate exported catalogue records.", 502);
    }
    rows.push(...(batch as Record<string, unknown>[]));
  }
  if (rows.length !== counted.count) {
    return fail("Catalogue records changed during the export. Please retry.", 409);
  }
  const csv = catalogueExportCsv(kind, rows);
  return new NextResponse(csv, {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="akilibiz-${kind}.csv"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
