import { act, renderHook } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import inventoryReducer from "@/redux/slices/inventorySlice";
import { tauriInventoryService, type StockMovement } from "@/services/tauri/inventory";
import { useReduxInventory } from "@/hooks/useReduxInventory";

const movement: StockMovement = {
  id: 1,
  product_id: 4,
  product_name: "Rice",
  sku: "RICE-1",
  movement_type: "opening_balance",
  quantity_change: 1,
  stock_before: 0,
  stock_after: 1,
  stock_unit: "kg",
  reason: "Opening stock",
  notes: null,
  performed_by: null,
  created_at: "2026-01-01T00:00:00Z",
};

describe("useReduxInventory", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(tauriInventoryService, "adjustStock").mockResolvedValue(movement);
    vi.spyOn(tauriInventoryService, "getInventoryOverview").mockResolvedValue([]);
    vi.spyOn(tauriInventoryService, "getInventorySummary").mockResolvedValue({
      inventory_items: 0,
      category_count: 0,
      low_stock_count: 0,
      out_of_stock_count: 0,
      inventory_cost_value: 0,
      total_adjustments: 0,
      added_stock_total: 0,
      removed_stock_total: 0,
      critical_adjustments_count: 0,
      value_at_risk: 0,
    });
    vi.spyOn(tauriInventoryService, "getLowStockAlerts").mockResolvedValue([]);
  });

  it("forwards a normalized opening unit cost for opening balances", async () => {
    const store = configureStore({ reducer: { inventory: inventoryReducer } });
    const wrapper = ({ children }: React.PropsWithChildren) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useReduxInventory(), { wrapper });

    await act(async () => {
      await result.current.adjust(4, {
        quantity: "1",
        adjustment_type: "opening_balance",
        reason: "Opening stock",
        opening_unit_cost_ugx: "1250",
      });
    });

    expect(tauriInventoryService.adjustStock).toHaveBeenCalledWith(
      expect.objectContaining({
        product_id: 4,
        adjustment_type: "opening_balance",
        quantity: 1,
        opening_unit_cost_ugx: 1250,
      }),
    );
  });
});
