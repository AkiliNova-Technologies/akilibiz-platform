import { apiError,apiSuccess } from "@/lib/api-response";
import { requireActiveBusiness } from "@/lib/business-context";
import { mapHostedPosCatalogue } from "../../../../lib/pos-catalogue";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return apiError("UNAUTHORIZED","Authentication required.",401);
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
    return apiError("SYNC_UNAVAILABLE","The synchronized catalogue could not be loaded.",503);
  }

  return apiSuccess({
    business_id: business.id,
    ...mapHostedPosCatalogue(
      productResult.data ?? [],
      categoryResult.data ?? [],
      inventoryResult.data ?? [],
    ),
  });
}
