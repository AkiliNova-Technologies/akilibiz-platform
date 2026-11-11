import { loadAllFinancialMirrorRows } from "@/components/akilibiz/finance/financial-mirror-client";
import { mapHostedSale } from "@/components/akilibiz/sales-history/hosted-sales-mapper";
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
  // Financial records are protected by the owner-only mirror API.
  // Non-owners retain operational counts without seeing financial details.
  let financial: Awaited<ReturnType<typeof loadAllFinancialMirrorRows>> | null = null;
  try {
    financial = await loadAllFinancialMirrorRows("sales");
  } catch (reason) {
    // Authorization restrictions are intentional, not evidence of zero sales.
    // Unexpected failures also leave financial values unknown, never zero.
    void reason;
  }
  const mappedSales = financial?.map(mapHostedSale) ?? null;
  // Partial or malformed financial snapshots must not produce understated KPIs.
  const completed = mappedSales === null || mappedSales.some(sale => sale === null)
    ? null
    : mappedSales.filter((sale): sale is NonNullable<typeof sale> =>
        sale !== null && sale.status === "completed");
  const within = (day: string, first: string, last: string) => day.slice(0,10) >= first && day.slice(0,10) <= last;
  const inPeriod = completed?.filter(sale => within(sale.created_at,date_from,date_to)) ?? [];
  const salesTotal = completed === null ? null : inPeriod.reduce((total,sale) => total+sale.total_amount,0);
  const completedCount = completed === null ? 0 : inPeriod.length;
  const utcDate = new Date(`${date_to}T00:00:00Z`);
  const weekStart = new Date(utcDate.getTime()-6*86400000).toISOString().slice(0,10);
  const monthStart = date_to.slice(0,7)+"-01";
  const periodSum = (from: string) => completed === null ? null
    : completed.filter(sale => within(sale.created_at,from,date_to))
      .reduce((total,sale) => total+sale.total_amount,0);
  const recent = inPeriod.slice().sort((a,b)=>b.created_at.localeCompare(a.created_at))
    .slice(0,10).map(sale => ({
      id:sale.id,sale_number:sale.sale_number,customer:sale.customer_name??"Walk-in",
      total_amount_ugx:sale.total_amount,cashier:sale.cashier_name,
    }));
  const paymentTotals = new Map<string,number>();
  for (const sale of inPeriod) paymentTotals.set(
    sale.payment_method,(paymentTotals.get(sale.payment_method)??0)+sale.total_amount
  );
  const methods = Array.from(paymentTotals,([payment_method,total_amount_ugx])=>({
    payment_method,total_amount_ugx,
    share_basis_points: salesTotal && salesTotal>0 ? Math.round(total_amount_ugx*10000/salesTotal) : 0,
  }));
  return {
    date_from_utc:date_from,date_to_utc:date_to,
    completed_sales_total_ugx:salesTotal,completed_order_count:completedCount,
    customers_count:hosted.customers_count,suppliers_count:hosted.suppliers_count,
    stock_on_hand_product_count:hosted.stock_on_hand_product_count,
    low_stock_product_count:hosted.low_stock_product_count,
    out_of_stock_product_count:hosted.out_of_stock_product_count,
    open_receivables_ugx:null,open_payables_ugx:null,
    inventory_value_ugx:null,inventory_unvalued_count:0,
    average_transaction_ugx:completedCount?Math.round((salesTotal??0)/completedCount):null,peak_hour_utc:null,
    weekly_completed_sales_ugx:periodSum(weekStart),weekly_period_start_utc:weekStart,
    weekly_period_end_utc:date_to,
    monthly_completed_sales_ugx:periodSum(monthStart),monthly_period_start_utc:monthStart,
    monthly_period_end_utc:date_to,
    recent_sales:recent,payment_methods:methods,top_products:[],staff_performance:[]
  };
}
