import {NextRequest,NextResponse} from "next/server";
import {requireActiveBusiness} from "@/lib/business-context";
import {createClient} from "@/lib/supabase/server";
import {parsePurchaseOrderDraft,purchaseOrderDraftTotal} from "@/lib/purchase-order-draft-validation";

const headers={"Cache-Control":"private, no-store"};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function context(){
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return null;
  const business=await requireActiveBusiness();
  return {supabase,user,business,allowed:["owner","manager"].includes(business.role)};
}
export async function GET(){
  if(process.env.AKILIBIZ_ENABLE_WEB_PURCHASE_ORDER_DRAFTS!=="1")
    return fail("Purchase order preparation is not enabled.",503);
  const auth=await context();
  if(!auth)return fail("Sign in required.",401);
  if(!auth.allowed)return fail("Only an owner or manager can prepare purchase orders.",403);
  const {supabase,user,business}=auth;
  const [drafts,suppliers,products]=await Promise.all([
    supabase.from("web_purchase_order_drafts")
      .select("id,po_number,supplier_id,source_business_public_id,order_date,expected_delivery,notes,lines,updated_at",
        {count:"exact"})
      .eq("business_id",business.id).eq("created_by",user.id)
      .order("updated_at",{ascending:false}).range(0,99),
    supabase.from("desktop_suppliers")
      .select("id,name,local_business_public_id,is_active",{count:"exact"})
      .eq("business_id",business.id).eq("is_active",true)
      .order("name").range(0,999),
    supabase.from("desktop_products")
      .select("id,name,sku,local_business_public_id,local_product_id,stock_unit,is_active",
        {count:"exact"})
      .eq("business_id",business.id).eq("is_active",true)
      .order("name").range(0,4999),
  ]);
  if(drafts.error||suppliers.error||products.error||
    drafts.count===null||suppliers.count===null||products.count===null)
    return fail("Could not verify the purchase order draft register.",503);
  if(drafts.count>100||suppliers.count>1000||products.count>5000)
    return fail("The register is too large for a complete list. Narrowing and pagination are required.",413);
  return NextResponse.json({drafts:drafts.data??[],suppliers:suppliers.data??[],
    products:products.data??[],canPost:false,
    reviewRequestsEnabled:business.role==="owner" &&
      process.env.AKILIBIZ_ENABLE_PURCHASE_ORDER_REVIEW_REQUESTS==="1"},{headers});
}
export async function POST(request:NextRequest){
  if(process.env.AKILIBIZ_ENABLE_WEB_PURCHASE_ORDER_DRAFTS!=="1")
    return fail("Purchase order preparation is not enabled.",503);
  const auth=await context();
  if(!auth)return fail("Sign in required.",401);
  if(!auth.allowed)return fail("Only an owner or manager can prepare purchase orders.",403);
  const draft=parsePurchaseOrderDraft(await request.json().catch(()=>null));
  if(!draft)return fail("Check the supplier, purchase order number, dates, products, quantities and exact UGX prices.",400);
  const {supabase,user,business}=auth;
  // The database trigger independently validates every product and supplier
  // against the selected desktop source (including direct table API writes).
  const [supplier,products]=await Promise.all([
    supabase.from("desktop_suppliers").select("id,local_business_public_id")
      .eq("business_id",business.id).eq("id",draft.supplier_id)
      .eq("is_active",true).maybeSingle(),
    supabase.from("desktop_products").select("id,local_business_public_id")
      .eq("business_id",business.id).eq("is_active",true)
      .in("id",draft.lines.map(line=>line.product_id)),
  ]);
  if(supplier.error||products.error||!supplier.data||
    supplier.data.local_business_public_id!==draft.source_business_public_id||
    !Array.isArray(products.data)||products.data.length!==draft.lines.length||
    products.data.some(product=>product.local_business_public_id!==draft.source_business_public_id))
    return fail("Use an active supplier and products from the same desktop business.",409);
  const result=await supabase.from("web_purchase_order_drafts").upsert({
    ...draft,business_id:business.id,created_by:user.id,
  },{onConflict:"id"}).select("id,updated_at").single();
  if(result.error)return fail(result.error.code==="55000"?
    "This purchase order was already sent for desktop review and cannot be changed.":
    result.error.code==="42501"?
    "This draft belongs to a different business, owner, or supplier. Start a new draft.":
    "The purchase order could not be saved. Check the selected products and amounts.",409);
  return NextResponse.json({id:result.data.id,updatedAt:result.data.updated_at,
    totalUgx:purchaseOrderDraftTotal(draft.lines),state:"draft",
    message:"Purchase order draft saved. No stock, supplier balance, VAT or desktop order was changed."},
    {status:200,headers});
}
export async function DELETE(request:NextRequest){
  if(process.env.AKILIBIZ_ENABLE_WEB_PURCHASE_ORDER_DRAFTS!=="1")
    return fail("Purchase order preparation is not enabled.",503);
  const auth=await context();
  if(!auth)return fail("Sign in required.",401);
  if(!auth.allowed)return fail("Only an owner or manager can discard purchase order drafts.",403);
  const id=request.nextUrl.searchParams.get("id");
  if(!id||!uuid.test(id))return fail("Invalid draft reference.",400);
  const {supabase,business,user}=auth;
  const result=await supabase.from("web_purchase_order_drafts").delete()
    .eq("business_id",business.id).eq("created_by",user.id).eq("id",id).select("id");
  if(result.error)return fail(result.error.code==="55000"?
    "This purchase order was already sent for desktop review and cannot be discarded.":
    "This purchase order draft could not be discarded.",409);
  if(!result.data?.length)return fail("Draft not found.",404);
  return NextResponse.json({discarded:true},{headers});
}
