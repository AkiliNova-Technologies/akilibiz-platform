import { NextResponse } from "next/server";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { mapHostedStockReport } from "@/lib/hosted-inventory-report";

const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({error:"Authentication required."},{status:401,headers});
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
    return NextResponse.json({error:"Synchronized stock positions could not be loaded."},{status:502,headers});
  }
  try {
    const {rows,skipped}=mapHostedStockReport(
      products.data??[],categories.data??[],inventory.data??[]
    );
    return NextResponse.json({rows,skipped,readOnly:true},{headers});
  } catch {
    return NextResponse.json({error:"Some stock positions are incomplete and cannot be reported reliably."},{status:422,headers});
  }
}
