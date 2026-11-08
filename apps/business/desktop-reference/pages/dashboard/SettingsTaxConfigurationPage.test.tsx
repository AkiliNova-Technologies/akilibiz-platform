import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import SettingsTaxConfigurationPage from "@/app/dashboard/SettingsTaxConfigurationPage";

vi.mock("@/components/site-header", () => ({
  SiteHeader: ({ label }: { label: string }) => <h1>{label}</h1>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogDescription: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogFooter: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogHeader: ({ children }: { children: ReactNode }) => <>{children}</>,
  DialogTitle: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/useReduxSettings", () => ({
  useReduxSettings: () => ({
    taxConfig: null,
    loading: false,
    error: null,
    getTaxConfig: vi.fn(),
    saveTaxConfig: vi.fn(),
    clearError: vi.fn(),
  }),
}));

vi.mock("@/hooks/useReduxTax", () => ({
  useReduxTax: () => ({
    settings: null,
    classifications: [],
    rates: [],
    loading: false,
    error: null,
    getTaxSettings: vi.fn(),
    getTaxClassifications: vi.fn(),
    getTaxRates: vi.fn(),
    saveTaxSettings: vi.fn(),
    clearError: vi.fn(),
  }),
}));

describe("Tax settings", () => {
  it("shows the direct settings form and muted URA/EFRIS filing limitation", () => {
    render(<SettingsTaxConfigurationPage />);

    expect(screen.getAllByRole("heading", { name: "Tax Settings" })).toHaveLength(2);
    expect(screen.getByText("Choose how AkiliBiz records and shows tax on your sales and services.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "AkiliBiz records tax information but does not file tax returns or submit information to URA or EFRIS.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Charge the default tax on goods sold")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });
});
