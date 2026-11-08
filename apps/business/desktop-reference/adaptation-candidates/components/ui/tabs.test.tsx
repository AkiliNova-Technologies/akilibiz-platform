import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function ReportTabsFixture() {
  const [tab, setTab] = React.useState("stock");
  const [filter, setFilter] = React.useState("");
  return (
    <>
      <input aria-label="Report filter" value={filter} onChange={(event) => setFilter(event.target.value)} />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList><TabsTrigger value="stock">Stock</TabsTrigger><TabsTrigger value="movements">Movements</TabsTrigger><TabsTrigger value="valuation">Valuation</TabsTrigger></TabsList>
        <TabsContent value="stock">Stock panel {filter}</TabsContent>
        <TabsContent value="movements">Movements panel {filter}</TabsContent>
        <TabsContent value="valuation">Valuation panel {filter}</TabsContent>
      </Tabs>
    </>
  );
}

describe("report tabs", () => {
  it("shows only the selected report panel and keeps that rule after a filter update", () => {
    render(<ReportTabsFixture />);
    expect(screen.getByText("Stock panel")).toBeVisible();
    expect(screen.queryByText("Movements panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Valuation panel")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Report filter"), { target: { value: "September" } });
    expect(screen.getByText("Stock panel September")).toBeVisible();
    expect(screen.queryByText("Movements panel September")).not.toBeInTheDocument();
    expect(screen.queryByText("Valuation panel September")).not.toBeInTheDocument();
  });

  it("switches selected state and visible content together", () => {
    render(<ReportTabsFixture />);
    const movements = screen.getByRole("tab", { name: "Movements" });
    fireEvent.mouseDown(movements, { button: 0, ctrlKey: false });
    fireEvent.click(movements);
    expect(screen.getByRole("tab", { name: "Movements" })).toHaveAttribute("data-state", "active");
    expect(screen.getByText("Movements panel")).toBeVisible();
    expect(screen.queryByText("Stock panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Valuation panel")).not.toBeInTheDocument();
  });
});
