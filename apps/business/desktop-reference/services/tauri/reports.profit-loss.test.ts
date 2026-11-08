import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { getAuthoritativeProfitLoss, getAuthoritativeProfitLossDrillDown, getAuthoritativeTrialBalance, getAuthoritativeBalanceSheet, getAuthoritativeAccountDrillDown } from "./reports";

describe("authoritative P&L UI API contract", () => {
  beforeEach(() => invoke.mockReset());

  it("sends an explicit inclusive date range to the journal-only summary", async () => {
    invoke.mockResolvedValue({ coverage_complete: true });
    await getAuthoritativeProfitLoss({ date_from: "2026-01-01", date_to: "2026-01-31" });
    expect(invoke).toHaveBeenCalledWith("get_authoritative_profit_loss", { query: { date_from: "2026-01-01", date_to: "2026-01-31" } });
  });

  it("requests only an allowed backend drill-down section with pagination", async () => {
    invoke.mockResolvedValue([]);
    await getAuthoritativeProfitLossDrillDown({ date_from: "2026-01-01", date_to: "2026-01-31", section: "operating_expenses", skip: 20, limit: 20 });
    expect(invoke).toHaveBeenCalledWith("get_authoritative_profit_loss_drill_down", { query: expect.objectContaining({ section: "operating_expenses", skip: 20, limit: 20 }) });
  });

  it("uses explicit as-of dates for authoritative Trial Balance and Balance Sheet", async () => {
    invoke.mockResolvedValue({ coverage_status: "complete" });
    await getAuthoritativeTrialBalance({ as_of_date: "2026-01-31" });
    await getAuthoritativeBalanceSheet({ as_of_date: "2026-01-31" });
    expect(invoke).toHaveBeenNthCalledWith(1, "get_authoritative_trial_balance", { query: { as_of_date: "2026-01-31" } });
    expect(invoke).toHaveBeenNthCalledWith(2, "get_authoritative_balance_sheet", { query: { as_of_date: "2026-01-31" } });
  });
  it("keeps account drill-down paging server-side", async () => {
    invoke.mockResolvedValue([]);
    await getAuthoritativeAccountDrillDown({ account_id: 12, as_of_date: "2026-01-31", skip: 20, limit: 20 });
    expect(invoke).toHaveBeenCalledWith("get_authoritative_account_drill_down", { query: { account_id: 12, as_of_date: "2026-01-31", skip: 20, limit: 20 } });
  });
});
