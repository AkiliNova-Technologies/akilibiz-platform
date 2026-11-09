"use client";
import { useCallback, useState } from "react";
import { loadFinancialMirror, mirrorValue } from "@/components/akilibiz/finance/financial-mirror-client";

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
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const addPayment = useCallback(async (_payload: SupplierPaymentPayload & { supplier_name: string }): Promise<never> => unavailable(), []);
  const editPayment = useCallback(async (_id: number, _payload: SupplierPaymentPayload & { supplier_name: string }): Promise<never> => unavailable(), []);
  const markSettled = useCallback(async (_id: number): Promise<never> => unavailable(), []);
  // The web mirror presents source records only. Authoritative payable totals
  // must come from a desktop-published summary rather than browser arithmetic.
  const [summary] = useState<{ total_payment_records: number; total_paid: number; total_outstanding: number; overdue_payables: number } | null>(null);
  const getPayments = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const mirror = await loadFinancialMirror("supplier_payments");
      const next = mirror.rows.map(({ localRecordId, record }) => ({
        id: localRecordId,
        payment_ref: String(mirrorValue(record, "payment_ref", "public_id") ?? localRecordId),
        supplier_id: Number(mirrorValue(record, "supplier_id") ?? 0),
        supplier_name: String(mirrorValue(record, "supplier_name") ?? `Supplier ${mirrorValue(record, "supplier_id") ?? "—"}`),
        purchase_order_id: Number(mirrorValue(record, "purchase_order_id") ?? 0) || undefined,
        po_reference: String(mirrorValue(record, "po_reference") ?? "—"),
        total_invoice_amount: Number(mirrorValue(record, "total_invoice_amount_ugx", "total_invoice_amount") ?? 0),
        amount_paid: Number(mirrorValue(record, "amount_paid_ugx", "amount_paid") ?? 0),
        balance_remaining: Number(mirrorValue(record, "balance_remaining_ugx", "balance_remaining") ?? 0),
        payment_date: String(mirrorValue(record, "payment_date") ?? ""),
        due_date: String(mirrorValue(record, "due_date") ?? "") || undefined,
        payment_method: String(mirrorValue(record, "payment_method") ?? "Cash") as SupplierPaymentMethod,
        status: String(mirrorValue(record, "status") ?? "Pending") as SupplierPaymentStatus,
        recorded_by: String(mirrorValue(record, "recorded_by_name_snapshot") ?? "Desktop"),
        notes: String(mirrorValue(record, "notes") ?? "") || undefined,
      }));
      setPayments(next); setLastSuccessfulSync(mirror.lastSuccessfulSync); setIsStale(mirror.isStale); return next;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Financial mirror request failed."); return []; }
    finally { setLoading(false); }
  }, []);
  return {
    payments, loading, error, lastSuccessfulSync, isStale, summary, getPayments,
    getPayment: async (id: number) => payments.find((payment) => payment.id === id) ?? null,
    addPayment, editPayment, markSettled, getSummary: async () => summary,
  };
}
