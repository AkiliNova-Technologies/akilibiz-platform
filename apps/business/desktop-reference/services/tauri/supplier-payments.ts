import { invoke } from "@tauri-apps/api/core";

export type SupplierPaymentMethod =
  | "Cash"
  | "Bank Transfer"
  | "Mobile Money"
  | "Cheque";

export type SupplierPaymentStatus =
  | "Pending"
  | "Partial"
  | "Paid"
  | "Overdue";

export interface SupplierPaymentQuery {
  skip?: number;
  limit?: number;
  search?: string;
  supplier_id?: number;
  status?: SupplierPaymentStatus | "all";
  payment_method?: SupplierPaymentMethod | "all";
}

export interface CreateSupplierPaymentPayload {
  payment_ref: string;
  supplier_id: number;
  po_reference?: string | null;
  total_invoice_amount: number;
  amount_paid: number;
  payment_date: string;
  due_date?: string | null;
  payment_method: SupplierPaymentMethod;
  status?: SupplierPaymentStatus;
  notes?: string | null;
}

export interface SupplierPaymentAllocation {
  supplier_payable_id: number;
  amount_ugx: number;
}

export interface AllocateSupplierPaymentPayload {
  payment_ref: string;
  supplier_id: number;
  amount_ugx: number;
  payment_date: string;
  payment_method: SupplierPaymentMethod;
  notes?: string | null;
  allocations: SupplierPaymentAllocation[];
}

export interface UpdateSupplierPaymentPayload {
  payment_ref?: string;
  supplier_id?: number;
  po_reference?: string | null;
  total_invoice_amount?: number;
  amount_paid?: number;
  payment_date?: string;
  due_date?: string | null;
  payment_method?: SupplierPaymentMethod;
  status?: SupplierPaymentStatus;
  notes?: string | null;
}

export interface SupplierPaymentResponse {
  id: number;
  payment_ref: string;
  supplier_id: number;
  supplier_name: string;
  po_reference?: string | null;
  total_invoice_amount: number;
  amount_paid: number;
  balance_remaining: number;
  payment_date: string;
  due_date?: string | null;
  payment_method: SupplierPaymentMethod;
  status: SupplierPaymentStatus;
  recorded_by_name: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierPaymentSummary {
  total_payment_records: number;
  total_paid: number;
  total_outstanding: number;
  overdue_payables: number;
}

function normalizeQuery(query: SupplierPaymentQuery = {}): SupplierPaymentQuery {
  return {
    skip: query.skip ?? 0,
    limit: query.limit ?? 100,
    search: query.search?.trim() || undefined,
    supplier_id: query.supplier_id,
    status: query.status && query.status !== "all" ? query.status : undefined,
    payment_method:
      query.payment_method && query.payment_method !== "all"
        ? query.payment_method
        : undefined,
  };
}

export const tauriSupplierPaymentsService = {
  async allocateSupplierPayment(
    payload: AllocateSupplierPaymentPayload,
  ): Promise<SupplierPaymentResponse> {
    return await invoke<SupplierPaymentResponse>("allocate_supplier_payment", {
      payload,
    });
  },

  async getSupplierPayments(
    query: SupplierPaymentQuery = {},
  ): Promise<SupplierPaymentResponse[]> {
    return await invoke<SupplierPaymentResponse[]>("get_supplier_payments", {
      params: normalizeQuery(query),
    });
  },

  async getSupplierPayment(paymentId: number): Promise<SupplierPaymentResponse> {
    return await invoke<SupplierPaymentResponse>("get_supplier_payment", {
      paymentId,
    });
  },

  async createSupplierPayment(
    payload: CreateSupplierPaymentPayload,
  ): Promise<SupplierPaymentResponse> {
    return await invoke<SupplierPaymentResponse>("create_supplier_payment", {
      payload,
    });
  },

  async updateSupplierPayment(
    paymentId: number,
    payload: UpdateSupplierPaymentPayload,
  ): Promise<SupplierPaymentResponse> {
    return await invoke<SupplierPaymentResponse>("update_supplier_payment", {
      paymentId,
      payload,
    });
  },

  async markSupplierPaymentSettled(
    paymentId: number,
  ): Promise<SupplierPaymentResponse> {
    return await invoke<SupplierPaymentResponse>(
      "mark_supplier_payment_settled",
      { paymentId },
    );
  },

  async getSupplierPaymentSummary(): Promise<SupplierPaymentSummary> {
    return await invoke<SupplierPaymentSummary>("get_supplier_payment_summary");
  },
};
