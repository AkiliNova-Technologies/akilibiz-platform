import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import FinanceExpensesPage from "@/app/dashboard/FinanceExpensesPage";

vi.mock("@/components/site-header", () => ({ SiteHeader: ({ label }: { label: string }) => <h1>{label}</h1> }));
vi.mock("@/components/data-table", () => ({ DataTable: ({ title, description, toolbarFilters, toolbarActions }: { title?: string; description?: string; toolbarFilters?: ReactNode; toolbarActions?: ReactNode }) => <section><h2>{title}</h2><p>{description}</p><div>{toolbarFilters}</div><div>{toolbarActions}</div></section> }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }: { children: ReactNode }) => <>{children}</>, DialogContent: ({ children }: { children: ReactNode }) => <>{children}</>, DialogDescription: ({ children }: { children: ReactNode }) => <>{children}</>, DialogFooter: ({ children }: { children: ReactNode }) => <>{children}</>, DialogHeader: ({ children }: { children: ReactNode }) => <>{children}</>, DialogTitle: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/hooks/useReduxFinance", () => ({ useReduxFinance: () => ({ expenseEntries: [], expenseSummary: null, expenseCategories: [], loading: false, error: null, refreshExpenses: vi.fn().mockResolvedValue(undefined), clearError: vi.fn() }) }));
vi.mock("@/services/tauri/finance", () => ({ tauriFinanceService: { getAuthoritativeExpenses: vi.fn().mockResolvedValue([]), getAuthoritativeExpense: vi.fn(), createAuthoritativeExpense: vi.fn(), settleExpensePayable: vi.fn(), voidAuthoritativeExpense: vi.fn() } }));
vi.mock("@/services/tauri/suppliers", () => ({ tauriSuppliersService: { getSuppliers: vi.fn().mockResolvedValue([]) } }));

describe("Expenses", () => {
  it("uses a single owner-facing primary expenses table and action wording", async () => {
    render(<FinanceExpensesPage />);

    expect(screen.getAllByRole("heading", { name: "Expenses" })).toHaveLength(3);
    expect(screen.getByText("Record, review and manage business expenses.")).toBeInTheDocument();
    expect(screen.getAllByText("Earlier expense records")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Record expense" })).toBeInTheDocument();
    expect(screen.queryByText(/Legacy Expenses|Authoritative Expenses|Phase 3A3/i)).not.toBeInTheDocument();
  });
});
