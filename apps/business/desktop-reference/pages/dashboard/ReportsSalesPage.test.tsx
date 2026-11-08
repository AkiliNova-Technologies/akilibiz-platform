import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReportsSalesPage from "@/app/dashboard/ReportsSalesPage";
import { getSalesRegister } from "@/services/tauri/reports";

vi.mock("@/services/tauri/reports", () => ({
  getSalesRegister: vi.fn().mockResolvedValue([]),
  getSaleReportDrillDown: vi.fn(),
}));
vi.mock("@/components/site-header", () => ({ SiteHeader: () => null }));
vi.mock("@/components/metric-card", () => ({ default: () => null }));
vi.mock("@/components/data-table", () => ({ DataTable: () => null }));
vi.mock("@/components/date-range-picker", () => ({ DateRangePicker: () => null }));
vi.mock("@/components/report-period-select", () => ({
  ReportPeriodSelect: ({ onRangeChange }: { onRangeChange: (from: string, to: string) => void }) => (
    <button onClick={() => onRangeChange("2026-09-02", "2026-09-08")}>Last 7 UTC days</button>
  ),
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}));

describe("ReportsSalesPage period filter", () => {
  beforeEach(() => vi.mocked(getSalesRegister).mockClear());

  it("keeps shortcut dates as a draft until Apply period fetches them", async () => {
    render(<ReportsSalesPage />);
    await waitFor(() => expect(getSalesRegister).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Last 7 UTC days" }));
    expect(getSalesRegister).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Apply period" }));
    await waitFor(() => expect(getSalesRegister).toHaveBeenLastCalledWith({
      date_from: "2026-09-02",
      date_to: "2026-09-08",
      skip: 0,
      limit: 100,
    }));
  });
});
