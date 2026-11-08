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
 if(positionError||productError){
  return <p role="alert" className="text-sm text-destructive">
   Could not load the synchronized inventory. Confirm the Phase 1 database updates are installed and your business access is active.
  </p>;
 }
 return <HostedInventory businessName={business.name}
  positions={(positions??[]) as Position[]} products={(products??[]) as ProductSummary[]}/>;
}
