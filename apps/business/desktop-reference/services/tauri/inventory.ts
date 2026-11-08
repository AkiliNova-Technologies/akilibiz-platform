import { invoke } from "@tauri-apps/api/core";

export type AdjustmentType =
  | "stock_in"
  | "stock_out"
  | "damaged"
  | "lost"
  | "return_in"
  | "correction"
  | "opening_balance";

export interface InventoryOverviewItem {
  product_id: number;
  product_name: string;
  sku: string;
  barcode?: string | null;
  description?: string | null;
  category_id: number;
  category_name: string;
  stock_unit: string;
  cost_price: number;
  selling_price: number;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_damaged: number;
  available_stock: number;
  min_stock_level: number;
  max_stock_level: number;
  is_active: boolean;
  is_low_stock: boolean;
  is_out_of_stock: boolean;
  is_overstocked: boolean;
  inventory_cost_value: number | null;
  inventory_retail_value: number;
  last_stock_update?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventorySummary {
  inventory_items: number;
  category_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
  inventory_cost_value: number | null;
  total_adjustments: number;
  added_stock_total: number;
  removed_stock_total: number;
  critical_adjustments_count: number;
  value_at_risk: number;
}

export interface AdjustStockPayload {
  product_id: number;
  adjustment_type: AdjustmentType;
  quantity: number;
  reason: string;
  notes?: string | null;
  unit_cost?: number | null;
  opening_unit_cost_ugx?: number | null;
  reference_type?: string | null;
  reference_id?: string | null;
  performed_by_user_id?: number | null;
}

export interface StockHistoryQuery {
  product_id?: number;
  movement_type?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  movement_type: string;
  quantity_change: number;
  stock_before: number;
  stock_after: number;
  stock_unit: string;
  reason: string;
  notes?: string | null;
  performed_by?: string | null;
  created_at: string;
}

export interface LowStockAlert {
  product_id: number;
  product_name: string;
  sku: string;
  category: string;
  current_stock: number;
  min_stock: number;
  shortage: number;
  stock_unit: string;
  cost_price: number;
  status: "Low Stock" | "Critical" | "Out of Stock";
  last_updated?: string | null;
}

export const tauriInventoryService = {
  async getInventoryOverview(): Promise<InventoryOverviewItem[]> {
    return await invoke<InventoryOverviewItem[]>("get_inventory_overview");
  },

  async getInventorySummary(): Promise<InventorySummary> {
    return await invoke<InventorySummary>("get_inventory_summary");
  },

  async adjustStock(payload: AdjustStockPayload): Promise<StockMovement> {
    return await invoke<StockMovement>("adjust_stock", { payload });
  },

  async getStockHistory(
    query: StockHistoryQuery = {},
  ): Promise<StockMovement[]> {
    return await invoke<StockMovement[]>("get_stock_history", { query });
  },

  async getLowStockAlerts(): Promise<LowStockAlert[]> {
    return await invoke<LowStockAlert[]>("get_low_stock_alerts");
  },
};
