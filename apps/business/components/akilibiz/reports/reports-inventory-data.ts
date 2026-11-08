"use client";

import { useCallback, useMemo } from "react";
import { stockHistorySeed, type InventoryOverviewItem, type StockMovement, useInventoryData } from "@/components/akilibiz/inventory/inventory-data";

export interface InventoryStockOnHand { product_id: number; product_name: string; sku: string; category_id: number; category_name: string; quantity_on_hand_milli: number; reorder_level_milli: number; stock_status: string; product: InventoryOverviewItem; }
export interface InventoryMovement { id: number; product_id: number; movement_date_utc: string; movement_type: StockMovement["movement_type"]; signed_quantity_milli: number; running_balance_milli: number; reversal_status: string; source: StockMovement; }
export interface InventoryValuationRow { product_id: number; product_name: string; quantity_milli: number; weighted_average_cost_ugx: number | null; value_ugx: number | null; exception: string | null; product: InventoryOverviewItem; }

export function useReportsInventoryData() {
  const { overview } = useInventoryData();
  const stockOnHand = useMemo<InventoryStockOnHand[]>(() => overview.map((product) => ({ product_id: product.product_id, product_name: product.product_name, sku: product.sku, category_id: product.category_id, category_name: product.category_name, quantity_on_hand_milli: product.quantity_on_hand * 1000, reorder_level_milli: product.min_stock_level * 1000, stock_status: product.is_out_of_stock ? "out_of_stock" : product.is_low_stock ? "low_stock" : "in_stock", product })), [overview]);
  const movements = useMemo<InventoryMovement[]>(() => stockHistorySeed.map((source) => ({ id: source.id, product_id: source.product_id, movement_date_utc: source.created_at.slice(0, 10), movement_type: source.movement_type, signed_quantity_milli: source.quantity_change * 1000, running_balance_milli: source.stock_after * 1000, reversal_status: "Not reversed", source })), []);
  const valuation = useMemo<InventoryValuationRow[]>(() => overview.map((product) => ({ product_id: product.product_id, product_name: product.product_name, quantity_milli: product.quantity_on_hand * 1000, weighted_average_cost_ugx: product.cost_price, value_ugx: product.inventory_cost_value, exception: product.inventory_cost_value === null ? "Unvalued" : null, product })), [overview]);
  const valuationSummary = useMemo(() => ({ total_value_ugx: valuation.reduce((total, row) => total + (row.value_ugx ?? 0), 0), unvalued_stock_count: valuation.filter((row) => row.value_ugx === null).length }), [valuation]);
  const getInventoryStockOnHand = useCallback(async () => stockOnHand, [stockOnHand]);
  const getInventoryMovementHistory = useCallback(async () => movements, [movements]);
  const getInventoryValuationSummary = useCallback(async () => ({ ...valuationSummary, rows: valuation }), [valuation, valuationSummary]);
  const getInventoryProductDrillDown = useCallback(async (id: number) => { const product = overview.find((item) => item.product_id === id); return product ? { product, movements: movements.filter((movement) => movement.product_id === id), valuation: valuation.find((row) => row.product_id === id) ?? null } : null; }, [movements, overview, valuation]);
  return { stockOnHand, movements, valuation, valuationSummary, getInventoryStockOnHand, getInventoryMovementHistory, getInventoryValuationSummary, getInventoryProductDrillDown };
}
