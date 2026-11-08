import { NextResponse } from "next/server";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";

export async function GET(){
  const business=await requireActiveBusiness();
  const supabase=await createClient();
  // Contact directories are restricted to business owners by database RLS.
  // For other roles, these figures are not known, never a fabricated zero.
  let customers_count:number|null=null;
  let suppliers_count:number|null=null;
  if(business.role==="owner"){
    const [customers,suppliers]=await Promise.all([
      supabase.from("desktop_customers").select("id",{count:"exact",head:true})
        .eq("business_id",business.id),
      supabase.from("desktop_suppliers").select("id",{count:"exact",head:true})
        .eq("business_id",business.id)
    ]);
    if(!customers.error && (customers.count??0)>0) customers_count=customers.count;
    if(!suppliers.error && (suppliers.count??0)>0) suppliers_count=suppliers.count;
  }
  let stock_on_hand_product_count:number|null=null;
  let low_stock_product_count:number|null=null;
  let out_of_stock_product_count:number|null=null;
  if(business.role==="owner"){
    let positions: Array<{on_hand_milli:number|null;minimum_milli:number|null}>=[];
    let failed=false;
    for(let offset=0;offset<5000;offset+=500){
      const {data,error}=await supabase.from("desktop_inventory_positions")
        .select("on_hand_milli,minimum_milli").eq("business_id",business.id)
        .eq("is_current",true).order("id").range(offset,offset+499);
      if(error){failed=true;break;}
      positions.push(...(data??[]));
      if((data??[]).length<500) break;
    }
    if(!failed && positions.some(p=>p.on_hand_milli!==null)){
      const known=positions.filter(p=>p.on_hand_milli!==null);
      stock_on_hand_product_count=known.filter(p=>(p.on_hand_milli??0)>0).length;
      low_stock_product_count=known.filter(p=>p.minimum_milli!==null
        && p.minimum_milli>0 && (p.on_hand_milli??0)>0
        && (p.on_hand_milli??0)<=p.minimum_milli).length;
      out_of_stock_product_count=known.filter(p=>p.on_hand_milli===0).length;
    }
  }
  return NextResponse.json({
    customers_count,suppliers_count,stock_on_hand_product_count,
    low_stock_product_count,out_of_stock_product_count
  },{headers:{"Cache-Control":"private, no-store"}});
}
