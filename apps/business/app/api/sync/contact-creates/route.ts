import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireActiveBusiness } from "@/lib/business-context";
import { validateContactChanges } from "@/lib/contact-update-validation";

const headers = { "Cache-Control": "private, no-store" };
const reply = (value: unknown, status: number) => NextResponse.json(value,{ status, headers });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  if (process.env.AKILIBIZ_ENABLE_CONTACT_CREATION !== "1") {
    return reply({error:"Contact creation from the web is not enabled."},503);
  }
  const supabase=await createClient();
  const { data:{user},error:authError }=await supabase.auth.getUser();
  if(authError||!user) return reply({error:"Sign in required."},401);
  const business=await requireActiveBusiness();
  if(business.role!=="owner") return reply({error:"Owner access required."},403);
  const payload=await request.json().catch(()=>null) as Record<string,unknown>|null;
  if(!payload || Array.isArray(payload) || typeof payload!=="object") {
    return reply({error:"Invalid contact creation request."},400);
  }
  const entity=payload.entity;
  const requestId=payload.requestId;
  if((entity!=="customer"&&entity!=="supplier")||
     typeof requestId!=="string"||!UUID.test(requestId)||
     !payload.fields||typeof payload.fields!=="object"||Array.isArray(payload.fields)) {
    return reply({error:"Invalid contact creation request."},400);
  }
  const fields=payload.fields as Record<string,unknown>;
  const required=entity==="customer"
    ? ["name"] : ["name","contact_person","phone","payment_terms"];
  if(required.some(key=>{const value=fields[key];return typeof value!=="string"||!value.trim();})) {
    return reply({error:"Complete all required contact fields."},400);
  }
  const error=validateContactChanges(entity,fields);
  if(error) return reply({error},400);
  const {data, error:databaseError}=await supabase.rpc("request_desktop_contact_create",{
    target_business_id:business.id,
    target_entity_type:entity,
    request_id:requestId,
    contact_fields:fields,
  });
  if(databaseError) {
    const status=databaseError.code==="55000"?503
      :databaseError.code==="42501"?403
      :databaseError.code==="23505"?409:422;
    return reply({error:status===503?"Web contact creation is unavailable for this business."
      :status===403?"No authorized desktop is available for this business."
      :status===409?"This request has already been used with different details."
      :"Could not queue the new contact."},status);
  }
  return reply({
    commandId:data,
    state:"pending",
    message:"Creation requested. The contact is not saved until the paired desktop confirms it.",
  },202);
}

export async function GET(request:NextRequest) {
  if(process.env.AKILIBIZ_ENABLE_CONTACT_CREATION!=="1") {
    return reply({error:"Contact creation status is not enabled."},503);
  }
  const id=request.nextUrl.searchParams.get("id");
  if(!id||!UUID.test(id)) return reply({error:"Invalid command ID."},400);
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user) return reply({error:"Sign in required."},401);
  const business=await requireActiveBusiness();
  if(business.role!=="owner") return reply({error:"Owner access required."},403);
  const {data,error}=await supabase.rpc("desktop_contact_create_status",{
    target_business_id:business.id,
    target_command_id:id,
  });
  if(error) return reply({error:"Could not verify creation status."},502);
  const result=Array.isArray(data)?data[0]:null;
  if(!result) return reply({error:"Creation request not found."},404);
  return reply({
    commandId:result.command_id,
    state:result.state,
    sourcePublicId:result.source_public_id,
    requestedAt:result.requested_at,
    appliedAt:result.applied_at,
    conflictReason:result.conflict_reason,
  },200);
}
