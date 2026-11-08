export type Granularity = "daily" | "weekly" | "monthly";
export type SalesTrend = {
  current: Array<{
    period_utc: string;
    total_ugx: number;
    transaction_count: number;
  }>;
  absolute_change_ugx: number;
  percentage_change_basis_points: number | null;
};
export type CustomerBehaviourSummary = {
  completed_sales_total_ugx: number;
  completed_order_count: number;
  completed_customer_count: number;
  returning_customer_count: number;
};
export type TopCustomer = {
  customer_id: number;
  customer_reference: string;
  order_count: number;
  sales_total_ugx: number;
  most_recent_completed_sale_date_utc: string;
};
export type ProductVelocity = {
  product_id: number;
  product_name: string;
  quantity_milli: number;
  revenue_ugx: number;
  classification: string;
};
export type StockOutRisk = {
  product_id: number;
  product_name: string;
  current_stock_milli: number;
  sold_quantity_milli: number;
  estimated_days_remaining: number | null;
  confidence: string;
};
export type StockOutRiskSummary = {
  out_of_stock_product_count: number;
  insufficient_data_product_count: number;
  status: string;
};
export type PaymentMethodAnalytics = {
  payment_method: string;
  payment_count: number;
  total_amount_ugx: number;
  status: string;
};
export type ProductAssociation = {
  product_a_id: number;
  product_a_name: string;
  product_b_id: number;
  product_b_name: string;
  copurchase_order_count: number;
  support_basis_points: number;
  status: string;
};

/** Temporary browser-only adapter until web analytics data is available. */
export async function getAnalyticsData() {
  return {
    salesTrend: {
      current: [],
      absolute_change_ugx: 0,
      percentage_change_basis_points: null,
    } satisfies SalesTrend,
    customerSummary: {
      completed_sales_total_ugx: 0,
      completed_order_count: 0,
      completed_customer_count: 0,
      returning_customer_count: 0,
    } satisfies CustomerBehaviourSummary,
    customerRows: [] as TopCustomer[],
    velocityRows: [] as ProductVelocity[],
    riskReport: {
      rows: [] as StockOutRisk[],
      summary: {
        out_of_stock_product_count: 0,
        insufficient_data_product_count: 0,
        status: "NO_DATA",
      } satisfies StockOutRiskSummary,
    },
    paymentRows: [] as PaymentMethodAnalytics[],
    associationRows: [] as ProductAssociation[],
  };
}
