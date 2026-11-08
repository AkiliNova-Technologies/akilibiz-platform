import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReportsFinancialPage from "./ReportsFinancialPage";
import {
  getAuthoritativeAccountDrillDown,
  getAuthoritativeBalanceSheet,
  getAuthoritativeTrialBalance,
} from "@/services/tauri/reports";

vi.mock("@/components/site-header", () => ({ SiteHeader: () => null }));
vi.mock("@/components/date-range-picker", () => ({ DateRangePicker: () => null }));
vi.mock("@/components/report-period-select", () => ({ ReportPeriodSelect: () => null }));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div role="dialog">{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogClose: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/data-table", () => ({
  DataTable: ({ data, onRowClick }: { data: Array<{ id: number; label: string }>; onRowClick: (row: unknown) => void }) => (
    <div>{data.map((row) => <button key={row.id} onClick={() => onRowClick(row)}>{row.label}</button>)}</div>
  ),
}));
vi.mock("@/services/tauri/reports", () => ({
  getAuthoritativeTrialBalance: vi.fn(), getAuthoritativeBalanceSheet: vi.fn(), getAuthoritativeAccountDrillDown: vi.fn(),
  getOpenReceivables: vi.fn().mockResolvedValue([]), getOpenPayables: vi.fn().mockResolvedValue([]), getTaxTransactionRegister: vi.fn().mockResolvedValue([]), getJournalRegister: vi.fn().mockResolvedValue([]),
  getAuthoritativeGrossProfit: vi.fn().mockResolvedValue({}), getAuthoritativeProfitLoss: vi.fn().mockResolvedValue({ revenue_ugx: null }), getAuthoritativeProfitLossDrillDown: vi.fn().mockResolvedValue([]), getTrialBalance: vi.fn().mockResolvedValue({ rows: [] }),
  getCustomerReceivableDrillDown: vi.fn(), getSupplierPayableDrillDown: vi.fn(), getTaxTransactionDrillDown: vi.fn(), getJournalEntryDrillDown: vi.fn(), getAccountGeneralLedger: vi.fn(),
}));

const trialReport = { as_of_date_utc: "2026-01-31T23:59:59.999Z", authoritative_cutover_date: "2026-01-01", coverage_status: "complete", coverage_reasons: [], included_source_types: ["sale"], excluded_source_types: ["finance_transactions", "unposted_journals"], total_debit_ugx: 100, total_credit_ugx: 100, balances_equal: true, rows: [{ account_id: 1, account_code: "1000", account_name: "Cash", account_type: "asset", total_debit_ugx: 100, total_credit_ugx: 0, debit_balance_ugx: 100, credit_balance_ugx: 0 }] };
const balanceSheetReport = { as_of_date_utc: "2026-01-31T23:59:59.999Z", authoritative_cutover_date: "2026-01-01", coverage_status: "complete", coverage_reasons: [], assets: [{ account_id: 1, account_code: "1000", account_name: "Cash", amount_ugx: 100 }], liabilities: [], equity: [], total_assets_ugx: 100, total_liabilities_ugx: 0, total_equity_ugx: 100, total_liabilities_and_equity_ugx: 100, equation_balances: true };
const firstPage = [{ effective_date_utc: "2026-01-31T00:00:00.000Z", journal_entry_id: 9, journal_number: "JRN-001", line_number: 1, source_type: "expense", source_reference: "EXP-1", description: "Cash expense", debit_ugx: 100, credit_ugx: 0 }];
const secondPage = [{ effective_date_utc: "2026-01-30T00:00:00.000Z", journal_entry_id: 8, journal_number: "JRN-000", line_number: 1, source_type: "expense", source_reference: "EXP-0", description: "Earlier expense", debit_ugx: 50, credit_ugx: 0 }];

function renderPage() { return render(<ReportsFinancialPage />); }
async function applyAsOf(tab: "Authoritative Trial" | "Balance Sheet", date = "2026-01-31") {
  const trigger = screen.getByRole("tab", { name: tab });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.mouseDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.click(trigger);
  await waitFor(() => expect(trigger).toHaveAttribute("data-state", "active"));
  const input = await screen.findByLabelText("As of date (UTC)");
  fireEvent.change(input, { target: { value: date } });
  fireEvent.click(screen.getByRole("button", { name: "Apply as of date" }));
}

describe("ReportsFinancialPage Phase 3C", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthoritativeTrialBalance).mockResolvedValue(trialReport as never);
    vi.mocked(getAuthoritativeBalanceSheet).mockResolvedValue(balanceSheetReport as never);
    vi.mocked(getAuthoritativeAccountDrillDown).mockResolvedValueOnce(firstPage as never).mockResolvedValueOnce(secondPage as never);
  });

  it("renders Trial Balance, applies its as-of date, and pages its drill-down", async () => {
    renderPage(); await applyAsOf("Authoritative Trial");
    await waitFor(() => expect(getAuthoritativeTrialBalance).toHaveBeenCalledWith({ as_of_date: "2026-01-31" }));
    expect(await screen.findByText("1000 · Cash")).toBeInTheDocument();
    expect(screen.getByText(/Total debit:/)).toHaveTextContent("100");
    fireEvent.click(screen.getByText("1000 · Cash"));
    await waitFor(() => expect(getAuthoritativeAccountDrillDown).toHaveBeenCalledWith({ account_id: 1, as_of_date: "2026-01-31", skip: 0, limit: 20 }));
    expect(await screen.findByRole("button", { name: "Next" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(getAuthoritativeAccountDrillDown).toHaveBeenLastCalledWith({ account_id: 1, as_of_date: "2026-01-31", skip: 20, limit: 20 }));
  });

  it("renders Balance Sheet, applies its as-of date, and opens its account drill-down", async () => {
    renderPage(); await applyAsOf("Balance Sheet");
    await waitFor(() => expect(getAuthoritativeBalanceSheet).toHaveBeenCalledWith({ as_of_date: "2026-01-31" }));
    expect(await screen.findByText("Asset · 1000 · Cash")).toBeInTheDocument();
    expect(screen.getByText(/Assets:/)).toHaveTextContent("100");
    fireEvent.click(screen.getByText("Asset · 1000 · Cash"));
    await waitFor(() => expect(getAuthoritativeAccountDrillDown).toHaveBeenCalledWith({ account_id: 1, as_of_date: "2026-01-31", skip: 0, limit: 20 }));
    expect(await screen.findByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("shows loading while an authoritative request is pending", async () => {
    vi.mocked(getAuthoritativeTrialBalance).mockImplementation(() => new Promise(() => {}));
    renderPage(); await applyAsOf("Authoritative Trial");
    await waitFor(() => expect(screen.getByRole("button", { name: "Apply as of date" })).toBeDisabled());
  });

  it("shows an authoritative API error", async () => {
    vi.mocked(getAuthoritativeTrialBalance).mockRejectedValueOnce(new Error("Report unavailable"));
    renderPage(); await applyAsOf("Authoritative Trial");
    expect(await screen.findByText("Report unavailable")).toBeInTheDocument();
  });

  it("shows explicit unavailable or incomplete coverage", async () => {
    vi.mocked(getAuthoritativeTrialBalance).mockResolvedValueOnce({ ...trialReport, coverage_status: "unavailable_pre_cutover", coverage_reasons: ["As-of date predates authoritative cutover."], total_debit_ugx: null, total_credit_ugx: null, balances_equal: null, rows: [] } as never);
    renderPage(); await applyAsOf("Authoritative Trial", "2025-12-31");
    expect(await screen.findByText(/Unavailable\/incomplete: As-of date predates authoritative cutover/)).toBeInTheDocument();
  });
});
