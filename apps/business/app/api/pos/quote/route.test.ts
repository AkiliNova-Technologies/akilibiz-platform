import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireActiveBusiness: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/business-context", () => ({ requireActiveBusiness: mocks.requireActiveBusiness }));
import { POST } from "./route";

const productId = "11111111-1111-4111-8111-111111111111";
const request = (body: unknown) => new NextRequest("http://localhost/api/pos/quote", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

function client(options: { user?: boolean; productError?: boolean; inventoryError?: boolean } = {}) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn().mockResolvedValue({
      data: [{ id: productId, name: "Flour", selling_price_ugx: 4000, is_active: true }],
      error: options.productError ? { code: "PGRST002" } : null,
    }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const from = vi.fn().mockReturnValue(query);
  const rpc = vi.fn().mockResolvedValue({
    data: [{ product_id: productId, on_hand_milli: 4000, reserved_milli: 0,
      damaged_milli: 0, is_current: true }],
    error: options.inventoryError ? { code: "PGRST002" } : null,
  });
  mocks.createClient.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({
      data: { user: options.user === false ? null : { id: "user-a" } }, error: null,
    }) },
    from, rpc,
  });
  return { from, rpc, query };
}

describe("POST /api/pos/quote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireActiveBusiness.mockResolvedValue({ id: "business-a", role: "owner" });
  });

  it("rejects unauthorized callers before reading business data", async () => {
    const fixture = client({ user: false });
    const response = await POST(request({ items: [{ product_id: productId, quantity_milli: 1000 }] }));
    expect(response.status).toBe(401);
    expect(fixture.from).not.toHaveBeenCalled();
    expect(mocks.requireActiveBusiness).not.toHaveBeenCalled();
  });

  it("returns read-only quoted values with business-scoped catalogue and inventory", async () => {
    const fixture = client();
    const response = await POST(request({ items: [{ product_id: productId, quantity_milli: 1000 }] }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      business_id: "business-a", subtotal_ugx: 4000, currency: "UGX",
      read_only: true, checkout_enabled: false,
    });
    expect(fixture.query.eq).toHaveBeenCalledWith("business_id", "business-a");
    expect(fixture.rpc).toHaveBeenCalledWith("list_desktop_effective_inventory", {
      target_business_id: "business-a",
    });
  });

  it("rejects invalid payloads without querying inventory", async () => {
    const fixture = client();
    expect((await POST(request({ items: [{ product_id: productId, quantity_milli: -1 }] }))).status)
      .toBe(400);
    expect(fixture.rpc).not.toHaveBeenCalled();
  });

  it("does not treat database errors as zero stock or successful quotes", async () => {
    const fixture = client({ inventoryError: true });
    expect((await POST(request({ items: [{ product_id: productId, quantity_milli: 1000 }] }))).status)
      .toBe(503);
    expect(fixture.from).toHaveBeenCalledOnce();
  });

  it("refuses overselling instead of posting a sale", async () => {
    client();
    const response = await POST(request({ items: [{ product_id: productId, quantity_milli: 5000 }] }));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ reason: "INSUFFICIENT_STOCK" });
  });
});
