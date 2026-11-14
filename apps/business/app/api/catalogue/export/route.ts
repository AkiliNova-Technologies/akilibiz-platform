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
  const fields = kind === "products"
    ? [...catalogueExportColumns(kind).filter(field => field !== "category_name"), "category_id"].join(",")
    : catalogueExportColumns(kind).join(",");
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
  if (kind === "products" && rows.length) {
    const ids = [...new Set(rows.map(row => row.category_id))];
    if (ids.some(id => typeof id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
      return fail("One or more product categories could not be verified.", 502);
    }
    const names = new Map<string, string>();
    for (let offset = 0; offset < ids.length; offset += 200) {
      const batch = ids.slice(offset, offset + 200) as string[];
      const result = await supabase.from("desktop_categories")
        .select("id,name")
        .eq("business_id", business.id)
        .in("id", batch);
      if (result.error || !Array.isArray(result.data)) {
        return fail("Could not verify product categories for export.", 502);
      }
      for (const category of result.data) {
        if (typeof category.id !== "string" ||
          typeof category.name !== "string" || !category.name.trim()) {
          return fail("A product category name is unavailable.", 502);
        }
        names.set(category.id, category.name);
      }
    }
    if (ids.some(id => !names.has(id as string))) {
      return fail("A product category is missing. No partial export was downloaded.", 409);
    }
    for (const row of rows) {
      row.category_name = names.get(row.category_id as string)!;
    }
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
