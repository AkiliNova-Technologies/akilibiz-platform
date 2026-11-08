"use client";

import { useCallback, useState } from "react";

export type SupplierPaymentMethod = "Cash" | "Bank Transfer" | "Mobile Money" | "Cheque";
export type SupplierPaymentStatus = "Pending" | "Partial" | "Paid" | "Overdue";

export interface SupplierPayment {
  id: number;
  payment_ref: string;
  supplier_id: number;
  supplier_name: string;
  purchase_order_id?: number;
  po_reference: string;
  total_invoice_amount: number;
  amount_paid: number;
  balance_remaining: number;
  payment_date: string;
  due_date?: string;
  payment_method: SupplierPaymentMethod;
  status: SupplierPaymentStatus;
  recorded_by: string;
  notes?: string;
}

export type SupplierPaymentPayload = Omit<SupplierPayment, "id" | "supplier_name" | "recorded_by">;

const initialPayments: SupplierPayment[] = [{
  id: 1, payment_ref: "PAY-20260919-001", supplier_id: 1, supplier_name: "Kampala Traders",
  purchase_order_id: 1, po_reference: "PO-20260919-001", total_invoice_amount: 350000,
  amount_paid: 100000, balance_remaining: 250000, payment_date: "2026-09-19", due_date: "2026-09-26",
  payment_method: "Bank Transfer", status: "Partial", recorded_by: "System",
  notes: "First settlement against monthly replenishment.",
}];

export function useSupplierPaymentsData() {
  const [payments, setPayments] = useState<SupplierPayment[]>(initialPayments);
  const addPayment = useCallback(async (payload: SupplierPaymentPayload & { supplier_name: string }) => {
    const payment: SupplierPayment = { ...payload, id: Date.now(), recorded_by: "System" };
    setPayments((rows) => [payment, ...rows]);
    return payment;
  }, []);
  const editPayment = useCallback(async (id: number, payload: SupplierPaymentPayload & { supplier_name: string }) => {
    let updated: SupplierPayment | null = null;
    setPayments((rows) => rows.map((row) => {
      if (row.id !== id) return row;
      updated = { ...row, ...payload };
      return updated;
    }));
    return updated;
  }, []);
  const markSettled = useCallback(async (id: number) => {
    setPayments((rows) => rows.map((row) => row.id === id ? { ...row, status: "Paid" as const, balance_remaining: 0 } : row));
    return true;
  }, []);
  const summary = {
    total_payment_records: payments.length,
    total_paid: payments.reduce((total, payment) => total + payment.amount_paid, 0),
    total_outstanding: payments.reduce((total, payment) => total + payment.balance_remaining, 0),
    overdue_payables: payments.filter((payment) => payment.status === "Overdue").reduce((total, payment) => total + payment.balance_remaining, 0),
  };
  return { payments, loading: false, summary, getPayments: async () => payments, getPayment: async (id: number) => payments.find((payment) => payment.id === id) ?? null, addPayment, editPayment, markSettled, getSummary: async () => summary };
}
