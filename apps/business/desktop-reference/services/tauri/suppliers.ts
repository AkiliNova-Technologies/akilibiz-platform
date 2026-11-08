import { invoke } from "@tauri-apps/api/core";

export type SupplierStatus = "Active" | "Inactive";

export interface SupplierQuery {
  skip?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  has_outstanding_balance?: boolean;
}

export interface CreateSupplierPayload {
  name: string;
  contact_person: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  payment_terms?: string | null;
  opening_balance?: number | null;
  is_active?: boolean;
}

export interface UpdateSupplierPayload {
  name?: string;
  contact_person?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  payment_terms?: string | null;
  opening_balance?: number | null;
  is_active?: boolean;
}

export interface SupplierResponse {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email?: string | null;
  address?: string | null;

  payment_terms: string;
  opening_balance: number;
  outstanding_balance: number;

  products_supplied: number;
  total_purchases: number;
  last_supply_date?: string | null;

  is_active: boolean;

  created_at: string;
  updated_at: string;
}

export interface SupplierSummary {
  total_suppliers: number;
  active_suppliers: number;
  inactive_suppliers: number;
  total_purchase_value: number;
  total_outstanding_payables: number;
}

function normalizeQuery(query: SupplierQuery = {}): SupplierQuery {
  return {
    skip: query.skip ?? 0,
    limit: query.limit ?? 100,
    search: query.search?.trim() || undefined,
    is_active: query.is_active,
    has_outstanding_balance: query.has_outstanding_balance,
  };
}

export const tauriSuppliersService = {
  async getSuppliers(query: SupplierQuery = {}): Promise<SupplierResponse[]> {
    return await invoke<SupplierResponse[]>("get_suppliers", {
      params: normalizeQuery(query),
    });
  },

  async getSupplier(supplierId: number): Promise<SupplierResponse> {
    return await invoke<SupplierResponse>("get_supplier", { supplierId });
  },

  async createSupplier(
    payload: CreateSupplierPayload,
  ): Promise<SupplierResponse> {
    return await invoke<SupplierResponse>("create_supplier", { payload });
  },

  async updateSupplier(
    supplierId: number,
    payload: UpdateSupplierPayload,
  ): Promise<SupplierResponse> {
    return await invoke<SupplierResponse>("update_supplier", {
      supplierId,
      payload,
    });
  },

  async deactivateSupplier(supplierId: number): Promise<SupplierResponse> {
    return await invoke<SupplierResponse>("deactivate_supplier", {
      supplierId,
    });
  },

  async getSupplierSummary(): Promise<SupplierSummary> {
    return await invoke<SupplierSummary>("get_supplier_summary");
  },
};