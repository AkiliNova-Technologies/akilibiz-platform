import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { NavMain } from "@/components/nav-main";
import { SidebarProvider } from "@/components/ui/sidebar";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: () => ({
    matches: false,
    media: "",
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

const items = [
  {
    title: "Sales",
    url: "/dashboard/sales",
    items: [{ title: "Sales History", url: "/dashboard/sales/history" }],
  },
  {
    title: "Inventory",
    url: "/dashboard/inventory",
    items: [{ title: "Stock History", url: "/dashboard/inventory/history" }],
  },
];

function RouteChangeControl() {
  const navigate = useNavigate();

  return (
    <button type="button" onClick={() => navigate("/dashboard/inventory/history")}>
      Go to inventory history
    </button>
  );
}

function renderNavigation(initialEntry = "/dashboard", includeRouteChangeControl = false) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SidebarProvider>
        <NavMain items={items} />
        {includeRouteChangeControl && <RouteChangeControl />}
      </SidebarProvider>
    </MemoryRouter>,
  );
}

describe("NavMain", () => {
  it("allows an active parent to be collapsed while keeping it identifiable", () => {
    renderNavigation("/dashboard/sales/history");

    const sales = screen.getByRole("button", { name: "Sales" });
    expect(sales).toHaveAttribute("aria-expanded", "true");
    expect(sales).toHaveAttribute("data-active", "true");
    expect(screen.getByText("Sales History")).toBeInTheDocument();

    fireEvent.click(sales);

    expect(sales).toHaveAttribute("aria-expanded", "false");
    expect(sales).toHaveAttribute("data-active", "true");
    expect(screen.queryByText("Sales History")).not.toBeInTheDocument();
  });

  it("keeps at most one parent group expanded", () => {
    renderNavigation();

    const sales = screen.getByRole("button", { name: "Sales" });
    const inventory = screen.getByRole("button", { name: "Inventory" });
    fireEvent.click(sales);
    expect(sales).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(inventory);
    expect(sales).toHaveAttribute("aria-expanded", "false");
    expect(inventory).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByText("Sales History")).not.toBeInTheDocument();
    expect(screen.getByText("Stock History")).toBeInTheDocument();
  });

  it("opens the newly relevant group after route navigation without overriding a manual collapse", () => {
    renderNavigation("/dashboard/sales/history", true);

    const sales = screen.getByRole("button", { name: "Sales" });
    fireEvent.click(sales);
    expect(sales).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByRole("button", { name: "Go to inventory history" }));

    expect(sales).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Inventory" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
