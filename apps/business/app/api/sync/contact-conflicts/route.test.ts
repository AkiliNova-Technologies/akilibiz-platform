import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), requireActiveBusiness: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/business-context", () => ({ requireActiveBusiness: mocks.requireActiveBusiness }));
import { GET, POST } from "./route";

const commandId = "11111111-1111-4111-8111-111111111111";
const post = (body: unknown) => new NextRequest("http://localhost/api/sync/contact-conflicts", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});
function client(rpcResult: { data?: unknown; error?: { code: string } | null }) {
  const rpc = vi.fn().mockResolvedValue({ data: rpcResult.data ?? null, error: rpcResult.error ?? null });
  mocks.createClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "owner-a" } }, error: null }) },
    rpc,
  });
  return rpc;
}

describe("/api/sync/contact-conflicts", () => {
  const old = process.env.AKILIBIZ_ENABLE_BIDIRECTIONAL_CONTACTS;
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AKILIBIZ_ENABLE_BIDIRECTIONAL_CONTACTS = "1";
    mocks.requireActiveBusiness.mockResolvedValue({ id: "business-a", role: "owner" });
  });
  afterEach(() => {
    if (old === undefined) delete process.env.AKILIBIZ_ENABLE_BIDIRECTIONAL_CONTACTS;
    else process.env.AKILIBIZ_ENABLE_BIDIRECTIONAL_CONTACTS = old;
  });

  it("is unavailable while two-way contact editing is off", async () => {
    delete process.env.AKILIBIZ_ENABLE_BIDIRECTIONAL_CONTACTS;
    const rpc = client({});
    expect((await GET()).status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("is owner-only", async () => {
    mocks.requireActiveBusiness.mockResolvedValue({ id: "business-a", role: "manager" });
    const rpc = client({});
    expect((await POST(post({ commandId, action: "keep_desktop" }))).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("lists changes with field-by-field desktop values", async () => {
    const rpc = client({ data: [{
      command_id: commandId, entity_type: "supplier", contact_id: "c1", contact_name: "Mill",
      state: "conflict", requested_at: "2026-11-27T10:00:00Z", applied_at: null,
      conflict_reason: "Local record version changed",
      requested_changes: { contact_person: "Web Person" },
      current_record: { contact_person: "Desk Person" },
      resolution: null, replacement_command_id: null,
    }] });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("list_desktop_contact_change_requests", { target_business_id: "business-a" });
    expect((await response.json()).requests[0]).toMatchObject({
      commandId, state: "conflict", resolution: null, contactActive: true,
      fields: [{ field: "contact_person", mine: "Web Person", desktop: "Desk Person", differs: true }],
    });
  });

  it("keeps the desktop version", async () => {
    const rpc = client({ data: "kept_desktop" });
    const response = await POST(post({ commandId, action: "keep_desktop" }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("keep_desktop_contact_version", { target_business_id: "business-a", target_command_id: commandId });
    expect(await response.json()).toMatchObject({ resolution: "kept_desktop" });
  });

  it("re-applies the owner's change, or reports it is already current", async () => {
    client({ data: "22222222-2222-4222-8222-222222222222" });
    expect(await (await POST(post({ commandId, action: "apply_mine" }))).json())
      .toMatchObject({ resolution: "reapplied", replacementCommandId: "22222222-2222-4222-8222-222222222222" });
    client({ data: null });
    expect(await (await POST(post({ commandId, action: "apply_mine" }))).json())
      .toMatchObject({ resolution: "already_current", replacementCommandId: null });
  });

  it("explains refusals instead of failing silently", async () => {
    client({ error: { code: "PT409" } });
    expect((await POST(post({ commandId, action: "apply_mine" }))).status).toBe(409);
    client({ error: { code: "23503" } });
    expect((await POST(post({ commandId, action: "apply_mine" }))).status).toBe(404);
    client({});
    expect((await POST(post({ commandId: "bad", action: "apply_mine" }))).status).toBe(400);
  });
});

describe("/api/sync/contact-conflicts expiry and recovery", () => {
  const old = process.env.AKILIBIZ_ENABLE_BIDIRECTIONAL_CONTACTS;
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AKILIBIZ_ENABLE_BIDIRECTIONAL_CONTACTS = "1";
    mocks.requireActiveBusiness.mockResolvedValue({ id: "business-a", role: "owner" });
  });
  afterEach(() => {
    if (old === undefined) delete process.env.AKILIBIZ_ENABLE_BIDIRECTIONAL_CONTACTS;
    else process.env.AKILIBIZ_ENABLE_BIDIRECTIONAL_CONTACTS = old;
  });

  it("withdraws a waiting change and explains a change already handled", async () => {
    const rpc = client({ data: "withdrawn" });
    const response = await POST(post({ commandId, action: "withdraw" }));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("withdraw_desktop_contact_change", { target_business_id: "business-a", target_command_id: commandId });
    client({ error: { code: "55000" } });
    const refused = await POST(post({ commandId, action: "withdraw" }));
    expect(refused.status).toBe(409);
    expect((await refused.json()).error).toMatch(/already been handled/);
  });

  it("resends an expired change, or reports it is already current", async () => {
    const rpc = client({ data: "33333333-3333-4333-8333-333333333333" });
    expect(await (await POST(post({ commandId, action: "resend" }))).json())
      .toMatchObject({ state: "resent", replacementCommandId: "33333333-3333-4333-8333-333333333333" });
    expect(rpc).toHaveBeenCalledWith("resend_desktop_contact_change", { target_business_id: "business-a", target_command_id: commandId });
    client({ data: null });
    expect(await (await POST(post({ commandId, action: "resend" }))).json())
      .toMatchObject({ state: "already_current" });
  });
});
