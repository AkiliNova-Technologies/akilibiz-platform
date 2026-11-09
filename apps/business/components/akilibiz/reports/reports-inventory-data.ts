"use client";
import { useCallback, useState } from "react";
import type { InventoryOverviewItem, StockMovement } from "@/components/akilibiz/inventory/inventory-data";
export interface InventoryStockOnHand {
  product_id: number; product_name: string; sku: string; category_id: number;
  category_name: string; quantity_on_hand_milli: number; reorder_level_milli: number;
  stock_status: string; product: InventoryOverviewItem;
}
export interface InventoryMovement {
  id: number; product_id: number; movement_date_utc: string;
  movement_type: StockMovement["movement_type"]; signed_quantity_milli: number;
  running_balance_milli: number; reversal_status: string; source: StockMovement;
}
export interface InventoryValuationRow {
  product_id: number; product_name: string; quantity_milli: number;
  weighted_average_cost_ugx: number | null; value_ugx: number | null;
  exception: string | null; product: InventoryOverviewItem;
}
export interface InventoryValuationSummary {
  total_value_ugx: number; unvalued_stock_count: number;
}
export function useReportsInventoryData() {
  // No authoritative hosted stock reporting or movement ledger is connected.
  const [stockOnHand] = useState<InventoryStockOnHand[]>([]);
  const [movements] = useState<InventoryMovement[]>([]);
  const [valuation] = useState<InventoryValuationRow[]>([]);
  const valuationSummary: InventoryValuationSummary | null = null;
  const getInventoryStockOnHand = useCallback(async () => stockOnHand, [stockOnHand]);
  const getInventoryMovementHistory = useCallback(async () => movements, [movements]);
  const getInventoryValuationSummary = useCallback(async () => null, []);
  const getInventoryProductDrillDown = useCallback(async (_id: number) => null, []);
  return { stockOnHand, movements, valuation, valuationSummary, getInventoryStockOnHand, getInventoryMovementHistory, getInventoryValuationSummary, getInventoryProductDrillDown };
}
