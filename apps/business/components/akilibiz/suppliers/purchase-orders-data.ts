"use client";
import { useCallback, useState } from "react";
export type PurchaseOrderStatus = "Draft" | "Pending" | "Partially Received" | "Received" | "Cancelled";
export interface PurchaseOrder {
  id: number; po_number: string; supplier_id: number; supplier_name: string;
  items_count: number; total_amount: number; order_date: string;
  expected_delivery: string; status: PurchaseOrderStatus; created_by_name: string;
  notes?: string;
}
const unavailable = () => { throw new Error("Purchase order posting is not available on the web yet."); };
export function usePurchaseOrdersData() {
  // No hosted purchase-order ledger is connected. Never display demo orders as real.
  const [orders] = useState<PurchaseOrder[]>([]);
  const addOrder = useCallback(async (_order: Omit<PurchaseOrder, "id" | "supplier_name" | "created_by_name"> & {supplier_name: string}): Promise<never> => unavailable(), []);
  const editOrder = useCallback(async (_id: number, _payload: Partial<PurchaseOrder>): Promise<never> => unavailable(), []);
  const markReceived = useCallback(async (_id: number): Promise<never> => unavailable(), []);
  return {
    orders, loading: false, getOrders: async () => orders, getSummary: async () => null,
    addOrder, editOrder, markReceived,
    getOrder: async (id: number) => orders.find((row) => row.id === id) ?? null,
  };
}
