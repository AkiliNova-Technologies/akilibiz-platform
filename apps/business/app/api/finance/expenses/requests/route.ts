import { NextRequest } from "next/server";
import { apiLegacyJson } from "@/lib/api-response";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
const respond = (body: unknown, status: number) => apiLegacyJson(body, status);
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
async function context() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, business: await requireActiveBusiness() };
}
export async function GET() {
  if (process.env.AKILIBIZ_ENABLE_WEB_EXPENSE_REQUESTS !== "1")
    return respond({ error: "Expense requests are not enabled." }, 503);
  const ctx = await context();
  if (!ctx) return respond({ error: "Sign in required." }, 401);
  if (ctx.business.role !== "owner")
    return respond({ error: "Owner access required." }, 403);
  const { data, error } = await ctx.supabase.rpc(
    "list_desktop_expense_command_statuses",
    { target_business_id: ctx.business.id },
  );
  return error
    ? respond({ error: "Unable to load expense request status." }, 503)
    : respond({ requests: data }, 200);
}
export async function POST(request: NextRequest) {
  if (process.env.AKILIBIZ_ENABLE_WEB_EXPENSE_REQUESTS !== "1")
    return respond({ error: "Expense requests are not enabled." }, 503);
  const ctx = await context();
  if (!ctx) return respond({ error: "Sign in required." }, 401);
  if (ctx.business.role !== "owner")
    return respond(
      { error: "Only the business owner can submit expense requests." },
      403,
    );
  const b = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (
    !b ||
    typeof b.requestId !== "string" ||
    !uuid.test(b.requestId) ||
    typeof b.sourceBusinessPublicId !== "string" ||
    !b.sourceBusinessPublicId.trim()
  )
    return respond({ error: "Invalid request identity." }, 400);
  let rpc = "",
    args: Record<string, unknown> = {
      target_business_id: ctx.business.id,
      request_id: b.requestId,
      source_business_public_id: b.sourceBusinessPublicId,
    };
  if (b.operation === "create" && b.expense && typeof b.expense === "object") {
    rpc = "request_desktop_expense_creation";
    args = { ...args, expense: b.expense };
  } else if (
    b.operation === "settle" &&
    Number.isSafeInteger(b.payableId) &&
    Number.isSafeInteger(b.amountUgx)
  ) {
    rpc = "request_desktop_expense_settlement";
    args = {
      ...args,
      payable_id: b.payableId,
      amount_ugx: b.amountUgx,
      effective_date: b.effectiveDate,
      payment_method: b.paymentMethod,
      reference: b.reference,
    };
  } else if (b.operation === "void" && Number.isSafeInteger(b.expenseId)) {
    rpc = "request_desktop_expense_void";
    args = {
      ...args,
      expense_id: b.expenseId,
      effective_date: b.effectiveDate,
      reason: b.reason,
    };
  } else return respond({ error: "Check the expense request details." }, 400);
  const { data, error } = await ctx.supabase.rpc(rpc, args);
  if (error)
    return respond(
      {
        error:
          error.code === "55000"
            ? "This expense operation is not currently enabled."
            : "The request conflicts with the latest synchronized expense records.",
      },
      409,
    );
  return respond(
    {
      commandId: data,
      state: "pending",
      message:
        "Sent for desktop approval. No accounting record has changed yet.",
    },
    202,
  );
}
