import { describe, expect, it, vi, beforeEach } from "vitest";
const rpc = vi.fn(),
  getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, rpc }),
}));
vi.mock("@/lib/business-context", () => ({
  requireActiveBusiness: async () => ({ id: "b", role: "owner" }),
}));
describe("expense request API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AKILIBIZ_ENABLE_WEB_EXPENSE_REQUESTS = "1";
    getUser.mockResolvedValue({ data: { user: { id: "u" } } });
    rpc.mockResolvedValue({ data: "command", error: null });
  });
  it("lists request status", async () => {
    const { GET } = await import("./route");
    expect((await GET()).status).toBe(200);
  });
  it("rejects malformed commands", async () => {
    const { POST } = await import("./route");
    expect(
      (
        await POST(
          new Request("http://x", { method: "POST", body: "{}" }) as never,
        )
      ).status,
    ).toBe(400);
  });
  it("submits immutable creation", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({
          requestId: "11111111-1111-4111-8111-111111111111",
          sourceBusinessPublicId: "local",
          operation: "create",
          expense: { category_id: 1 },
        }),
      }) as never,
    );
    expect(response.status).toBe(202);
    expect(rpc).toHaveBeenCalledWith(
      "request_desktop_expense_creation",
      expect.objectContaining({
        request_id: "11111111-1111-4111-8111-111111111111",
      }),
    );
  });
});
