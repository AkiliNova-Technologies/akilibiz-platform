import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import SettingsAccountingPeriodsPage from "@/app/dashboard/SettingsAccountingPeriodsPage";

const financeMocks = vi.hoisted(() => ({ getAccountingPeriods: vi.fn() }));

vi.mock("@/components/site-header", () => ({ SiteHeader: ({ label }: { label: string }) => <h1>{label}</h1> }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }: { children: ReactNode }) => <>{children}</>, DialogContent: ({ children }: { children: ReactNode }) => <>{children}</>, DialogDescription: ({ children }: { children: ReactNode }) => <>{children}</>, DialogFooter: ({ children }: { children: ReactNode }) => <>{children}</>, DialogHeader: ({ children }: { children: ReactNode }) => <>{children}</>, DialogTitle: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock("@/hooks/usePermissions", () => ({ usePermissions: () => ({ can: () => false }) }));
vi.mock("@/services/tauri/finance", () => ({ tauriFinanceService: { getAccountingPeriods: financeMocks.getAccountingPeriods, createAccountingPeriod: vi.fn(), closeAccountingPeriod: vi.fn() } }));

describe("Settings accounting periods", () => {
  it("shows the business explanation, error state, and disables controls without period-close permission", async () => {
    financeMocks.getAccountingPeriods.mockRejectedValueOnce(new Error("Unauthorized"));
    render(<SettingsAccountingPeriodsPage />);
    expect(screen.getByText(/Closing a period stops new entries dated in that period/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Create period" })[0]).toBeDisabled();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Unauthorized"));
  });

  it("hides the open-ended sentinel date", async () => {
    financeMocks.getAccountingPeriods.mockResolvedValueOnce([{
      id: 1,
      date_from: "2026-01-01",
      date_to: "9999-12-31",
      state: "open",
      created_at: "2026-01-01T00:00:00Z",
    }]);
    render(<SettingsAccountingPeriodsPage />);

    expect(await screen.findByText(/Open-ended/)).toBeInTheDocument();
    expect(screen.queryByText(/9999/)).not.toBeInTheDocument();
  });
});
