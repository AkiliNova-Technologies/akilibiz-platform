"use client";
import { useCallback } from "react";
import type { Product } from "@/components/akilibiz/products/products-data";
export type AdjustmentType="stock_in"|"stock_out"|"damaged"|"lost"|"return_in"|"correction"|"opening_balance";
export interface InventoryOverviewItem { product_id:number; product_name:string; sku:string; barcode?:string|null; category_id:number; category_name:string; quantity_on_hand:number; min_stock_level:number; max_stock_level:number; stock_unit:string; cost_price:number; selling_price:number; inventory_cost_value:number|null; is_active:boolean; is_low_stock:boolean; is_out_of_stock:boolean; is_overstocked:boolean; last_stock_update?:string|null; created_at:string; updated_at:string; description?:string|null; }
export interface InventoryLog { id:number; date:string; adjustment_type:AdjustmentType; quantity:number; reason:string; notes?:string; balance_after:number; }
export interface StockMovement { id:number; product_id:number; product_name:string; sku:string; movement_type:AdjustmentType | ""; quantity_change:number; stock_before:number; stock_after:number; stock_unit:string; reason:string; notes?:string; performed_by:string; created_at:string; opening_unit_cost_ugx?:number; }
export interface LowStockAlert { product_id:number; product_name:string; sku:string; category:string; current_stock:number; min_stock:number; shortage:number; stock_unit:string; cost_price:number; status:"Low Stock"|"Out of Stock"|"Critical"; last_updated?:string|null; }
// Compatibility types remain for report UI components. The authoritative
// inventory screen uses the hosted inventory projection; this hook must
// never simulate stock adjustments or show demonstration movements.
const EMPTY_OVERVIEW: InventoryOverviewItem[] = [];
const EMPTY_MOVEMENTS: StockMovement[] = [];
export const stockHistorySeed: StockMovement[] = [];
export function useInventoryData() {
  const getOverview=useCallback(async()=>EMPTY_OVERVIEW,[]);
  const getSummary=useCallback(async()=>null,[]);
  const getLowStock=useCallback(async()=>EMPTY_OVERVIEW,[]);
  const getLogs=useCallback(async(_id:number)=>[] as InventoryLog[],[]);
  const refreshInventory=useCallback(async()=>EMPTY_OVERVIEW,[]);
  const adjust=useCallback(async(_id:number,_payload:{
    quantity:number;adjustment_type:AdjustmentType;reason:string;notes?:string
  }):Promise<boolean>=>{
    throw new Error("Stock adjustments are available only on AkiliBiz Desktop until hosted posting is qualified.");
  },[]);
  return {
    overview:EMPTY_OVERVIEW,
    summary:null,
    movements:EMPTY_MOVEMENTS,
    error:"The legacy inventory adapter is not connected to hosted stock records.",
    loading:false,
    getOverview,getSummary,getLowStock,getLogs,refreshInventory,adjust,
    clearError:()=>{},
  };
}
