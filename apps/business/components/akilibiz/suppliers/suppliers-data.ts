"use client";
import { useCallback, useState } from "react";

export interface SupplierResponse {
  id: number; name: string; contact_person: string; phone: string;
  email?: string | null; address?: string | null;
  products_supplied: number; total_purchases: number; outstanding_balance: number;
  last_supply_date?: string | null; is_active: boolean; created_at: string; updated_at: string;
}
export interface SupplierPayload {
  name: string; contact_person: string; phone: string;
  email?: string | null; address?: string | null; is_active?: boolean;
}
export interface SupplierSummary {
  total_suppliers: number; active_suppliers: number;
  total_purchase_value: number; total_outstanding_payables: number;
}
export const formatSupplierCurrency = (value: number) => new Intl.NumberFormat("en-UG", {
  style: "currency", currency: "UGX", maximumFractionDigits: 0,
}).format(value);

const unavailable = (): never => {
  throw new Error("Supplier changes are unavailable until hosted supplier management is connected.");
};
export function useSuppliersData() {
  // Supplier directory data is fetched by the business-scoped server route.
  // This adapter must not seed fictional suppliers or accept local-only changes.
  const [suppliers] = useState<SupplierResponse[]>([]);
  const getSuppliers = useCallback(async () => suppliers, [suppliers]);
  const getSupplier = useCallback(async (id: number) =>
    suppliers.find((supplier) => supplier.id === id) ?? null, [suppliers]);
  const addSupplier = useCallback(async (_payload: SupplierPayload): Promise<never> => unavailable(), []);
  const editSupplier = useCallback(async (_id: number, _payload: SupplierPayload): Promise<never> => unavailable(), []);
  const summary: SupplierSummary | null = null;
  return {
    suppliers, selectedSupplier: null as SupplierResponse | null, summary, loading: false,
    getSuppliers, getSupplier, addSupplier, editSupplier,
    getSupplierSummary: async () => summary, clearSupplier: () => {},
  };
}
