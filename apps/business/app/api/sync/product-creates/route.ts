import { NextRequest, NextResponse } from "next/server";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";

const headers={"Cache-Control":"private, no-store"};
const reply=(value:unknown,status:number)=>NextResponse.json(value,{status,headers});
const v4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request:NextRequest){
  if(process.env.AKILIBIZ_ENABLE_PRODUCT_CREATE_REQUESTS!=="1")
    return reply({error:"Desktop product requests are not enabled."},503);
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return reply({error:"Sign in required."},401);
  const business=await requireActiveBusiness();
  if(business.role!=="owner")return reply({error:"Only the business owner can request desktop product creation."},403);
  const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(!body||Array.isArray(body)||typeof body!=="object"||
    Object.keys(body).length!==2||
    typeof body.draftId!=="string"||!v4.test(body.draftId)||
    typeof body.requestId!=="string"||!v4.test(body.requestId))
    return reply({error:"Invalid product request."},400);
  // All product fields and the paired source are re-read and snapshotted by
  // the database RPC. Never accept an arbitrary product payload here.
  const {data,error}=await supabase.rpc("request_desktop_product_create",{
    target_business_id:business.id,
    target_draft_id:body.draftId,
    request_id:body.requestId,
  });
  if(error){
    const status=error.code==="55000"?503:error.code==="42501"?403:
      error.code==="23505"||error.code==="23503"?409:
      error.code==="22023"?400:502;
    return reply({error:status===503?"Product requests are not ready for this business.":
      status===403?"The draft or paired desktop is unavailable to this owner.":
      status===409?"This draft is already requested, or its category is unavailable.":
      status===400?"Complete all required product settings before requesting creation.":
      "Could not safely request product creation."},status);
  }
  if(typeof data!=="string"||!v4.test(data))
    return reply({error:"The request could not be confirmed."},503);
  return reply({commandId:data,state:"pending",
    message:"Request queued for desktop staging. This product has not been created or published."},202);
}

export async function GET(request:NextRequest){
  if(process.env.AKILIBIZ_ENABLE_PRODUCT_CREATE_REQUESTS!=="1")
    return reply({error:"Desktop product request status is not enabled."},503);
  const commandId=request.nextUrl.searchParams.get("id");
  if(!commandId||!v4.test(commandId))
    return reply({error:"Invalid command reference."},400);
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return reply({error:"Sign in required."},401);
  const business=await requireActiveBusiness();
  if(business.role!=="owner")return reply({error:"Owner access required."},403);
  const {data,error}=await supabase.rpc("desktop_product_create_status",{
    target_business_id:business.id,target_command_id:commandId,
  });
  if(error)return reply({error:"Could not verify the request status."},503);
  const row=Array.isArray(data)?data[0]:null;
  if(!row)return reply({error:"Product request not found."},404);
  if(row.command_id!==commandId||typeof row.draft_id!=="string"||
    !["pending","staged","applied","conflict"].includes(row.state))
    return reply({error:"Invalid request status."},503);
  return reply({commandId:row.command_id,draftId:row.draft_id,
    state:row.state,requestedAt:row.requested_at},200);
}
