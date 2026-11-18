import { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import {
  classifySalePostError,
  parseCashSaleSubmission,
} from "@/lib/pos-sale-submission";

/**
 * Staged hosted cash posting endpoint.
 *
 * The database feature gate is deliberately OFF for all businesses. Until
 * desktop reconciliation and fiscal qualification pass, valid calls receive
 * 423 and cannot create a sale. The separate browser cash-sale pilot may
 * call it only when its own explicit build-time gate is enabled; ordinary
 * checkout remains disabled.
 */
export async function POST(request: NextRequest) {
  if (process.env.AKILIBIZ_ENABLE_WEB_POS_SALES !== "1")
    return apiError(
      "SYNC_UNAVAILABLE",
      "Web sale submission is not enabled for this environment.",
      503,
    );
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user)
    return apiError("UNAUTHORIZED", "Authentication required.", 401);

  const submission = parseCashSaleSubmission(
    await request.json().catch(() => null),
  );
  if (!submission)
    return apiError("VALIDATION_FAILED", "Invalid cash sale submission.", 400);

  const business = await requireActiveBusiness();
  if (!["owner", "manager", "cashier"].includes(business.role)) {
    return apiError(
      "FORBIDDEN",
      "You cannot record sales for this business.",
      403,
    );
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
    const code =
      status === 423
        ? "SYNC_UNAVAILABLE"
        : status === 409
          ? "CONFLICT"
          : status === 403
            ? "FORBIDDEN"
            : status === 400
              ? "VALIDATION_FAILED"
              : "SERVICE_UNAVAILABLE";
    return apiError(
      code,
      status === 423
        ? "Web sale posting is not yet available for this business."
        : status === 409
          ? "The sale cannot be completed with its current items or stock."
          : status === 403
            ? "You cannot record sales for this business."
            : status === 400
              ? "Invalid sale details."
              : "Sales are temporarily unavailable.",
      status,
    );
  }
  const sale = Array.isArray(data) ? data[0] : null;
  if (!sale || typeof sale.sale_id !== "string") {
    return apiError(
      "SERVICE_UNAVAILABLE",
      "The sale receipt could not be confirmed.",
      503,
    );
  }
  return apiSuccess({
    sale_id: sale.sale_id,
    receipt_number: sale.receipt_number,
    total_ugx: sale.total_ugx,
    change_ugx: sale.change_ugx,
    replayed: sale.replayed,
    status: "pending_desktop",
  });
}
