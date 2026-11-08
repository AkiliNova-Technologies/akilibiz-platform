import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";

import { ProductCsvImportDialog } from "@/components/ProductCsvImportDialog";
import localeReducer from "@/redux/slices/localeSlice";

const { inspectProductCsv, validateProductCsv } = vi.hoisted(() => ({
  inspectProductCsv: vi.fn(),
  validateProductCsv: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn().mockResolvedValue("/tmp/products.csv"),
}));

vi.mock("@/services/tauri/import-export", () => ({
  importExportService: {
    inspectProductCsv,
    validateProductCsv,
    applyProductCsv: vi.fn(),
  },
}));

describe("ProductCsvImportDialog", () => {
  it("explains CSV/XLSX category contracts and surfaces the CSV mapping blocker once", async () => {
    inspectProductCsv.mockResolvedValue({
      file_name: "products.csv",
      source_headers: ["product_name", "sku", "category_id", "cost_price", "selling_price"],
      sample_rows: [["Tea", "TEA-1", "1", "100", "200"]],
      canonical_fields: [
        { field: "name", required: true, value_kind: "text" },
        { field: "sku", required: true, value_kind: "text" },
        { field: "category_name", required: true, value_kind: "category_reference" },
        { field: "cost_price", required: true, value_kind: "whole_ugx" },
        { field: "selling_price", required: true, value_kind: "whole_ugx" },
      ],
      suggestions: [
        { source_header: "product_name", target_field: "name" },
        { source_header: "sku", target_field: "sku" },
        { source_header: "category_id", target_field: "category_name" },
        { source_header: "cost_price", target_field: "cost_price" },
        { source_header: "selling_price", target_field: "selling_price" },
      ],
    });
    validateProductCsv.mockResolvedValue({
      preview_token: null,
      total_rows: 65,
      valid_rows: 0,
      status: "category_mapping_invalid",
      errors: [{
        row_number: 1,
        source_column: "category_id",
        mapped_target: "category_name",
        error_code: "csv_category_id_requires_category_name",
        message: "This CSV uses category_id values but does not contain category names. Replace category_id with category_name, or import the XLSX workbook that includes the Categories sheet.",
      }],
    });

    const store = configureStore({ reducer: { locale: localeReducer } });
    render(
      <Provider store={store}>
        <ProductCsvImportDialog open onOpenChange={vi.fn()} onImportComplete={vi.fn()} />
      </Provider>,
    );

    expect(screen.getByText(/CSV product files must use/i)).toBeInTheDocument();
    expect(screen.getByText(/XLSX files may use/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Choose import file" }));
    await screen.findByText("products.csv");
    fireEvent.click(screen.getByRole("button", { name: "Validate import" }));

    await waitFor(() => {
      expect(screen.getByText("Category mapping is required before importing.")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Replace category_id with category_name/i)).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /continue/i })).not.toBeInTheDocument();
  });
});
