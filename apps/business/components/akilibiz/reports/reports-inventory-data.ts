"use client";
import { useCallback, useState } from "react";
import type { InventoryOverviewItem, StockMovement } from "@/components/akilibiz/inventory/inventory-data";
import type { HostedStockReportRow } from "@/lib/hosted-inventory-report";

export interface InventoryStockOnHand {
  product_id:number;product_name:string;sku:string;category_id:number;
  category_name:string;quantity_on_hand_milli:number;reorder_level_milli:number;
  stock_status:string;product:InventoryOverviewItem | null;
}
export interface InventoryMovement {
  id:number;product_id:number;movement_date_utc:string;
  movement_type:StockMovement["movement_type"];signed_quantity_milli:number;
  running_balance_milli:number;reversal_status:string;source:StockMovement;
}
export interface InventoryValuationRow {
  product_id:number;product_name:string;quantity_milli:number;
  weighted_average_cost_ugx:number|null;value_ugx:number|null;
  exception:string|null;product:InventoryOverviewItem | null;
}
export interface InventoryValuationSummary {
  total_value_ugx:number;unvalued_stock_count:number;
}

function toStock(row: HostedStockReportRow):InventoryStockOnHand {
  const product:InventoryOverviewItem | null =
    row.cost_price_ugx !== null && row.selling_price_ugx !== null
    ? {
      product_id:row.id,product_name:row.name,sku:row.sku,
      category_id:row.category_id,category_name:row.category_name,
      quantity_on_hand:row.on_hand_milli/1000,min_stock_level:row.minimum_milli/1000,
      max_stock_level:row.maximum_milli/1000,stock_unit:row.stock_unit,
      cost_price:row.cost_price_ugx,selling_price:row.selling_price_ugx,
      inventory_cost_value:null,is_active:row.is_active,
      is_low_stock:row.stock_status==="Low stock",is_out_of_stock:row.stock_status==="Out of stock",
      is_overstocked:row.available_milli>row.maximum_milli,
      last_stock_update:row.snapshot_at,created_at:"",updated_at:row.snapshot_at??"",
    } : null;
  return {
    product_id:row.id,product_name:row.name,sku:row.sku,
    category_id:row.category_id,category_name:row.category_name,
    quantity_on_hand_milli:row.on_hand_milli,
    reorder_level_milli:row.minimum_milli,stock_status:row.stock_status,
    product,
  };
}

export function useReportsInventoryData() {
  const [stockOnHand,setStockOnHand]=useState<InventoryStockOnHand[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [unavailablePositions,setUnavailablePositions]=useState(0);
  const [movements]=useState<InventoryMovement[]>([]);
  const [valuation]=useState<InventoryValuationRow[]>([]);
  const [valuationSummary]=useState<InventoryValuationSummary|null>(null);
  const getInventoryStockOnHand=useCallback(async () => {
    setLoading(true);setError(null);
    try {
      const response=await fetch("/api/reports/stock-on-hand",{cache:"no-store"});
      const data=await response.json() as {
        rows?:HostedStockReportRow[];skipped?:number;error?:string;
      };
      if (!response.ok || !Array.isArray(data.rows)) {
        throw new Error(data.error??"Synchronized stock positions could not be loaded.");
      }
      const rows=data.rows.map(toStock);
      const skipped=data.skipped??0;
      setStockOnHand(rows);
      setUnavailablePositions(skipped);
      if (skipped>0) setError(`${skipped} stock position(s) have unavailable exact quantities and are not included in the register.`);
      return rows;
    } catch(cause) {
      setStockOnHand([]);setUnavailablePositions(0);
      setError(cause instanceof Error?cause.message:"Stock reporting is unavailable.");
      return [];
    } finally {setLoading(false);}
  },[]);
  const getInventoryMovementHistory=useCallback(async () => movements,[movements]);
  const getInventoryValuationSummary=useCallback(async () => null,[]);
  const getInventoryProductDrillDown=useCallback(async (_id:number) => null,[]);
  return {stockOnHand,movements,valuation,valuationSummary,loading,error,unavailablePositions,
    getInventoryStockOnHand,getInventoryMovementHistory,getInventoryValuationSummary,
    getInventoryProductDrillDown};
}
