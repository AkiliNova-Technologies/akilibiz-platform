import { NextRequest, NextResponse } from "next/server";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { classifySalePostError, parseCashSaleSubmission } from "@/lib/pos-sale-submission";

const headers = { "Cache-Control": "private, no-store" };
const reply = (body: unknown, status: number) =>
  NextResponse.json(body, { status, headers });

/**
 * Staged hosted cash posting endpoint.
 *
 * The database feature gate is deliberately OFF for all businesses. Until
 * desktop reconciliation and fiscal qualification pass, valid calls receive
 * 423 and cannot create a sale. No browser checkout UI invokes this endpoint.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return reply({ error: "Authentication required." }, 401);

  const submission = parseCashSaleSubmission(await request.json().catch(() => null));
  if (!submission) return reply({ error: "Invalid cash sale submission." }, 400);

  const business = await requireActiveBusiness();
  if (!["owner", "manager", "cashier"].includes(business.role)) {
    return reply({ error: "You cannot record sales for this business." }, 403);
  }

  // A single database RPC performs authorization, lock acquisition, stock and
  // tax rechecks, sale/payment/hold inserts and durable outbox creation.
  // No ad-hoc multi-request writes or service-role client are used.
  const { data, error } = await supabase.rpc("post_web_pos_cash_sale", {
    target_business_id: business.id,
    request_id: submission.idempotency_key,
    sale_items: submission.items,
    cash_received_ugx: submission.cash_received_ugx,
  });
  if (error) {
    const status = classifySalePostError(error.code);
    return reply({
      error: status === 423
        ? "Web sale posting is not yet available for this business."
        : status === 409
          ? "The sale cannot be completed with its current items or stock."
          : status === 403
            ? "You cannot record sales for this business."
            : status === 400
              ? "Invalid sale details."
              : "Sales are temporarily unavailable.",
    }, status);
  }
  const sale = Array.isArray(data) ? data[0] : null;
  if (!sale || typeof sale.sale_id !== "string") {
    return reply({ error: "The sale receipt could not be confirmed." }, 503);
  }
  return reply({
    sale_id: sale.sale_id,
    receipt_number: sale.receipt_number,
    total_ugx: sale.total_ugx,
    change_ugx: sale.change_ugx,
    replayed: sale.replayed,
    status: "pending_desktop",
  }, 200);
}
