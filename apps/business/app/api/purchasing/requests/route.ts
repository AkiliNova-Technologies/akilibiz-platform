import {NextRequest,NextResponse} from "next/server";
import {requireActiveBusiness} from "@/lib/business-context";
import {createClient} from "@/lib/supabase/server";

const headers={"Cache-Control":"private, no-store"};
const reply=(value:unknown,status:number)=>NextResponse.json(value,{status,headers});
const v4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request:NextRequest){
  if(process.env.AKILIBIZ_ENABLE_PURCHASE_ORDER_REVIEW_REQUESTS!=="1")
    return reply({error:"Desktop purchase order requests are not enabled."},503);
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return reply({error:"Sign in required."},401);
  const business=await requireActiveBusiness();
  if(business.role!=="owner")
    return reply({error:"Only the business owner can send orders for desktop review."},403);
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body||typeof body!=="object"||Array.isArray(body)||
    Object.keys(body).length!==2||typeof body.draftId!=="string"||
    !v4.test(body.draftId)||typeof body.requestId!=="string"||!v4.test(body.requestId))
    return reply({error:"Invalid purchase order review request."},400);
  // The SQL function locks and snapshots a business/owner-scoped draft and
  // re-resolves supplier public ID and each product's local ID itself.
  const result=await supabase.rpc("request_desktop_purchase_order_review",{
    target_business_id:business.id,target_draft_id:body.draftId,request_id:body.requestId,
  });
  if(result.error){
    const status=result.error.code==="55000"?503:
      result.error.code==="42501"?403:
      ["23505","23503"].includes(result.error.code)?409:
      result.error.code==="22023"?400:502;
    return reply({error:status===503?"Purchase order review requests are not ready for this business.":
      status===403?"Only the original owner and paired desktop can review this order.":
      status===409?"This draft was already submitted or its supplier/products changed.":
      status===400?"Complete the required purchase-order details before requesting review.":
      "Could not confirm the desktop review request."},status);
  }
  if(typeof result.data!=="string"||!v4.test(result.data))
    return reply({error:"The purchase order request could not be confirmed."},503);
  return reply({commandId:result.data,state:"pending",
    message:"Sent for desktop review. No order, stock or supplier payment has been recorded."},202);
}
export async function GET(){
  if(process.env.AKILIBIZ_ENABLE_PURCHASE_ORDER_REVIEW_REQUESTS!=="1")
    return reply({error:"Desktop purchase order requests are not enabled."},503);
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user)return reply({error:"Sign in required."},401);
  const business=await requireActiveBusiness();
  if(business.role!=="owner")return reply({error:"Owner access required."},403);
  const {data,error:dbError}=await supabase.rpc("list_desktop_purchase_order_review_statuses",{
    target_business_id:business.id,
  });
  if(dbError||!Array.isArray(data)||data.length>100||
    data.some((value:unknown)=>{
      if(!value||typeof value!=="object")return true;
      const row=value as Record<string,unknown>;
      return typeof row.command_id!=="string"||!v4.test(row.command_id)||
        typeof row.draft_id!=="string"||!v4.test(row.draft_id)||
        !["pending","staged","applied","conflict"].includes(String(row.state));
    }))return reply({error:"Could not verify existing desktop review requests."},503);
  return reply({requests:data},200);
}
