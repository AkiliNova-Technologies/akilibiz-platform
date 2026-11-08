export type DashboardOverview = {
  date_from_utc: string;
  date_to_utc: string;
  completed_sales_total_ugx: number;
  completed_order_count: number;
  customers_count: number;
  stock_on_hand_product_count: number;
  low_stock_product_count: number;
  out_of_stock_product_count: number;
  open_receivables_ugx: number;
  open_payables_ugx: number;
  inventory_value_ugx: number | null;
  inventory_unvalued_count: number;
  average_transaction_ugx: number | null;
  peak_hour_utc: string | null;
  weekly_completed_sales_ugx: number;
  weekly_period_start_utc: string;
  weekly_period_end_utc: string;
  monthly_completed_sales_ugx: number;
  monthly_period_start_utc: string;
  monthly_period_end_utc: string;
  recent_sales: Array<{
    id: number;
    sale_number: string;
    customer: string;
    total_amount_ugx: number;
    cashier: string;
  }>;
  payment_methods: Array<{
    payment_method: string;
    total_amount_ugx: number;
    share_basis_points: number;
  }>;
  top_products: Array<{
    product_id: number;
    product_name: string;
    revenue_ugx: number;
    share_basis_points: number;
  }>;
  staff_performance: Array<{
    staff_id: number;
    staff_name: string;
    revenue_ugx: number;
  }>;
};

/** Temporary browser-only overview data until a web dashboard source is available. */
export async function getDashboardOverview({
  date_from,
  date_to,
}: {
  date_from: string;
  date_to: string;
}): Promise<DashboardOverview> {
  return {
    date_from_utc: date_from,
    date_to_utc: date_to,
    completed_sales_total_ugx: 0,
    completed_order_count: 0,
    customers_count: 0,
    stock_on_hand_product_count: 0,
    low_stock_product_count: 0,
    out_of_stock_product_count: 0,
    open_receivables_ugx: 0,
    open_payables_ugx: 0,
    inventory_value_ugx: null,
    inventory_unvalued_count: 0,
    average_transaction_ugx: null,
    peak_hour_utc: null,
    weekly_completed_sales_ugx: 0,
    weekly_period_start_utc: date_from,
    weekly_period_end_utc: date_to,
    monthly_completed_sales_ugx: 0,
    monthly_period_start_utc: date_from,
    monthly_period_end_utc: date_to,
    recent_sales: [],
    payment_methods: [],
    top_products: [],
    staff_performance: [],
  };
}
