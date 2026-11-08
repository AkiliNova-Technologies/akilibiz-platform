import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/dashboard/DashboardPage";
import { getDashboardOverview } from "@/services/tauri/dashboard";

vi.mock("@/services/tauri/dashboard", () => ({
  getDashboardOverview: vi.fn().mockResolvedValue({
    date_from_utc: "2026-09-08",
    date_to_utc: "2026-09-08",
    completed_sales_total_ugx: 0,
    completed_order_count: 0,
    customers_count: 0,
    stock_on_hand_product_count: 0,
    low_stock_product_count: 0,
    out_of_stock_product_count: 0,
    inventory_value_ugx: null,
    inventory_unvalued_count: 0,
    recent_sales: [],
    payment_methods: [],
    top_products: [],
    staff_performance: [],
  }),
}));

vi.mock("@/components/date-range-picker", () => ({
  DateRangePicker: ({ onRangeChange }: { onRangeChange: (from: string, to: string) => void }) => (
    <button onClick={() => onRangeChange("2026-09-02", "2026-09-08")}>Choose last 7 days</button>
  ),
}));

vi.mock("@/components/site-header", () => ({ SiteHeader: () => null }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, onValueChange }: { children: ReactNode; onValueChange?: (value: string) => void }) => <div><button onClick={() => onValueChange?.("7")}>Last 7 UTC days</button>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

describe("DashboardPage period filter", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-09-08T12:00:00Z"));
    vi.mocked(getDashboardOverview).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not query a draft range until Apply period is clicked", async () => {
    render(<DashboardPage />);
    await vi.waitFor(() => expect(getDashboardOverview).toHaveBeenCalledTimes(1));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Choose last 7 days" }));
    });
    expect(getDashboardOverview).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Apply period" }));
    });
    await vi.waitFor(() => expect(getDashboardOverview).toHaveBeenLastCalledWith({
      date_from: "2026-09-02",
      date_to: "2026-09-08",
    }));
  });

  it("keeps an observation-window shortcut as a draft until Apply", async () => {
    render(<DashboardPage />);
    await vi.waitFor(() => expect(getDashboardOverview).toHaveBeenCalledTimes(1));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Last 7 UTC days" }));
    });
    expect(getDashboardOverview).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Apply period" }));
    });
    await vi.waitFor(() => expect(getDashboardOverview).toHaveBeenLastCalledWith({
      date_from: "2026-09-02",
      date_to: "2026-09-08",
    }));
  });
});
