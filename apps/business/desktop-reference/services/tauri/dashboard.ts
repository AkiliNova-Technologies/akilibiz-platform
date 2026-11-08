import { invoke } from "@tauri-apps/api/core";

export interface DashboardSummary {
  today_revenue: number;
  today_profit: number;
  today_expenses: number;
  today_transactions: number;
  yesterday_revenue: number;

  stock_value: number;
  low_stock_items: number;
  total_products: number;
  out_of_stock_items: number;

  active_customers: number;
  total_customers: number;
  new_customers_today: number;

  total_suppliers: number;

  active_staff: number;
  total_staff: number;

  pending_receivables: number;
  supplier_payables: number;

  cash_payments: number;
  card_payments: number;
  mobile_payments: number;

  avg_transaction_value: number;
  peak_hour: string;

  week_revenue: number;
  month_revenue: number;

  total_expenses: number;
  net_profit: number;
  profit_margin: number;
}

export interface DashboardOverviewQuery { date_from?: string; date_to?: string }
export interface DashboardOverview { date_from_utc:string; date_to_utc:string; completed_sales_total_ugx:number; cancelled_sales_total_ugx:number; completed_order_count:number; cancelled_order_count:number; products_count:number; customers_count:number; stock_on_hand_product_count:number; low_stock_product_count:number; out_of_stock_product_count:number; open_receivables_ugx:number; open_payables_ugx:number; tax_snapshot_count:number; tax_amount_ugx:number; sales_basis:string; tax_basis:string; stock_status:string; inventory_value_ugx:number|null; inventory_unvalued_count:number; average_transaction_ugx:number|null; average_transaction_rounding_method:string; peak_hour_utc:string|null; weekly_completed_sales_ugx:number; weekly_period_start_utc:string; weekly_period_end_utc:string; monthly_completed_sales_ugx:number; monthly_period_start_utc:string; monthly_period_end_utc:string; recent_sales:Array<{id:number;sale_number:string;customer:string;items_count_milli:number;total_amount_ugx:number;payment_method:string;created_at:string;cashier:string}>; payment_methods:Array<{payment_method:string;payment_count:number;total_amount_ugx:number;share_basis_points:number}>; top_products:Array<{product_id:number;product_name:string;quantity_milli:number;revenue_ugx:number;share_basis_points:number}>; staff_performance:Array<{staff_id:number;staff_name:string;sales_count:number;revenue_ugx:number}> }

export interface DashboardRecentSale {
  id: number;
  sale_number: string;
  customer: string;
  items: number;
  total: number;
  payment_method: string;
  status: string;
  time: string;
  cashier: string;
}

export interface DashboardTopProduct {
  id: number;
  name: string;
  quantity: number;
  revenue: number;
  /** Null when a historical sale lacks immutable Phase 3A cost evidence. */
  profit: number | null;
  category: string;
}

export interface DashboardLowStockItem {
  id: number;
  name: string;
  current_stock: number;
  min_stock: number;
  category: string;
  last_restocked: string;
}

export interface DashboardStaffPerformance {
  id: number;
  name: string;
  sales_count: number;
  revenue: number;
}

function normalizeError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong while loading dashboard data.";
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    return await invoke<DashboardSummary>("get_dashboard_summary");
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}
export async function getDashboardOverview(query: DashboardOverviewQuery): Promise<DashboardOverview> { try { return await invoke<DashboardOverview>("get_dashboard_overview", { query }); } catch (error) { throw new Error(normalizeError(error)); } }

export async function getDashboardRecentSales(
  limit?: number,
): Promise<DashboardRecentSale[]> {
  try {
    return await invoke<DashboardRecentSale[]>("get_dashboard_recent_sales", {
      limit,
    });
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function getDashboardTopProducts(
  limit?: number,
): Promise<DashboardTopProduct[]> {
  try {
    return await invoke<DashboardTopProduct[]>("get_dashboard_top_products", {
      limit,
    });
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function getDashboardLowStockItems(
  limit?: number,
): Promise<DashboardLowStockItem[]> {
  try {
    return await invoke<DashboardLowStockItem[]>(
      "get_dashboard_low_stock_items",
      { limit },
    );
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function getDashboardStaffPerformance(
  limit?: number,
): Promise<DashboardStaffPerformance[]> {
  try {
    return await invoke<DashboardStaffPerformance[]>(
      "get_dashboard_staff_performance",
      { limit },
    );
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}
