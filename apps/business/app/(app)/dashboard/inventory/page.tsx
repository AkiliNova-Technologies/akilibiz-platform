import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { HostedInventory,type Position,type ProductSummary } from "@/components/akilibiz/inventory/hosted-inventory";

export default async function InventoryPage(){
 const business=await requireActiveBusiness();
 const supabase=await createClient();
 const [{data:positions,error:positionError},{data:products,error:productError}]=await Promise.all([
  supabase.rpc("list_desktop_effective_inventory",{target_business_id:business.id}),
  supabase.from("desktop_products")
    .select("id,name,sku,stock_unit,is_active")
    .eq("business_id",business.id).order("name").limit(1000)
 ]);
 const loadError = positionError || productError
  ? "Could not load your inventory. Check your connection and try again."
  : null;
 return <HostedInventory businessName={business.name}
  error={loadError}
  positions={(loadError?[]:positions??[]) as Position[]} products={(loadError?[]:products??[]) as ProductSummary[]}/>;
}
