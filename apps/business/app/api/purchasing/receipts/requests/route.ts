import {NextRequest} from "next/server";
import {apiLegacyJson} from "@/lib/api-response";
import {requireActiveBusiness} from "@/lib/business-context";
import {createClient} from "@/lib/supabase/server";

const respond=(body:unknown,status:number)=>apiLegacyJson(body,status);
const error=(message:string,status:number)=>respond({error:message},status);
const uuidV4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function context(){
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return null;
  const business=await requireActiveBusiness();
  return {supabase,business};
}

export async function GET(){
  if(process.env.AKILIBIZ_ENABLE_WEB_GOODS_RECEIPT_REQUESTS!=="1")
    return error("Desktop goods receipt review is not enabled.",503);
  const ctx=await context();
  if(!ctx)return error("Sign in required.",401);
  if(ctx.business.role!=="owner")return error("Owner access required.",403);
  const {data,error:rpcError}=await ctx.supabase.rpc(
    "list_desktop_goods_receipt_statuses",{target_business_id:ctx.business.id},
  );
  if(rpcError||!Array.isArray(data))return error("Could not load desktop receipt review status.",503);
  return respond({requests:data},200);
}

export async function POST(request:NextRequest){
  if(process.env.AKILIBIZ_ENABLE_WEB_GOODS_RECEIPT_REQUESTS!=="1")
    return error("Desktop goods receipt review is not enabled.",503);
  const ctx=await context();
  if(!ctx)return error("Sign in required.",401);
  if(ctx.business.role!=="owner")return error("Only the business owner can request desktop review.",403);
  const body=await request.json().catch(()=>null) as {draftId?:unknown;requestId?:unknown}|null;
  if(!body||typeof body.draftId!=="string"||typeof body.requestId!=="string"||
    !uuidV4.test(body.draftId)||!uuidV4.test(body.requestId))
    return error("Invalid goods receipt request identity.",400);
  const {data,error:rpcError}=await ctx.supabase.rpc("request_desktop_goods_receipt_review",{
    target_business_id:ctx.business.id,target_draft_id:body.draftId,request_id:body.requestId,
  });
  if(rpcError)return error(
    rpcError.code==="55000"?"Desktop goods receipt requests are not currently enabled.":
      "This receipt could not be submitted. Refresh the synchronized order and desktop connection.",409,
  );
  return respond({commandId:data,state:"pending",message:"Sent for desktop staff review. Nothing is posted until approved on desktop."},202);
}
