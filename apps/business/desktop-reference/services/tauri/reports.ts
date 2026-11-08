import { invoke } from "@tauri-apps/api/core";

export type ReportPeriodType = "daily" | "weekly" | "monthly" | "quarterly";

export interface ReportQuery {
  period_type?: ReportPeriodType;
  date_from?: string;
  date_to?: string;
  skip?: number;
  limit?: number;
  search?: string;
}

export interface ReportOverviewRow {
  id: number;
  report_name: string;
  category: string;
  period: string;
  total_value: number;
  entries: number;
  status: string;
  updated_at: string;
}

export interface ReportsOverviewSummary {
  total_sales_value: number;
  total_inventory_value: number;
  total_financial_value: number;
  total_profit_value: number;
}

export interface SalesReportRow {
  id: number;
  report_date: string;
  invoice_count: number;
  items_sold: number;
  gross_sales: number;
  discounts: number;
  net_sales: number;
  payment_mix: string;
  top_category: string;
  status: string;
}

export interface SalesReportSummary {
  total_gross_sales: number;
  total_net_sales: number;
  total_invoices: number;
  average_daily_sales: number;
}

export interface InventoryReportRow {
  id: number;
  product_name: string;
  category: string;
  stock_quantity: number;
  stock_unit: string;
  min_stock: number;
  cost_price: number;
  stock_value: number;
  status: string;
  last_updated: string;
}

export interface InventoryReportSummary {
  total_inventory_value: number;
  healthy_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
}

export interface FinancialReportRow {
  id: number;
  report_name: string;
  period: string;
  income: number;
  expenses: number;
  net_result: number;
  cash_position: number;
  status: string;
  updated_at: string;
}

export interface FinancialReportSummary {
  total_income: number;
  total_expenses: number;
  total_net_result: number;
  finalized_reports: number;
}

export interface ProfitLossRow {
  id: number;
  period: string;
  revenue: number;
  cost_of_sales: number;
  gross_profit: number;
  operating_expenses: number;
  net_profit: number;
  margin_percent: number;
  status: string;
  updated_at: string;
}

export interface ProfitLossSummary {
  total_revenue: number;
  total_cost_of_sales: number;
  total_operating_expenses: number;
  total_net_profit: number;
}

function normalizeError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong while loading reports.";
}

export async function getReportsOverview(): Promise<ReportOverviewRow[]> {
  try {
    return await invoke<ReportOverviewRow[]>("get_reports_overview");
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function getReportsOverviewSummary(): Promise<ReportsOverviewSummary> {
  try {
    return await invoke<ReportsOverviewSummary>("get_reports_overview_summary");
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function getInventoryReports(
  query?: ReportQuery,
): Promise<InventoryReportRow[]> {
  try {
    return await invoke<InventoryReportRow[]>("get_inventory_reports", { query });
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function getInventoryReportSummary(): Promise<InventoryReportSummary> {
  try {
    return await invoke<InventoryReportSummary>("get_inventory_report_summary");
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function getFinancialReports(
  query?: ReportQuery,
): Promise<FinancialReportRow[]> {
  try {
    return await invoke<FinancialReportRow[]>("get_financial_reports", { query });
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function getFinancialReportSummary(): Promise<FinancialReportSummary> {
  try {
    return await invoke<FinancialReportSummary>("get_financial_report_summary");
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function getSalesReports(query?: ReportQuery): Promise<SalesReportRow[]> {
  try {
    return await invoke<SalesReportRow[]>("get_sales_reports", { query });
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function getSalesReportSummary(): Promise<SalesReportSummary> {
  try {
    return await invoke<SalesReportSummary>("get_sales_report_summary");
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function getProfitLossReports(
  query?: ReportQuery,
): Promise<ProfitLossRow[]> {
  try {
    return await invoke<ProfitLossRow[]>("get_profit_loss_reports", { query });
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

export async function getProfitLossSummary(): Promise<ProfitLossSummary> {
  try {
    return await invoke<ProfitLossSummary>("get_profit_loss_summary");
  } catch (error) {
    throw new Error(normalizeError(error));
  }
}

// Phase 07 authoritative, read-only report contracts. Values named *_ugx and
// *_milli are exact integers and are formatted only at the UI edge.
export interface DatePageQuery { date_from?: string; date_to?: string; skip?: number; limit?: number }
export interface OperationalReport { date_from_utc:string; date_to_utc:string; sales_total_ugx:number; sales_cancelled_total_ugx:number; receipts_total_ugx:number; receipts_voided_total_ugx:number; receivables_open_ugx:number; payables_open_ugx:number; inventory: InventoryValuationRow[] }
export interface InventoryValuationRow { product_id:number; product_name:string; quantity_milli:number; weighted_average_cost_ugx:number|null; value_ugx:number|null; exception:string|null }
export interface SalesRegisterRow { id:number; sale_number:string; sale_date_utc:string; status:string; customer_name:string|null; total_amount_ugx:number; amount_paid_ugx:number; balance_due_ugx:number; tax_amount_ugx:number; currency_code:string; reversal_status:string }
export interface GoodsReceivedRegisterRow { id:number; receipt_number:string; receipt_date_utc:string; status:string; supplier_name:string; total_amount_ugx:number; tax_amount_ugx:number; currency_code:string; reversal_status:string }
export interface ReceivableRow { customer_id:number; customer_name:string; sale_id:number; sale_number:string; sale_date_utc:string; due_date:string|null; original_amount_ugx:number; paid_amount_ugx:number; balance_ugx:number; payment_status:string; sale_status:string; reversal_status:string; ageing_bucket:string }
export interface PayableRow { supplier_id:number; supplier_name:string; payable_id:number; receipt_id:number; receipt_number:string; purchase_order_id:number|null; receipt_date_utc:string; due_date:string|null; original_amount_ugx:number; allocated_amount_ugx:number; balance_ugx:number; payment_status:string; receipt_status:string; reversal_status:string; ageing_bucket:string }
export interface InventoryStockOnHand { product_id:number; product_name:string; sku:string; category_id:number; category_name:string; quantity_on_hand_milli:number; reorder_level_milli:number; stock_status:string }
export interface InventoryMovement { id:number; product_id:number; movement_date_utc:string; movement_type:string; signed_quantity_milli:number; opening_quantity_milli:number; running_balance_milli:number; source_reference:string|null; created_at:string; reversal_status:string; reversal_of_movement_id:number|null }
export interface InventoryValuationSummary { total_value_ugx:number; valued_stock_count:number; unvalued_stock_count:number; unvalued:InventoryValuationRow[]; rows:InventoryValuationRow[] }
export interface GrossProfitReport { date_from_utc:string; date_to_utc:string; revenue_ugx:number; cogs_ugx:number; gross_profit_ugx:number; covered_event_count:number; excluded_event_count:number; coverage_status:string; exclusion_reasons:string[]; cogs_account_code:string }
export interface AuthoritativeProfitLossReport { date_from_utc:string; date_to_utc:string; revenue_ugx:number|null; cogs_ugx:number|null; gross_profit_ugx:number|null; operating_expenses_ugx:number|null; net_profit_loss_ugx:number|null; included_source_types:string[]; excluded_source_types:string[]; coverage_complete:boolean; coverage_reasons:string[] }
export interface AuthoritativeProfitLossDrillDownRow { effective_date_utc:string; source_type:string; source_reference:string|null; account_code:string; account_name:string; description:string; debit_ugx:number; credit_ugx:number; net_amount_ugx:number; journal_entry_id:number; journal_number:string }
export interface AuthoritativeTrialBalance { as_of_date_utc:string; authoritative_cutover_date:string; coverage_status:string; coverage_reasons:string[]; included_source_types:string[]; excluded_source_types:string[]; total_debit_ugx:number|null; total_credit_ugx:number|null; balances_equal:boolean|null; rows:Array<{account_id:number;account_code:string;account_name:string;account_type:string;total_debit_ugx:number;total_credit_ugx:number;debit_balance_ugx:number;credit_balance_ugx:number}> }
export interface AuthoritativeBalanceSheet { as_of_date_utc:string; authoritative_cutover_date:string; coverage_status:string; coverage_reasons:string[]; assets:Array<{account_id:number;account_code:string;account_name:string;amount_ugx:number}>; liabilities:Array<{account_id:number;account_code:string;account_name:string;amount_ugx:number}>; equity:Array<{account_id:number;account_code:string;account_name:string;amount_ugx:number}>; total_assets_ugx:number|null; total_liabilities_ugx:number|null; total_equity_ugx:number|null; total_liabilities_and_equity_ugx:number|null; equation_balances:boolean|null }
export interface AuthoritativeAccountDrillDownRow { effective_date_utc:string;journal_entry_id:number;journal_number:string;line_number:number;source_type:string;source_reference:string|null;description:string;debit_ugx:number;credit_ugx:number }
export interface TaxSummaryRow { classification:string; original_taxable_amount_ugx:number; original_tax_amount_ugx:number; reversal_taxable_amount_ugx:number; reversal_tax_amount_ugx:number; correction_taxable_amount_ugx:number; correction_tax_amount_ugx:number; taxable_amount_ugx:number; tax_amount_ugx:number; gross_amount_ugx:number; transaction_count:number }
export interface TaxTransaction { snapshot_id:number; fact_id:number|null; original_snapshot_id:number; fact_classification:"original"|"reversal"|"correction"; source_type:string; source_id:number; source_reference:string|null; transaction_date_utc:string|null; source_status:string; reversal_status:string; tax_code:string; tax_classification:string; rate_basis_points:number; taxable_amount_ugx:number; tax_amount_ugx:number; gross_amount_ugx:number; rounding_method:string; snapshot_timestamp:string; exception:string|null }
export interface JournalRegisterRow { id:number; journal_number:string; entry_date:string; description:string; source_type:string|null; source_id:number|null; source_reference:string|null; reversal_of_journal_id:number|null; is_reversal:boolean|null; debit_total_ugx:number; credit_total_ugx:number; posted_at:string }
export interface GeneralLedgerRow { journal_id:number; journal_number:string; entry_date:string; line_number:number; source_reference:string|null; debit_ugx:number; credit_ugx:number; running_balance_ugx:number; normal_balance:string }
export interface TrialBalance { as_of_date_utc:string; total_debit_ugx:number; total_credit_ugx:number; balances_equal:boolean; authoritative_posted_journals_only:boolean; rows:Array<{account_id:number;account_code:string;account_name:string;category:string;debit_balance_ugx:number;credit_balance_ugx:number}> }
const call = <T>(command:string,args?:Record<string,unknown>) => invoke<T>(command,args).catch(error=>{throw new Error(normalizeError(error))});
export const getOperationalReport=(query:DatePageQuery)=>call<OperationalReport>("get_operational_report",{query});
export const getSalesRegister=(query:DatePageQuery)=>call<SalesRegisterRow[]>("get_sales_register",{query});
export const getGoodsReceivedRegister=(query:DatePageQuery)=>call<GoodsReceivedRegisterRow[]>("get_goods_received_register",{query});
export const getOpenReceivables=(query:DatePageQuery & {customer_id?:number;status?:string})=>call<ReceivableRow[]>("get_open_receivables",{query});
export const getOpenPayables=(query:DatePageQuery & {supplier_id?:number;status?:string})=>call<PayableRow[]>("get_open_payables",{query});
export const getInventoryStockOnHand=(query:{category_id?:number;product_id?:number;skip?:number;limit?:number})=>call<InventoryStockOnHand[]>("get_inventory_stock_on_hand",{query});
export const getInventoryMovementHistory=(query:DatePageQuery & {product_id?:number})=>call<InventoryMovement[]>("get_inventory_movement_history",{query});
export const getInventoryValuationSummary=()=>call<InventoryValuationSummary>("get_inventory_valuation_summary");
export const getAuthoritativeGrossProfit=(query:DatePageQuery)=>call<GrossProfitReport>("get_authoritative_gross_profit",{query});
export const getAuthoritativeProfitLoss=(query:{date_from:string;date_to:string})=>call<AuthoritativeProfitLossReport>("get_authoritative_profit_loss",{query});
export const getAuthoritativeProfitLossDrillDown=(query:{date_from:string;date_to:string;section:"revenue"|"cogs"|"operating_expenses";skip?:number;limit?:number})=>call<AuthoritativeProfitLossDrillDownRow[]>("get_authoritative_profit_loss_drill_down",{query});
export const getAuthoritativeTrialBalance=(query:{as_of_date:string})=>call<AuthoritativeTrialBalance>("get_authoritative_trial_balance",{query});
export const getAuthoritativeBalanceSheet=(query:{as_of_date:string})=>call<AuthoritativeBalanceSheet>("get_authoritative_balance_sheet",{query});
export const getAuthoritativeAccountDrillDown=(query:{account_id:number;as_of_date:string;skip?:number;limit?:number})=>call<AuthoritativeAccountDrillDownRow[]>("get_authoritative_account_drill_down",{query});
export const getTaxSummary=(query:DatePageQuery)=>call<TaxSummaryRow[]>("get_tax_summary",{query});
export const getTaxTransactionRegister=(query:DatePageQuery)=>call<TaxTransaction[]>("get_tax_transaction_register",{query});
export const getJournalRegister=(query:DatePageQuery & {account_id?:number;source_type?:string;source_id?:number;reversal?:boolean})=>call<JournalRegisterRow[]>("get_journal_register",{query});
export const getTrialBalance=(as_of_date:string)=>call<TrialBalance>("get_trial_balance",{asOfDate:as_of_date});
export const getSaleReportDrillDown=(saleId:number)=>call<Record<string,unknown>>("get_sale_report_drill_down",{saleId});
export const getGoodsReceiptReportDrillDown=(receiptId:number)=>call<Record<string,unknown>>("get_goods_receipt_report_drill_down",{receiptId});
export const getCustomerReceivableDrillDown=(customerId:number)=>call<Record<string,unknown>>("get_customer_receivable_drill_down",{customerId});
export const getSupplierPayableDrillDown=(supplierId:number)=>call<Record<string,unknown>>("get_supplier_payable_drill_down",{supplierId});
export const getInventoryProductDrillDown=(productId:number)=>call<Record<string,unknown>>("get_inventory_product_drill_down",{productId});
export const getTaxTransactionDrillDown=(snapshotId:number)=>call<Record<string,unknown>>("get_tax_transaction_drill_down",{snapshotId});
export const getJournalEntryDrillDown=(journalId:number)=>call<Record<string,unknown>>("get_journal_entry_drill_down",{journalId});
export const getAccountGeneralLedger=(accountId:number,query:DatePageQuery)=>call<GeneralLedgerRow[]>("get_account_general_ledger",{accountId,query});

// Phase 08 analytics are read-only backend calculations. The UI only presents
// their integer results and does not derive measures client-side.
export interface AnalyticsQuery { date_from?: string; date_to?: string; granularity?: "daily" | "weekly" | "monthly" }
export interface CustomerAnalyticsQuery { date_from?: string; date_to?: string; skip?: number; limit?: number }
export interface SalesTrendPoint { period_utc: string; total_ugx: number; transaction_count: number; sale_ids: number[] }
export interface SalesTrend { date_from_utc: string; date_to_utc: string; granularity: string; current: SalesTrendPoint[]; previous: SalesTrendPoint[]; absolute_change_ugx: number; percentage_change_basis_points: number | null }
export interface ProductVelocity { product_id: number; product_name: string; quantity_milli: number; revenue_ugx: number; classification: string; classification_basis: string; date_from_utc: string; date_to_utc: string; sale_ids: number[] }
export interface StockOutRisk { product_id: number; product_name: string; current_stock_milli: number; sold_quantity_milli: number; observation_days: number; average_daily_sales_milli: number | null; estimated_days_remaining: number | null; confidence: string; date_from_utc: string; date_to_utc: string; sale_ids: number[] }
export interface StockOutRiskSummary { assessed_product_count: number; out_of_stock_product_count: number; negative_stock_product_count: number; history_sufficient_product_count: number; insufficient_data_product_count: number; status: string; date_from_utc: string; date_to_utc: string }
export interface StockOutRiskReport { rows: StockOutRisk[]; summary: StockOutRiskSummary }
export interface CustomerBehaviourSummary { date_from_utc: string; date_to_utc: string; completed_customer_count: number; new_customer_count: number; returning_customer_count: number; unattributed_cash_sale_count: number; completed_sales_total_ugx: number; completed_order_count: number; average_order_total_ugx: number; average_order_count: number; average_order_rounding_method: string }
export interface TopCustomer { customer_id: number; customer_reference: string; order_count: number; sales_total_ugx: number; first_completed_sale_date_utc: string; most_recent_completed_sale_date_utc: string; date_from_utc: string; date_to_utc: string }
export interface PaymentMethodAnalytics { payment_method: string; payment_count: number; total_amount_ugx: number; date_from_utc: string; date_to_utc: string; calculation_basis: string; status: string }
export interface ProductAssociationQuery extends CustomerAnalyticsQuery { anchor_product_id?: number }
export interface ProductAssociation { product_a_id: number; product_a_name: string; product_b_id: number; product_b_name: string; copurchase_order_count: number; eligible_completed_order_count: number; support_basis_points: number; date_from_utc: string; date_to_utc: string; calculation_basis: string; status: string }
export const getSalesTrends=(query:AnalyticsQuery)=>call<SalesTrend>("get_sales_trends",{query});
export const getProductVelocity=(query:AnalyticsQuery)=>call<ProductVelocity[]>("get_product_velocity",{query});
export const getStockOutRisk=(query:AnalyticsQuery)=>call<StockOutRiskReport>("get_stock_out_risk",{query});
export const getCustomerBehaviourSummary=(query:CustomerAnalyticsQuery)=>call<CustomerBehaviourSummary>("get_customer_behaviour_summary",{query});
export const getTopCustomers=(query:CustomerAnalyticsQuery)=>call<TopCustomer[]>("get_top_customers",{query});
export const getPaymentMethodAnalytics=(query:CustomerAnalyticsQuery)=>call<PaymentMethodAnalytics[]>("get_payment_method_analytics",{query});
export const getProductAssociations=(query:ProductAssociationQuery)=>call<ProductAssociation[]>("get_product_associations",{query});
