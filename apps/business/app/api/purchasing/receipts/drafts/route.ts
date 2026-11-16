import {NextRequest} from "next/server";
import {apiLegacyJson} from "@/lib/api-response";
import {requireActiveBusiness} from "@/lib/business-context";
import {createClient} from "@/lib/supabase/server";
import {parsePreparedGoodsReceipt,preparedReceiptTotal} from "@/lib/goods-receipt-draft-validation";

const headers={"Cache-Control":"private, no-store"};
const respond=(body:unknown,status:number)=>apiLegacyJson(body,status);
const error=(message:string,status:number)=>respond({error:message},status);
const uuidV4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function authorized(){
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return null;
  const business=await requireActiveBusiness();
  return {supabase,user,business};
}

export async function GET(){
  if(process.env.AKILIBIZ_ENABLE_WEB_GOODS_RECEIPT_DRAFTS!=="1")
    return error("Goods receiving preparation is not enabled.",503);
  const ctx=await authorized();
  if(!ctx)return error("Sign in required.",401);
  const {supabase,business,user}=ctx;
  if(business.role!=="owner")return error("Only the business owner can prepare goods receipts.",403);
  const result=await supabase.from("web_goods_receipt_drafts")
    .select("id,source_business_public_id,purchase_order_id,receipt_number,receipt_date,supplier_reference,due_date,lines,supplier_vat,updated_at",{count:"exact"})
    .eq("business_id",business.id).eq("created_by",user.id)
    .order("updated_at",{ascending:false}).range(0,99);
  if(result.error||result.count===null||result.count>100)
    return error("Could not verify a complete goods receipt draft register.",503);
  return respond({drafts:result.data??[],canPost:false},200);
}

export async function POST(request:NextRequest){
  if(process.env.AKILIBIZ_ENABLE_WEB_GOODS_RECEIPT_DRAFTS!=="1")
    return error("Goods receiving preparation is not enabled.",503);
  const ctx=await authorized();
  if(!ctx)return error("Sign in required.",401);
  const {supabase,business,user}=ctx;
  if(business.role!=="owner")return error("Only the business owner can prepare goods receipts.",403);
  const payload=parsePreparedGoodsReceipt(await request.json().catch(()=>null));
  if(!payload)
    return error("Check the order, receipt number, delivered quantities, prices and supplier invoice evidence.",400);
  // Complete posting validation occurs on the paired desktop when goods
  // physically arrive. This check only guards the preparation snapshot.
  const [order,lines]=await Promise.all([
    supabase.from("desktop_business_records").select("record")
      .eq("business_id",business.id)
      .eq("local_business_public_id",payload.source_business_public_id)
      .eq("entity_type","purchase_orders")
      .eq("local_record_id",payload.purchase_order_id).maybeSingle(),
    supabase.from("desktop_business_records").select("local_record_id,record")
      .eq("business_id",business.id)
      .eq("local_business_public_id",payload.source_business_public_id)
      .eq("entity_type","purchase_order_lines")
      .eq("record->>purchase_order_id",String(payload.purchase_order_id))
      .range(0,99),
  ]);
  if(order.error||lines.error||!order.data||
    !["Pending","Partially Received"].includes(String(order.data.record?.status))||
    !Array.isArray(lines.data))
    return error("This order is not currently available for goods receipt preparation.",409);
  const indexed=new Map<number,Record<string,unknown>>();
  for(const row of lines.data){
    if(typeof row.local_record_id==="number"&&row.record&&typeof row.record==="object")
      indexed.set(row.local_record_id,row.record as Record<string,unknown>);
  }
  for(const line of payload.lines){
    const saved=indexed.get(line.purchase_order_line_id);
    if(!saved||saved.product_id!==line.product_id||
      typeof saved.quantity_milli!=="number"||
      typeof saved.received_quantity_milli!=="number"||
      !Number.isSafeInteger(saved.quantity_milli)||
      !Number.isSafeInteger(saved.received_quantity_milli)||
      saved.quantity_milli-saved.received_quantity_milli<line.quantity_milli)
      return error("The delivered quantity exceeds the latest synchronized order balance.",409);
  }
  const {data,error:dbError}=await supabase.from("web_goods_receipt_drafts")
    .upsert({...payload,business_id:business.id,created_by:user.id},{onConflict:"id"})
    .select("id,updated_at").single();
  if(dbError)return error(dbError.code==="42501"?
    "This receipt draft belongs to a different order, business, or owner.":
    "Receipt draft could not be saved. Refresh the order and verify its quantities.",409);
  return respond({
    id:data.id,updatedAt:data.updated_at,state:"draft",
    totalUgx:preparedReceiptTotal(payload.lines),
    message:"Goods receipt draft saved. No stock, supplier balance or VAT was posted.",
  },200);
}

export async function DELETE(request:NextRequest){
  if(process.env.AKILIBIZ_ENABLE_WEB_GOODS_RECEIPT_DRAFTS!=="1")
    return error("Goods receiving preparation is not enabled.",503);
  const ctx=await authorized();
  if(!ctx)return error("Sign in required.",401);
  const {supabase,business,user}=ctx;
  if(business.role!=="owner")return error("Owner access required.",403);
  const id=request.nextUrl.searchParams.get("id");
  if(!id||!uuidV4.test(id))return error("Invalid receipt draft ID.",400);
  const result=await supabase.from("web_goods_receipt_drafts").delete()
    .eq("business_id",business.id).eq("created_by",user.id).eq("id",id).select("id");
  if(result.error)return error("Could not discard goods receipt draft.",409);
  if(!result.data?.length)return error("Receipt draft not found.",404);
  return respond({discarded:true},200);
}
