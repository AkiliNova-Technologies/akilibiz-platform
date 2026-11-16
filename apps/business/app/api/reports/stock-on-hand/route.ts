import {apiError,apiSuccess} from "@/lib/api-response";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { mapHostedStockReport } from "@/lib/hosted-inventory-report";

export async function GET() {
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if (authError || !user) return apiError("UNAUTHORIZED","Authentication required.",401);
  const business=await requireActiveBusiness();
  const [products,categories,inventory]=await Promise.all([
    supabase.from("desktop_products")
      .select("id,local_product_id,name,sku,stock_unit,category_id,is_active,selling_price_ugx,cost_price_ugx")
      .eq("business_id",business.id).order("local_product_id"),
    supabase.from("desktop_categories")
      .select("id,local_category_id,name").eq("business_id",business.id),
    supabase.rpc("list_desktop_effective_inventory",{target_business_id:business.id}),
  ]);
  if (products.error || categories.error || inventory.error) {
    return apiError("SYNC_UNAVAILABLE","Synchronized stock positions could not be loaded.",502);
  }
  try {
    const {rows,skipped}=mapHostedStockReport(
      products.data??[],categories.data??[],inventory.data??[]
    );
    return apiSuccess({rows,skipped,readOnly:true});
  } catch {
    return apiError("STALE_DATA","Some stock positions are incomplete and cannot be reported reliably.",422);
  }
}
