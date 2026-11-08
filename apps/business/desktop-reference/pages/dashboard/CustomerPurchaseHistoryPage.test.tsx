import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import CustomerPurchaseHistoryPage from "@/app/dashboard/CustomerPurchaseHistoryPage";

const sale = {
  id: 41,
  sale_number: "INV-041",
  customer_id: 7,
  customer_name: "Amina",
  customer_phone: "0700000000",
  cashier_name: "Cashier",
  items_count: 5,
  subtotal: 25000,
  discount_amount: 1000,
  tax_amount: 0,
  tax_classification: null,
  tax_rate: null,
  total_amount: 24000,
  amount_paid: 24000,
  change_amount: 0,
  balance_due: 0,
  payment_status: "paid",
  due_date: null,
  last_payment_at: null,
  payment_method: "cash" as const,
  status: "completed" as const,
  created_at: "2026-09-14T10:00:00Z",
};

const mocks = vi.hoisted(() => ({
  getSales: vi.fn(),
  getSale: vi.fn(),
}));

vi.mock("@/hooks/useReduxSales", () => ({
  useReduxSales: () => ({
    sales: [sale],
    loading: false,
    getSales: mocks.getSales,
    getSale: mocks.getSale,
  }),
}));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => null }));
vi.mock("@/components/metric-card", () => ({ default: () => null }));
vi.mock("@/components/data-table", () => ({
  DataTable: ({ data, actions }: { data: Array<typeof sale>; actions: Array<{ label: string; onClick: (row: typeof sale) => void }> }) => (
    <>{actions.map((action) => <button key={action.label} onClick={() => action.onClick(data[0])}>{action.label}</button>)}</>
  ),
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <>{children}</> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));
vi.mock("@/components/documents/SalePrintPreviewDialog", () => ({
  SalePrintPreviewDialog: ({ saleId, open }: { saleId: number | null; open: boolean }) => open ? <div data-testid="receipt-viewer">{saleId}</div> : null,
}));

describe("Customer purchase history", () => {
  it("loads persisted sale lines and opens the shared receipt viewer by sale id", async () => {
    mocks.getSales.mockResolvedValue([sale]);
    mocks.getSale.mockResolvedValue({
      ...sale,
      cashier_user_id: 1,
      tax_exclusive_amount: null,
      tax_inclusive_amount: null,
      payment_reference: null,
      split_payments: null,
      notes: null,
      cancelled_at: null,
      cancelled_by_user_id: null,
      cancel_reason: null,
      updated_at: sale.created_at,
      items: [
        { id: 1, product_id: 1, product_name: "Sugar", sku: "SUG", stock_unit: "kg", quantity: 2, unit_price: 5000, discount_amount: 0, tax_amount: 0, tax_classification: null, tax_rate: null, taxable_amount: null, line_total: 10000 },
        { id: 2, product_id: 2, product_name: "Rice", sku: "RIC", stock_unit: "kg", quantity: 3, unit_price: 5000, discount_amount: 1000, tax_amount: 0, tax_classification: null, tax_rate: null, taxable_amount: null, line_total: 14000 },
      ],
    });
    render(<CustomerPurchaseHistoryPage />);

    fireEvent.click(screen.getByRole("button", { name: "View purchase" }));
    await waitFor(() => expect(mocks.getSale).toHaveBeenCalledWith(41));
    expect(await screen.findByText("Sugar")).toBeInTheDocument();
    expect(screen.getByText("Rice")).toBeInTheDocument();
    expect(screen.getByText("Qty 2")).toBeInTheDocument();
    expect(screen.getByText("Qty 3")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "View receipt" }));
    expect(screen.getByTestId("receipt-viewer")).toHaveTextContent("41");
  });
});
