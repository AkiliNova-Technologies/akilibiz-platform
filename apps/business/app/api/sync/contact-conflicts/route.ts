import { apiCompatJson } from "@/lib/api-response";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireActiveBusiness } from "@/lib/business-context";
import {
  contactConflictFields,
  type ContactChangeRequest,
} from "@/lib/contact-conflicts";

const headers = { "Cache-Control": "private, no-store" };
const reply = (value: unknown, status: number) =>
  apiCompatJson(value, { status, headers });
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Row = {
  command_id: string;
  entity_type: "customer" | "supplier";
  contact_id: string | null;
  contact_name: string | null;
  state: "pending" | "applied" | "conflict";
  requested_at: string;
  applied_at: string | null;
  conflict_reason: string | null;
  requested_changes: Record<string, unknown> | null;
  current_record: Record<string, unknown> | null;
  resolution: ContactChangeRequest["resolution"];
  replacement_command_id: string | null;
};

async function ownerContext() {
  if (process.env.AKILIBIZ_ENABLE_BIDIRECTIONAL_CONTACTS !== "1") {
    return { ok: false as const, response: reply({ error: "Two-way contact editing is not enabled." }, 503) };
  }
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok: false as const, response: reply({ error: "Sign in required." }, 401) };
  const business = await requireActiveBusiness();
  if (business.role !== "owner") {
    return { ok: false as const, response: reply({ error: "Owner access required." }, 403) };
  }
  return { ok: true as const, supabase, business };
}

/** The owner's recent web contact changes, with conflicts needing a decision. */
export async function GET() {
  const ctx = await ownerContext();
  if (!ctx.ok) return ctx.response;
  const { data, error } = await ctx.supabase.rpc("list_desktop_contact_change_requests", {
    target_business_id: ctx.business.id,
  });
  if (error) return reply({ error: "Contact changes could not be loaded." }, 502);
  const requests: ContactChangeRequest[] = ((data ?? []) as Row[]).map((row) => ({
    commandId: row.command_id,
    entity: row.entity_type,
    contactName: row.contact_name ?? "Contact",
    state: row.state,
    requestedAt: row.requested_at,
    appliedAt: row.applied_at,
    conflictReason: row.conflict_reason,
    resolution: row.resolution,
    replacementCommandId: row.replacement_command_id,
    fields: contactConflictFields(row.requested_changes, row.current_record),
    contactActive: row.contact_id !== null,
  }));
  return reply({ requests }, 200);
}

/** Resolve one conflict: keep the desktop version, or apply my change again. */
export async function POST(request: NextRequest) {
  const ctx = await ownerContext();
  if (!ctx.ok) return ctx.response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const commandId = body?.commandId;
  const action = body?.action;
  if (typeof commandId !== "string" || !UUID.test(commandId) ||
      (action !== "keep_desktop" && action !== "apply_mine")) {
    return reply({ error: "Invalid conflict decision." }, 400);
  }
  const { data, error } = await ctx.supabase.rpc(
    action === "keep_desktop" ? "keep_desktop_contact_version" : "reapply_desktop_contact_change",
    { target_business_id: ctx.business.id, target_command_id: commandId },
  );
  if (error) {
    const [status, message] =
      error.code === "PT409" ? [409, "This conflict was already resolved another way."]
      : error.code === "23505" ? [409, "Another change to this contact is still waiting for the desktop. Try again once it is confirmed."]
      : error.code === "40001" ? [409, "The contact changed again. Refresh and review it."]
      : error.code === "23503" ? [404, "This contact is no longer active on the desktop."]
      : error.code === "55000" ? [409, "This change cannot be resolved now. Check that two-way contact editing is still enabled."]
      : error.code === "42501" ? [403, "You cannot resolve this change."]
      : [502, "The decision could not be saved."];
    return reply({ error: message }, status as number);
  }
  if (action === "keep_desktop") {
    return reply({ resolution: "kept_desktop", replacementCommandId: null }, 200);
  }
  return reply({
    resolution: data ? "reapplied" : "already_current",
    replacementCommandId: typeof data === "string" ? data : null,
    message: data
      ? "Your change was sent again. It is applied once the desktop confirms it."
      : "The desktop already has these values. Nothing needed sending.",
  }, 200);
}
