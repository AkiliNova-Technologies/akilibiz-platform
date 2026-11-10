import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  requireActiveBusiness: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/business-context", () => ({
  requireActiveBusiness: mocks.requireActiveBusiness,
}));

import { GET } from "./route";

type QueryResult = {
  data?: unknown;
  error?: { code?: string; message?: string } | null;
  count?: number | null;
};

function builder(result: QueryResult) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    range: vi.fn().mockResolvedValue(result),
    limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    // Count-only (head:true) reads are awaited directly after their filters.
    then: (resolve: (value: QueryResult) => unknown, reject?: (error: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.limit.mockReturnValue(query);
  return query;
}

function setup(page: QueryResult, count?: QueryResult, publication: QueryResult = {
  data: { captured_at: "2026-11-10T06:00:00Z" }, error: null,
}) {
  const pageQuery = builder(page);
  const publicationQuery = builder(publication);
  const countQuery = builder(count ?? { count: 1, error: null });
  const from = vi.fn()
    .mockReturnValueOnce(pageQuery)
    .mockReturnValueOnce(publicationQuery)
    .mockReturnValueOnce(countQuery);
  mocks.createClient.mockResolvedValue({ from });
  return { from, pageQuery, publicationQuery, countQuery };
}

const request = (page: number) =>
  new NextRequest(`http://localhost/api/financial-mirrors?entity=finance_transactions&page=${page}&pageSize=1`);

describe("GET /api/financial-mirrors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireActiveBusiness.mockResolvedValue({ id: "business-a", role: "owner" });
  });

  it("returns the first financial page without an extra count query", async () => {
    const fixture = setup({
      data: [{ local_record_id: 10, record: { amount_ugx: 25000 }, captured_at: "2026-11-10T06:00:00Z" }],
      count: 1,
      error: null,
    });
    const response = await GET(request(1));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      entity: "finance_transactions", total: 1, page: 1, pageSize: 1,
      rows: [{ localRecordId: 10, record: { amount_ugx: 25000 } }],
      readOnly: true,
    });
    expect(fixture.from).toHaveBeenCalledTimes(2);
    expect(fixture.pageQuery.eq).toHaveBeenCalledWith("business_id", "business-a");
  });

  it("treats a confirmed out-of-range PGRST103 as an empty page while retaining the sync timestamp", async () => {
    const fixture = setup(
      { data: null, error: { code: "PGRST103", message: "Requested range not satisfiable" }, count: null },
      { count: 1, error: null },
    );
    const response = await GET(request(99));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      page: 99, pageSize: 1, total: 1, rows: [], readOnly: true,
      lastSuccessfulSync: "2026-11-10T06:00:00Z",
    });
    expect(fixture.countQuery.select).toHaveBeenCalledWith("local_record_id", {
      count: "exact", head: true,
    });
    expect(fixture.countQuery.eq).toHaveBeenCalledWith("business_id", "business-a");
    expect(fixture.countQuery.eq).toHaveBeenCalledWith("entity_type", "finance_transactions");
  });

  it("does not turn unrelated database errors into empty pages", async () => {
    const fixture = setup({ data: null, error: { code: "PGRST002" }, count: null });
    const response = await GET(request(99));
    expect(response.status).toBe(502);
    expect(fixture.from).toHaveBeenCalledTimes(2);
  });

  it("does not silently mask a failed count query", async () => {
    setup(
      { data: null, error: { code: "PGRST103" }, count: null },
      { count: null, error: { code: "PGRST002" } },
    );
    expect((await GET(request(99))).status).toBe(502);
  });

  it("does not hide an inconsistent range error when the offset is inside the counted rows", async () => {
    setup(
      { data: null, error: { code: "PGRST103" }, count: null },
      { count: 100, error: null },
    );
    expect((await GET(request(99))).status).toBe(502);
  });

  it("serves owner-only receipt snapshots from the same tenant-scoped read model", async () => {
    const fixture = setup({
      data: [{ local_record_id: 1, record: { business_header: "Shop" }, captured_at: "2026-11-10T06:00:00Z" }],
      count: 1, error: null,
    });
    const response = await GET(new NextRequest("http://localhost/api/financial-mirrors?entity=receipt_settings"));
    expect(response.status).toBe(200);
    expect((await response.json()).rows).toHaveLength(1);
    expect(fixture.pageQuery.eq).toHaveBeenCalledWith("business_id", "business-a");
    expect(fixture.pageQuery.eq).toHaveBeenCalledWith("entity_type", "receipt_settings");
  });

  it("keeps role restrictions before querying hosted data", async () => {
    mocks.requireActiveBusiness.mockResolvedValue({ id: "business-a", role: "cashier" });
    const fixture = setup({ data: [], count: 0, error: null });
    expect((await GET(request(1))).status).toBe(403);
    expect(fixture.from).not.toHaveBeenCalled();
  });
});
