import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireActiveBusiness } from "@/lib/business-context";
import { parseProductDraft } from "@/lib/product-draft-validation";

const headers={"Cache-Control":"private, no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
const uuidV4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function authorize() {
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return null;
  const business=await requireActiveBusiness();
  return {supabase,user,business,allowed:["owner","manager"].includes(business.role)};
}
export async function GET(){
  if(process.env.AKILIBIZ_ENABLE_WEB_PRODUCT_DRAFTS!=="1") return fail("Product preparation drafts are not yet available.",503);
  const context=await authorize();
  if(!context)return fail("Sign in required.",401);
  if(!context.allowed)return fail("Product drafts require an owner or manager.",403);
  const {supabase,user,business}=context;
  const [drafts,categories]=await Promise.all([
    supabase.from("web_product_drafts")
      .select("id,name,sku,category_id,barcode,brand,description,stock_unit,cost_price_ugx,selling_price_ugx,desktop_options,updated_at",{count:"exact"})
      .eq("business_id",business.id).eq("created_by",user.id)
      .order("updated_at",{ascending:false}).range(0,99),
    supabase.from("desktop_categories")
      .select("id,name,local_business_public_id,is_active",{count:"exact"})
      .eq("business_id",business.id).eq("is_active",true)
      .order("name").range(0,999),
  ]);
  if(drafts.error||categories.error||drafts.count===null||categories.count===null)return fail("Could not load or verify your product drafts. The draft database may not be configured yet.",503);
  if((drafts.count??0)>100 || (categories.count??0)>1000)
    return fail("Too many drafts or categories for this view. No incomplete list was shown.",413);
  const publicationRequestsEnabled=
    process.env.AKILIBIZ_ENABLE_PRODUCT_CREATE_REQUESTS==="1" && business.role==="owner";
  let publicationRequests:unknown[]=[];
  if(publicationRequestsEnabled){
    // Recover submitted requests from the authoritative hosted database,
    // never from sessionStorage or an arbitrary browser-supplied command ID.
    const statuses=await supabase.rpc("list_desktop_product_create_statuses",{
      target_business_id:business.id,
    });
    if(statuses.error || !Array.isArray(statuses.data) ||
      statuses.data.length>100 ||
      statuses.data.some((row:unknown)=>{
        if(!row||typeof row!=="object")return true;
        const value=row as Record<string,unknown>;
        return typeof value.command_id!=="string"||
          typeof value.draft_id!=="string"||
          !["pending","staged","applied","conflict","published"].includes(String(value.state));
      }))
      return fail("Could not confirm existing desktop product requests. Try again.",503);
    publicationRequests=statuses.data;
  }
  return NextResponse.json({drafts:drafts.data??[],categories:categories.data??[],
    readOnlyCatalogue:true,publicationRequestsEnabled,publicationRequests},{headers});
}
export async function POST(request:NextRequest){
  if(process.env.AKILIBIZ_ENABLE_WEB_PRODUCT_DRAFTS!=="1") return fail("Product preparation drafts are not yet available.",503);
  const context=await authorize();
  if(!context)return fail("Sign in required.",401);
  if(!context.allowed)return fail("Product drafts require an owner or manager.",403);
  const input=parseProductDraft(await request.json().catch(()=>null));
  if(!input)return fail("Review the product name, SKU, category, unit, and whole-UGX prices.",400);
  const {supabase,user,business}=context;
  const category=await supabase.from("desktop_categories")
    .select("id,local_business_public_id").eq("business_id",business.id)
    .eq("id",input.category_id).eq("is_active",true).maybeSingle();
  if(category.error || !category.data)
    return fail("Choose an active category belonging to this business.",409);
  // A draft is intentionally NOT a desktop product and has no effect on stock,
  // SKU reservations, prices, VAT, POS or synchronized catalogue.
  const write=await supabase.from("web_product_drafts").upsert({
    ...input,business_id:business.id,created_by:user.id,
  },{onConflict:"id"}).select("id,updated_at").single();
  if(write.error){
    if(write.error.code==="55000")
      return fail("This draft has already been sent for desktop review and cannot be edited.",409);
    return fail("Could not save this draft. Check your access or contact support.",409);
  }
  return NextResponse.json({
    id:write.data.id,updatedAt:write.data.updated_at,state:"draft",
    message:"Draft saved on the web. No product or stock was created on the desktop.",
  },{status:200,headers});
}
export async function DELETE(request:NextRequest){
  if(process.env.AKILIBIZ_ENABLE_WEB_PRODUCT_DRAFTS!=="1") return fail("Product preparation drafts are not yet available.",503);
  const context=await authorize();
  if(!context)return fail("Sign in required.",401);
  if(!context.allowed)return fail("Product drafts require an owner or manager.",403);
  const id=request.nextUrl.searchParams.get("id");
  if(!id || !uuidV4.test(id))return fail("Invalid draft reference.",400);
  const {supabase,user,business}=context;
  const result=await supabase.from("web_product_drafts").delete()
    .eq("business_id",business.id).eq("created_by",user.id).eq("id",id)
    .select("id");
  if(result.error){
    if(result.error.code==="55000")
      return fail("This draft has already been sent for desktop review and cannot be discarded.",409);
    return fail("Could not discard this draft.",503);
  }
  if(!result.data?.length)return fail("Draft not found.",404);
  return NextResponse.json({discarded:true},{headers});
}
