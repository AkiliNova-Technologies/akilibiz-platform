import { NextResponse } from "next/server";
import { requireActiveBusiness } from "@/lib/business-context";
import { mapHostedPosCatalogue } from "../../../../lib/pos-catalogue";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  const business = await requireActiveBusiness();
  const [categoryResult, productResult, inventoryResult] = await Promise.all([
    supabase
      .from("desktop_categories")
      .select("id,name,is_active")
      .eq("business_id", business.id)
      .order("name"),
    supabase
      .from("desktop_products")
      .select("id,name,sku,category_id,selling_price_ugx,stock_unit,is_active")
      .eq("business_id", business.id)
      .order("name"),
    supabase.rpc(
      process.env.AKILIBIZ_WEB_POS_HOLDS_AWARE === "1"
        ? "list_web_pos_sellable_inventory"
        : "list_desktop_effective_inventory", {
      target_business_id: business.id,
    }),
  ]);

  if (categoryResult.error || productResult.error || inventoryResult.error) {
    return NextResponse.json(
      { error: "The synchronized catalogue could not be loaded." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  return NextResponse.json(
    {
      business_id: business.id,
      ...mapHostedPosCatalogue(
        productResult.data ?? [],
        categoryResult.data ?? [],
        inventoryResult.data ?? [],
      ),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
