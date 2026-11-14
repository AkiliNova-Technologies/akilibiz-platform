import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireActiveBusiness } from "@/lib/business-context";

const headers = { "Cache-Control": "private, no-store" };
const response = (body: unknown, status: number) =>
  NextResponse.json(body, {status, headers});
const v4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const requestId = request.nextUrl.searchParams.get("requestId");
  if (!requestId || !v4.test(requestId)) {
    return response({error:"Invalid sale request reference."},400);
  }
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user) return response({error:"Sign in required."},401);
  const business=await requireActiveBusiness();
  if(!["owner","manager","cashier"].includes(business.role)) {
    return response({error:"You cannot view sales for this business."},403);
  }
  const {data,error}=await supabase.rpc("get_web_pos_cash_sale_status",{
    target_business_id:business.id,
    request_id:requestId,
  });
  if(error) return response({error:"Sale status is unavailable. Do not start another request."},503);
  const sale=Array.isArray(data)?data[0]:null;
  if(!sale) return response({
    state:"not_found",
    message:"No accepted sale is recorded for this request. Check the desktop before starting a new sale.",
  },200);
  if(!["pending_desktop","desktop_applied","reconciled","voided"].includes(sale.status) ||
    typeof sale.sale_id!=="string" ||
    typeof sale.receipt_number!=="string") {
    return response({error:"Sale status could not be verified."},503);
  }
  return response({
    state:sale.status,
    saleId:sale.sale_id,
    receiptNumber:sale.receipt_number,
    totalUgx:sale.total_ugx,
    changeUgx:sale.change_ugx,
    requestedAt:sale.requested_at,
  },200);
}
