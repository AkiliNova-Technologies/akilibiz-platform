import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import CustomerCreditManagementPage from "@/app/dashboard/CustomerCreditManagementPage";

const account = {
  id: 7,
  customer_name: "Amina",
  phone: "0700000000",
  credit_limit: 100000,
  outstanding_balance: 40000,
  overdue_amount: 0,
  last_payment_date: null,
  due_date: null,
  days_overdue: 0,
  risk_level: "Low" as const,
  status: "Current" as const,
};

const mocks = vi.hoisted(() => ({ getCreditAccounts: vi.fn(), getSales: vi.fn(), recordSalePayment: vi.fn(), getSalePaymentHistory: vi.fn() }));

vi.mock("@/services/tauri/sales", () => ({
  tauriSalesService: { getSalePaymentHistory: mocks.getSalePaymentHistory },
}));

vi.mock("@/hooks/useReduxCustomers", () => ({
  useReduxCustomers: () => ({ creditAccounts: [account], loading: false, getCreditAccounts: mocks.getCreditAccounts }),
}));
vi.mock("@/hooks/useReduxSales", () => ({
  useReduxSales: () => ({
    sales: [{ id: 41, sale_number: "INV-041", customer_id: 7, balance_due: 40000, status: "completed" }],
    getSales: mocks.getSales,
    recordSalePayment: mocks.recordSalePayment,
  }),
}));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => null }));
vi.mock("@/components/metric-card", () => ({ default: () => null }));
vi.mock("@/components/data-table", () => ({
  DataTable: ({ data, actions }: { data: Array<typeof account>; actions: Array<{ label: string; onClick: (row: typeof account) => void }> }) => (
    <>{actions.map((action) => <button key={action.label} onClick={() => action.onClick(data[0])}>{action.label}</button>)}</>
  ),
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <>{children}</> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

describe("Customer credit management", () => {
  it("opens a payment form for the customer's eligible outstanding sale", async () => {
    mocks.getSales.mockResolvedValue([{ id: 41, sale_number: "INV-041", customer_id: 7, balance_due: 40000, status: "completed" }]);
    render(<CustomerCreditManagementPage />);

    fireEvent.click(screen.getByRole("button", { name: "Record payment" }));
    expect(await screen.findByRole("heading", { name: "Record Payment" })).toBeInTheDocument();
    expect(mocks.getSales).toHaveBeenCalledWith({ limit: 500 });
    expect(await screen.findByLabelText("Payment amount")).toHaveValue(40000);
  });

  it("opens payment history for only the selected customer sale", async () => {
    mocks.getSales.mockResolvedValue([{ id: 41, sale_number: "INV-041", customer_id: 7, balance_due: 40000, status: "completed" }]);
    mocks.getSalePaymentHistory.mockResolvedValue([{ id: 9, payment_date: "2026-09-14", amount: 10000, payment_method: "cash", payment_reference: "REF-9", remaining_balance: 30000 }]);
    render(<CustomerCreditManagementPage />);

    fireEvent.click(screen.getByRole("button", { name: "View history" }));
    expect(await screen.findByRole("heading", { name: "Credit Payment History" })).toBeInTheDocument();
    expect(await screen.findByText("REF-9")).toBeInTheDocument();
    expect(mocks.getSalePaymentHistory).toHaveBeenCalledWith(7, 41);
  });

  it("shows explicit empty and retrieval-error history states", async () => {
    mocks.getSales.mockResolvedValue([{ id: 41, sale_number: "INV-041", customer_id: 7, balance_due: 40000, status: "completed" }]);
    mocks.getSalePaymentHistory.mockResolvedValue([]);
    const { unmount } = render(<CustomerCreditManagementPage />);
    fireEvent.click(screen.getByRole("button", { name: "View history" }));
    expect(await screen.findByText("No payments have been recorded for this credit sale.")).toBeInTheDocument();
    unmount();

    mocks.getSalePaymentHistory.mockRejectedValueOnce(new Error("unavailable"));
    render(<CustomerCreditManagementPage />);
    fireEvent.click(screen.getByRole("button", { name: "View history" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Payment history could not be loaded");
  });
});
