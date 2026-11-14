"use client";
import { useCallback, useState } from "react";
import { loadAllFinancialMirrorRows, loadFinancialMirror, mirrorValue } from "@/components/akilibiz/finance/financial-mirror-client";
import { requiredAmount, requiredEnum, requiredId } from "@/components/akilibiz/finance/mirror-field-validation";

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
      const completeRows=mirror.total>mirror.rows.length
        ? await loadAllFinancialMirrorRows("supplier_payments")
        : mirror.rows;
      let invalidCount = 0;
      const next = completeRows.flatMap(({ localRecordId, record }) => {
        try {
          const status = requiredEnum(record, "status", ["Pending", "Partial", "Paid", "Overdue"] as const);
          const paymentMethod = requiredEnum(record, "payment_method", ["Cash", "Bank Transfer", "Mobile Money", "Cheque"] as const);
          return [{
        id: localRecordId,
        payment_ref: String(mirrorValue(record, "payment_ref", "public_id") ?? localRecordId),
        supplier_id: requiredId(record, "supplier_id"),
        supplier_name: String(mirrorValue(record, "supplier_name") ?? `Supplier ${mirrorValue(record, "supplier_id") ?? "—"}`),
        purchase_order_id: Number(mirrorValue(record, "purchase_order_id") ?? 0) || undefined,
        po_reference: String(mirrorValue(record, "po_reference") ?? "—"),
        total_invoice_amount: requiredAmount(record, "total_invoice_amount_ugx", "total_invoice_amount"),
        amount_paid: requiredAmount(record, "amount_paid_ugx", "amount_paid"),
        balance_remaining: requiredAmount(record, "balance_remaining_ugx", "balance_remaining"),
        payment_date: String(mirrorValue(record, "payment_date") ?? ""),
        due_date: String(mirrorValue(record, "due_date") ?? "") || undefined,
        payment_method: paymentMethod,
        status,
        recorded_by: String(mirrorValue(record, "recorded_by_name_snapshot") ?? "Desktop"),
        notes: String(mirrorValue(record, "notes") ?? "") || undefined,
      }];
        } catch {
          invalidCount += 1;
          return [];
        }
      });
      if (invalidCount) setError(`${invalidCount} supplier payment record(s) were hidden because required payment details were missing or invalid.`);
      setPayments(next); setLastSuccessfulSync(mirror.lastSuccessfulSync); setIsStale(mirror.isStale); return next;
    } catch (reason) { setPayments([]); setIsStale(true); setError(reason instanceof Error ? reason.message : "Financial mirror request failed."); return []; }
    finally { setLoading(false); }
  }, []);
  return {
    payments, loading, error, lastSuccessfulSync, isStale, summary, getPayments,
    getPayment: async (id: number) => payments.find((payment) => payment.id === id) ?? null,
    addPayment, editPayment, markSettled, getSummary: async () => summary,
  };
}
