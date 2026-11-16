import { apiCompatJson } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { requireActiveBusiness } from "@/lib/business-context";
import { canReadFinancialMirrors } from "@/lib/financial-mirror-policy";

const headers = { "Cache-Control": "private, no-store" };
/** A tenant-owner-only read model. The catalogue is not itself proof of VAT classification. */
export async function GET() {
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user) return apiCompatJson({error:"Sign in to continue."},{status:401,headers});
  const business=await requireActiveBusiness();
  if(!canReadFinancialMirrors(business.role)) return apiCompatJson(
    {error:"Owner access is required for VAT review records."},{status:403,headers});
  const products=await supabase.from("desktop_products")
    .select("id,local_business_public_id,local_product_id,name,sku,is_active")
    .eq("business_id",business.id)
    .order("name").range(0,4999);
  if(products.error) return apiCompatJson(
    {error:"Products could not be loaded."},{status:502,headers});
  if((products.data??[]).length===5000) return apiCompatJson(
    {error:"The product list exceeds the current review limit. Use the desktop review screen."},
    {status:422,headers});
  return apiCompatJson({products:products.data??[],readOnly:true},{headers});
}
