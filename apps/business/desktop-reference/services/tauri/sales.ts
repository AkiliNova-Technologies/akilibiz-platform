import { invoke } from "@tauri-apps/api/core";

export type SalePaymentMethod = "cash" | "mobile_money" | "card" | "split";
export type SaleStatus = "completed" | "pending" | "refunded" | "cancelled";

export interface CreateSaleItemPayload {
  product_id: number;
  quantity: number;
  unit_price?: number | null;
  discount_amount?: number | null;
}

export interface CreateSalePayload {
  customer_id?: number | null;
  items: CreateSaleItemPayload[];
  payment_method: SalePaymentMethod;
  amount_paid?: number | null;
  discount_amount?: number | null;
  payment_reference?: string | null;
  split_payments?: SplitPaymentPayload[];
  due_date?: string | null;
  notes?: string | null;
}

export interface SplitPaymentPayload {
  method: string;
  amount: number;
  reference?: string | null;
}

export interface CancelSalePayload { reason: string; }

export interface RecordSalePaymentPayload {
  amount: number;
  payment_method: string;
  payment_reference?: string | null;
  notes?: string | null;
  idempotency_key?: string | null;
}

export interface SalePaymentHistoryEntry {
  id: number;
  payment_date: string;
  amount: number;
  payment_method: string;
  payment_reference?: string | null;
  remaining_balance: number;
}

export interface SalesQuery {
  skip?: number;
  limit?: number;
  search?: string;
  payment_method?: SalePaymentMethod | "all";
  status?: SaleStatus | "all";
  payment_status?: string;
  cashier_user_id?: number;
}

export interface SaleItemResponse {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  stock_unit: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_amount: number;
  tax_classification: string | null;
  tax_rate: number | null;
  taxable_amount: number | null;
  line_total: number;
}

export interface SplitPaymentResponse {
  method: string;
  amount: number;
  reference?: string | null;
}

export interface SaleListResponse {
  id: number;
  sale_number: string;
  customer_id?: number | null;
  customer_name: string;
  customer_phone?: string | null;
  cashier_name: string;
  items_count: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  tax_classification: string | null;
  tax_rate: number | null;
  total_amount: number;
  amount_paid: number;
  change_amount: number;
  balance_due: number;
  payment_status: string;
  due_date?: string | null;
  last_payment_at?: string | null;
  payment_method: SalePaymentMethod;
  status: SaleStatus;
  created_at: string;
}

export interface SaleDetailResponse {
  id: number;
  sale_number: string;
  customer_id?: number | null;
  customer_name: string;
  customer_phone?: string | null;
  cashier_user_id: number;
  cashier_name: string;
  items_count: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  tax_classification: string | null;
  tax_rate: number | null;
  tax_exclusive_amount: number | null;
  tax_inclusive_amount: number | null;
  total_amount: number;
  amount_paid: number;
  change_amount: number;
  balance_due: number;
  payment_status: string;
  due_date?: string | null;
  last_payment_at?: string | null;
  payment_method: SalePaymentMethod;
  payment_reference?: string | null;
  split_payments?: SplitPaymentResponse[] | null;
  notes?: string | null;
  status: SaleStatus;
  cancelled_at?: string | null;
  cancelled_by_user_id?: number | null;
  cancel_reason?: string | null;
  created_at: string;
  updated_at: string;
  items: SaleItemResponse[];
}

export interface SalesSummary {
  total_sales_value: number;
  transaction_count: number;
  average_sale_value: number;
  refunded_count: number;
  cancelled_count: number;
  total_receivables: number;
}

function normalizeSalesQuery(query: SalesQuery = {}): SalesQuery {
  return {
    skip: query.skip ?? 0,
    limit: query.limit ?? 100,
    search: query.search?.trim() || undefined,
    payment_method:
      query.payment_method && query.payment_method !== "all"
        ? query.payment_method
        : undefined,
    status: query.status && query.status !== "all" ? query.status : undefined,
    payment_status: query.payment_status,
    cashier_user_id: query.cashier_user_id,
  };
}

export const tauriSalesService = {
  async getSales(query: SalesQuery = {}): Promise<SaleListResponse[]> {
    return await invoke<SaleListResponse[]>("get_sales", {
      params: normalizeSalesQuery(query),
    });
  },

  async getSale(saleId: number): Promise<SaleDetailResponse> {
    return await invoke<SaleDetailResponse>("get_sale", {
      saleId,
    });
  },

  async createSale(payload: CreateSalePayload): Promise<SaleDetailResponse> {
    return await invoke<SaleDetailResponse>("create_sale", {
      payload,
    });
  },

  async cancelSale(
    saleId: number,
    payload: CancelSalePayload,
  ): Promise<SaleDetailResponse> {
    return await invoke<SaleDetailResponse>("cancel_sale", {
      saleId,
      payload,
    });
  },

  async recordSalePayment(
    saleId: number,
    payload: RecordSalePaymentPayload,
  ): Promise<SaleDetailResponse> {
    return await invoke<SaleDetailResponse>("record_sale_payment", {
      saleId,
      payload,
    });
  },

  async getSalePaymentHistory(
    customerId: number,
    saleId: number,
  ): Promise<SalePaymentHistoryEntry[]> {
    return await invoke<SalePaymentHistoryEntry[]>("get_sale_payment_history", {
      customerId,
      saleId,
    });
  },

  async getSalesSummary(query: SalesQuery = {}): Promise<SalesSummary> {
    return await invoke<SalesSummary>("get_sales_summary", {
      params: normalizeSalesQuery(query),
    });
  },
};
