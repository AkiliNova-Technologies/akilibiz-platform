import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireActiveBusiness: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/business-context", () => ({
  requireActiveBusiness: mocks.requireActiveBusiness,
}));

import { GET } from "./route";

function queryResult(data: unknown[], error: unknown = null) {
  const order = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  return { select, eq, order };
}

function clientFor(options?: { authenticated?: boolean; productError?: unknown }) {
  const categories = queryResult([
    { id: "category-a", name: "Food", is_active: true },
  ]);
  const products = queryResult([
    {
      id: "product-a",
      name: "Flour",
      sku: "FLR-1",
      category_id: "category-a",
      selling_price_ugx: 4_000,
      stock_unit: "kg",
      is_active: true,
    },
  ], options?.productError);
  const rpc = vi.fn().mockResolvedValue({
    data: [{ product_id: "product-a", on_hand_milli: 2_500, reserved_milli: 0, damaged_milli: 0, is_current: true }],
    error: null,
  });
  const from = vi.fn((table: string) =>
    table === "desktop_categories" ? categories : products,
  );
  return {
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue(
          options?.authenticated === false
            ? { data: { user: null }, error: null }
            : { data: { user: { id: "user-a" } }, error: null },
        ),
      },
      from,
      rpc,
    },
    categories,
    products,
    rpc,
  };
}

describe("GET /api/pos/catalogue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireActiveBusiness.mockResolvedValue({
      id: "business-a",
      name: "Business A",
      role: "owner",
    });
  });

  it("rejects unauthenticated requests before reading business data", async () => {
    const fixture = clientFor({ authenticated: false });
    mocks.createClient.mockResolvedValue(fixture.client);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(fixture.client.from).not.toHaveBeenCalled();
    expect(mocks.requireActiveBusiness).not.toHaveBeenCalled();
  });

  it("scopes products, categories, and effective inventory to the active business", async () => {
    const fixture = clientFor();
    mocks.createClient.mockResolvedValue(fixture.client);
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(fixture.categories.eq).toHaveBeenCalledWith("business_id", "business-a");
    expect(fixture.products.eq).toHaveBeenCalledWith("business_id", "business-a");
    expect(fixture.rpc).toHaveBeenCalledWith("list_desktop_effective_inventory", {
      target_business_id: "business-a",
    });
    expect(body).toMatchObject({
      business_id: "business-a",
      products: [{ id: "product-a", stock_quantity: 2.5 }],
    });
  });

  it("uses the newly authorized tenant after a business switch", async () => {
    const fixture = clientFor();
    mocks.createClient.mockResolvedValue(fixture.client);
    mocks.requireActiveBusiness.mockResolvedValue({
      id: "business-b",
      name: "Business B",
      role: "owner",
    });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(fixture.products.eq).toHaveBeenCalledWith("business_id", "business-b");
    expect(fixture.rpc).toHaveBeenCalledWith("list_desktop_effective_inventory", {
      target_business_id: "business-b",
    });
  });

  it("returns a database failure distinctly from an empty catalogue", async () => {
    const fixture = clientFor({ productError: { message: "database unavailable" } });
    mocks.createClient.mockResolvedValue(fixture.client);
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "The synchronized catalogue could not be loaded.",
    });
  });
});
