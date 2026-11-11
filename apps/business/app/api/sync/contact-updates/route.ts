import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireActiveBusiness } from "@/lib/business-context";

/** Pilot-only: enqueue a version-checked command. Never update the public
 * desktop contact projection from the web: SQLite remains authoritative. */
export async function POST(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store" };
  if (process.env.AKILIBIZ_ENABLE_BIDIRECTIONAL_CONTACTS !== "1") {
    return NextResponse.json({ error: "Two-way contact editing is not enabled." },
      { status: 503, headers });
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in required." },
    { status: 401, headers });
  const business = await requireActiveBusiness();
  if (business.role !== "owner") return NextResponse.json(
    { error: "Only the business owner may request contact updates." }, { status: 403, headers });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400, headers });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json(
    { error: "Invalid contact update." }, { status: 400, headers });
  const input = body as Record<string, unknown>;
  const allowed = input.entity === "customer"
    ? ["name", "email", "phone", "address"]
    : input.entity === "supplier"
      ? ["name", "contact_person", "email", "phone", "address", "payment_terms"]
      : null;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!allowed || typeof input.recordId !== "string" || !uuid.test(input.recordId) ||
      typeof input.expectedUpdatedAt !== "string" ||
      !Number.isFinite(Date.parse(input.expectedUpdatedAt)) ||
      !input.changes || typeof input.changes !== "object" || Array.isArray(input.changes)) {
    return NextResponse.json({ error: "Invalid contact update." }, { status: 400, headers });
  }
  const changes = input.changes as Record<string, unknown>;
  if (!Object.keys(changes).length ||
      Object.entries(changes).some(([key, value]) =>
        !allowed.includes(key) || !(typeof value === "string" || value === null))) {
    return NextResponse.json({ error: "Unsupported contact field." }, { status: 400, headers });
  }
  const { data, error } = await supabase.rpc("request_desktop_contact_update", {
    target_business_id: business.id,
    target_entity_type: input.entity,
    target_record_id: input.recordId,
    expected_updated_at: input.expectedUpdatedAt,
    requested_changes: changes,
  });
  if (error) {
    const status = error.code === "40001" || error.code === "23505" ? 409
      : error.code === "23503" ? 404
      : error.code === "42501" ? 403
      : error.code === "55000" ? 503 : 422;
    return NextResponse.json({
      error: status === 409 ? "This contact has changed or has a pending edit. Refresh before retrying."
        : status === 503 ? "Two-way contact editing is not enabled for this business."
        : status === 403 ? "Contact edit is not authorized."
        : "The contact update could not be queued.",
    }, { status, headers });
  }
  return NextResponse.json({
    commandId: data,
    state: "pending",
    message: "Change queued for the paired desktop. It is not applied until the desktop confirms it.",
  }, { status: 202, headers });
}
