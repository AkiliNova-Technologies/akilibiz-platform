import { apiCompatJson } from "@/lib/api-response";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { desktopProductRow, type HostedCatalogueProduct } from "@/lib/desktop-product-row";

const headers = { "Cache-Control": "private, no-store" };
const PAGE = 1000;
const LIMIT = 5000; // the desktop's catalogue upload limit

/** The synced desktop catalogue, shaped like the desktop Products screen's rows. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return apiCompatJson({ error: "Sign in required." }, { status: 401, headers });
  const business = await requireActiveBusiness();
  const categories = await supabase.from("desktop_categories")
    .select("id,name,local_category_id,is_active").eq("business_id", business.id)
    .order("local_category_id").range(0, 1999);
  if (categories.error) return apiCompatJson({ error: "Could not load categories." }, { status: 502, headers });
  const products: HostedCatalogueProduct[] = [];
  for (let from = 0; from < LIMIT; from += PAGE) {
    const page = await supabase.from("desktop_products")
      .select("id,local_product_id,category_id,name,sku,barcode,description,brand,stock_unit,sales_unit,selling_price_ugx,cost_price_ugx,allow_decimal_quantity,tax_inclusive,is_active,updated_at,details")
      .eq("business_id", business.id).order("local_product_id").range(from, from + PAGE - 1);
    if (page.error) return apiCompatJson({ error: "Could not load products." }, { status: 502, headers });
    products.push(...(page.data as HostedCatalogueProduct[]));
    if (page.data.length < PAGE) break;
  }
  const stock = await supabase.rpc("list_desktop_effective_inventory", { target_business_id: business.id });
  const onHand = new Map<string, number>();
  for (const row of (stock.error ? [] : stock.data ?? []) as Array<{ product_id: string; on_hand_milli: number | null; is_current: boolean }>) {
    if (row.is_current && Number.isSafeInteger(row.on_hand_milli)) onHand.set(row.product_id, row.on_hand_milli as number);
  }
  const categoryById = new Map((categories.data ?? []).map((c) => [c.id as string, c]));
  return apiCompatJson({
    role: business.role,
    stockAvailable: !stock.error,
    categories: (categories.data ?? []).map((c) => ({ id: c.local_category_id, hosted_id: c.id, name: c.name, is_active: c.is_active })),
    products: products.map((p) => desktopProductRow(p, categoryById.get(p.category_id) ?? null, onHand.get(p.id) ?? null)),
  }, { headers });
}
