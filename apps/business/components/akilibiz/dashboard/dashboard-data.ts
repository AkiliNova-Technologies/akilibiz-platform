export type DashboardOverview = {
  date_from_utc: string;
  date_to_utc: string;
  completed_sales_total_ugx: number | null;
  completed_order_count: number;
  customers_count: number | null;
  suppliers_count: number | null;
  stock_on_hand_product_count: number | null;
  low_stock_product_count: number | null;
  out_of_stock_product_count: number | null;
  open_receivables_ugx: number | null;
  open_payables_ugx: number | null;
  inventory_value_ugx: number | null;
  inventory_unvalued_count: number;
  average_transaction_ugx: number | null;
  peak_hour_utc: string | null;
  weekly_completed_sales_ugx: number | null;
  weekly_period_start_utc: string;
  weekly_period_end_utc: string;
  monthly_completed_sales_ugx: number | null;
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

/**
 * Hosted directory and exact-milli stock summary. Financial metrics remain
 * unknown until accounting and sale postings have separately audited sync.
 */
export async function getDashboardOverview({
  date_from,date_to,
}: {date_from:string;date_to:string}):Promise<DashboardOverview> {
  const response=await fetch("/api/dashboard/hosted-overview",{credentials:"same-origin",cache:"no-store"});
  if(!response.ok) throw new Error("Could not load cloud business overview.");
  const hosted=await response.json() as {
    customers_count:number|null;suppliers_count:number|null;
    stock_on_hand_product_count:number|null;
    low_stock_product_count:number|null;out_of_stock_product_count:number|null;
  };
  return {
    date_from_utc:date_from,date_to_utc:date_to,
    completed_sales_total_ugx:null,completed_order_count:0,
    customers_count:hosted.customers_count,suppliers_count:hosted.suppliers_count,
    stock_on_hand_product_count:hosted.stock_on_hand_product_count,
    low_stock_product_count:hosted.low_stock_product_count,
    out_of_stock_product_count:hosted.out_of_stock_product_count,
    open_receivables_ugx:null,open_payables_ugx:null,
    inventory_value_ugx:null,inventory_unvalued_count:0,
    average_transaction_ugx:null,peak_hour_utc:null,
    weekly_completed_sales_ugx:null,weekly_period_start_utc:date_from,
    weekly_period_end_utc:date_to,
    monthly_completed_sales_ugx:null,monthly_period_start_utc:date_from,
    monthly_period_end_utc:date_to,
    recent_sales:[],payment_methods:[],top_products:[],staff_performance:[]
  };
}
