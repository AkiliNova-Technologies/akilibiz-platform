import {NextRequest} from "next/server";
import {apiLegacyJson} from "@/lib/api-response";
import {requireActiveBusiness} from "@/lib/business-context";
import {createClient} from "@/lib/supabase/server";
const reply=(body:unknown,status:number)=>apiLegacyJson(body,status);
const fail=(error:string,status:number)=>reply({error},status);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function context(){const supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();if(error||!user)return null;return {supabase,business:await requireActiveBusiness()};}
export async function GET(){
 if(process.env.AKILIBIZ_ENABLE_WEB_SUPPLIER_PAYMENT_REQUESTS!=="1")return fail("Supplier payment requests are not enabled.",503);
 const ctx=await context();if(!ctx)return fail("Sign in required.",401);if(ctx.business.role!=="owner")return fail("Owner access required.",403);
 const {data,error}=await ctx.supabase.rpc("list_desktop_supplier_payment_statuses",{target_business_id:ctx.business.id});
 if(error||!Array.isArray(data))return fail("Could not load supplier payment request status.",503);return reply({requests:data},200);
}
export async function POST(request:NextRequest){
 if(process.env.AKILIBIZ_ENABLE_WEB_SUPPLIER_PAYMENT_REQUESTS!=="1")return fail("Supplier payment requests are not enabled.",503);
 const ctx=await context();if(!ctx)return fail("Sign in required.",401);if(ctx.business.role!=="owner")return fail("Only the business owner can request a supplier payment.",403);
 const body=await request.json().catch(()=>null) as Record<string,unknown>|null;
 if(!body||typeof body.requestId!=="string"||!uuid.test(body.requestId)||typeof body.sourceBusinessPublicId!=="string"||!body.sourceBusinessPublicId.trim()||typeof body.paymentRef!=="string"||!body.paymentRef.trim()||typeof body.paymentDate!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(body.paymentDate)||!(["Cash","Bank Transfer","Cheque"] as unknown[]).includes(body.paymentMethod)||!Array.isArray(body.allocations))return fail("Check the payment details and allocations.",400);
 const allocations=body.allocations.map(value=>{if(!value||typeof value!=="object")return null;const row=value as Record<string,unknown>;return Number.isSafeInteger(row.supplierPayableId)&&Number(row.supplierPayableId)>0&&Number.isSafeInteger(row.amountUgx)&&Number(row.amountUgx)>0?{supplier_payable_id:row.supplierPayableId,amount_ugx:row.amountUgx}:null;});
 if(!allocations.length||allocations.some(value=>value===null))return fail("Every allocation requires a payable and positive whole-UGX amount.",400);
 const {data,error}=await ctx.supabase.rpc("request_desktop_supplier_payment_review",{target_business_id:ctx.business.id,request_id:body.requestId,source_business_public_id:body.sourceBusinessPublicId,payment_ref:body.paymentRef,payment_date:body.paymentDate,payment_method:body.paymentMethod,notes:typeof body.notes==="string"?body.notes:null,allocations});
 if(error)return fail(error.code==="55000"?"Supplier payment requests are not currently enabled.":"The payment request conflicts with the latest synchronized payable balances.",409);
 return reply({commandId:data,state:"pending",message:"Sent for desktop staff approval. No payment has been posted yet."},202);
}
