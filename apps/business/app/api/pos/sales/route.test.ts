import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireActiveBusiness: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/business-context", () => ({ requireActiveBusiness: mocks.requireActiveBusiness }));
import { POST } from "./route";

const key = "22222222-2222-4222-8222-222222222222";
const productId = "11111111-1111-4111-8111-111111111111";
const payload = {
  idempotency_key: key, cash_received_ugx: 7000,
  items: [{ product_id: productId, quantity_milli: 1000 }],
};
function request(body: unknown) {
  return new NextRequest("http://localhost/api/pos/sales", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function client(options: { signedIn?: boolean; error?: { code: string } } = {}) {
  const rpc = vi.fn().mockResolvedValue(options.error ? { data: null, error: options.error } : {
    data: [{
      sale_id: productId, receipt_number: "WEB-123", total_ugx: 5000,
      change_ugx: 2000, replayed: false,
    }],
    error: null,
  });
  mocks.createClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({
      data: { user: options.signedIn === false ? null : { id: "user-a" } }, error: null,
    }) },
    rpc,
  });
  return { rpc };
}

describe("POST /api/pos/sales (gated)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireActiveBusiness.mockResolvedValue({ id: "business-a", role: "owner" });
  });

  it("checks authentication before selecting the business", async () => {
    const fixture = client({ signedIn: false });
    expect((await POST(request(payload))).status).toBe(401);
    expect(mocks.requireActiveBusiness).not.toHaveBeenCalled();
    expect(fixture.rpc).not.toHaveBeenCalled();
  });
  it("rejects client-submitted prices and forged tenant identity", async () => {
    const fixture = client();
    expect((await POST(request({ ...payload, business_id: "other" }))).status).toBe(400);
    expect((await POST(request({ ...payload, items: [{ ...payload.items[0], unit_price_ugx: 1 }] }))).status).toBe(400);
    expect(fixture.rpc).not.toHaveBeenCalled();
  });
  it("rejects roles without sales authorization", async () => {
    const fixture = client();
    mocks.requireActiveBusiness.mockResolvedValue({ id: "business-a", role: "accountant" });
    expect((await POST(request(payload))).status).toBe(403);
    expect(fixture.rpc).not.toHaveBeenCalled();
  });
  it("uses only verified active business and strict RPC values", async () => {
    const fixture = client();
    const response = await POST(request(payload));
    expect(response.status).toBe(200);
    expect(fixture.rpc).toHaveBeenCalledWith("post_web_pos_cash_sale", {
      target_business_id: "business-a", request_id: key,
      sale_items: payload.items, cash_received_ugx: 7000,
    });
    expect(await response.json()).toMatchObject({
      sale_id: productId, total_ugx: 5000, status: "pending_desktop",
    });
  });
  it("returns 423 if the database posting switch remains off", async () => {
    const fixture = client({ error: { code: "55000" } });
    const response = await POST(request(payload));
    expect(response.status).toBe(423);
    expect(fixture.rpc).toHaveBeenCalledOnce();
    expect(await response.json()).toMatchObject({
      error: "Web sale posting is not yet available for this business.",
    });
  });
  it("fails closed on unavailable inventory or database failures", async () => {
    client({ error: { code: "23514" } });
    expect((await POST(request(payload))).status).toBe(409);
    client({ error: { code: "PGRST202" } });
    expect((await POST(request(payload))).status).toBe(503);
  });
});
