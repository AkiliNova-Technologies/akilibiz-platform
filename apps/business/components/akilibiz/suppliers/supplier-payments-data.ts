"use client";
import { useCallback, useState } from "react";

export type SupplierPaymentMethod = "Cash" | "Bank Transfer" | "Mobile Money" | "Cheque";
export type SupplierPaymentStatus = "Pending" | "Partial" | "Paid" | "Overdue";
export interface SupplierPayment {
  id: number; payment_ref: string; supplier_id: number; supplier_name: string;
  purchase_order_id?: number; po_reference: string; total_invoice_amount: number;
  amount_paid: number; balance_remaining: number; payment_date: string;
  due_date?: string; payment_method: SupplierPaymentMethod;
  status: SupplierPaymentStatus; recorded_by: string; notes?: string;
}
export type SupplierPaymentPayload = Omit<SupplierPayment, "id" | "supplier_name" | "recorded_by">;
const unavailable = (): never => { throw new Error("Supplier payments cannot be recorded until hosted posting is connected."); };
export function useSupplierPaymentsData() {
  const [payments] = useState<SupplierPayment[]>([]);
  const addPayment = useCallback(async (_payload: SupplierPaymentPayload & { supplier_name: string }): Promise<never> => unavailable(), []);
  const editPayment = useCallback(async (_id: number, _payload: SupplierPaymentPayload & { supplier_name: string }): Promise<never> => unavailable(), []);
  const markSettled = useCallback(async (_id: number): Promise<never> => unavailable(), []);
  // Missing transaction data is not zero paid or zero outstanding.
  const summary = payments.length > 0 ? {
    total_payment_records: payments.length,
    total_paid: payments.reduce((sum, payment) => sum + payment.amount_paid, 0),
    total_outstanding: payments.reduce((sum, payment) => sum + payment.balance_remaining, 0),
    overdue_payables: payments.filter((payment) => payment.status === "Overdue")
      .reduce((sum, payment) => sum + payment.balance_remaining, 0),
  } : null;
  return {
    payments, loading: false, summary, getPayments: async () => payments,
    getPayment: async (id: number) => payments.find((payment) => payment.id === id) ?? null,
    addPayment, editPayment, markSettled, getSummary: async () => summary,
  };
}
