import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { HostedInventory,type Position,type ProductSummary } from "@/components/akilibiz/inventory/hosted-inventory";

export default async function InventoryPage(){
 const business=await requireActiveBusiness();
 const supabase=await createClient();
 const [{data:positions,error:positionError},{data:products,error:productError}]=await Promise.all([
  supabase.from("desktop_inventory_positions")
    .select("id,product_id,on_hand_milli,reserved_milli,damaged_milli,minimum_milli,maximum_milli,is_current,snapshot_at")
    .eq("business_id",business.id).order("snapshot_at",{ascending:false}).limit(1000),
  supabase.from("desktop_products")
    .select("id,name,sku,stock_unit,is_active")
    .eq("business_id",business.id).order("name").limit(1000)
 ]);
 if(positionError||productError){
  return <p role="alert" className="text-sm text-destructive">
   Could not load the cloud inventory snapshot. Verify your business owner permissions.
  </p>;
 }
 return <HostedInventory businessName={business.name}
  positions={(positions??[]) as Position[]} products={(products??[]) as ProductSummary[]}/>;
}
