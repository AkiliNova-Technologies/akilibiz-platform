import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "@/components/data-table";
import localeReducer from "@/redux/slices/localeSlice";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

describe("DataTable", () => {
  it("uses centralized English defaults for an empty table", () => {
    const store = configureStore({ reducer: { locale: localeReducer } });

    render(
      <Provider store={store}>
        <DataTable data={[]} fields={[]} enablePagination={false} />
      </Provider>,
    );

    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    expect(screen.getByText("No results.")).toBeInTheDocument();
    expect(screen.getByText("Columns")).toBeInTheDocument();
  });

  it("renders keyboard-accessible help only when a table opts in", () => {
    const store = configureStore({ reducer: { locale: localeReducer } });

    render(
      <Provider store={store}>
        <DataTable
          title="Sales History"
          helpText="Shows recorded sales for the selected filters."
          data={[]}
          fields={[]}
          enablePagination={false}
        />
      </Provider>,
    );

    const helpTrigger = screen.getByRole("button", {
      name: "About Sales History",
    });
    fireEvent.focus(helpTrigger);
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Shows recorded sales for the selected filters.",
    );
  });

  it("does not render a help trigger without help text", () => {
    const store = configureStore({ reducer: { locale: localeReducer } });

    render(
      <Provider store={store}>
        <DataTable title="Sales History" data={[]} fields={[]} enablePagination={false} />
      </Provider>,
    );

    expect(
      screen.queryByRole("button", { name: "About Sales History" }),
    ).not.toBeInTheDocument();
  });

  it("keeps refresh beside table controls without resetting the active search", () => {
    const store = configureStore({ reducer: { locale: localeReducer } });
    const refresh = vi.fn();

    render(
      <Provider store={store}>
        <DataTable
          data={[{ id: 1, name: "Coffee" }]}
          fields={[{ key: "name", header: "Name" }]}
          onRefresh={refresh}
          enablePagination={false}
        />
      </Provider>,
    );

    const search = screen.getByPlaceholderText("Search...");
    fireEvent.change(search, { target: { value: "Coffee" } });
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(refresh).toHaveBeenCalledOnce();
    expect(search).toHaveValue("Coffee");
  });

  it("disables and animates the shared refresh control while refreshing", () => {
    const store = configureStore({ reducer: { locale: localeReducer } });

    render(
      <Provider store={store}>
        <DataTable
          data={[]}
          fields={[]}
          onRefresh={() => undefined}
          refreshing
          enablePagination={false}
        />
      </Provider>,
    );

    const refresh = screen.getByRole("button", { name: "Refresh" });
    expect(refresh).toBeDisabled();
    expect(refresh.querySelector("svg")).toHaveClass("animate-spin");
  });

  it("keeps collapsed toolbar actions accessible and preserves export behavior", () => {
    const store = configureStore({ reducer: { locale: localeReducer } });
    const onExport = vi.fn();

    render(
      <Provider store={store}>
        <DataTable
          data={[{ id: 1, name: "Coffee" }]}
          fields={[{ key: "name", header: "Name" }]}
          enableExport
          onExport={onExport}
          enablePagination={false}
        />
      </Provider>,
    );

    const exportButton = screen.getByRole("button", { name: "Export" });
    fireEvent.focus(exportButton);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Export");

    fireEvent.click(exportButton);
    expect(onExport).toHaveBeenCalledWith([{ id: 1, name: "Coffee" }]);
  });
});
