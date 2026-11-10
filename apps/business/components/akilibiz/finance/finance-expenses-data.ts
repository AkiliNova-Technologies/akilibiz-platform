"use client";

import { useCallback, useState } from "react";
import type { FinancePaymentMethod } from "@/components/akilibiz/finance/finance-overview-data";
import { loadFinancialMirror, mirrorValue } from "@/components/akilibiz/finance/financial-mirror-client";
import { requiredAmount, requiredEnum, requiredId } from "@/components/akilibiz/finance/mirror-field-validation";

export type ExpenseStatus = "pending" | "approved" | "paid" | "rejected";
export type ExpenseState = "draft" | "posted" | "cancelled" | "voided" | "corrected" | "refunded";
export interface ExpenseCategory { id: number; name: string; is_active: boolean; }
export interface ExpenseRow {
  id: number; reference: string; category: string; category_id: number;
  payee: string; supplier_id?: number; net_ugx: number; tax_ugx: number;
  gross_ugx: number; effective_date: string; due_date?: string | null;
  method: FinancePaymentMethod; status: ExpenseStatus; state: ExpenseState;
  payment_basis: "paid" | "supplier_credit"; payable_outstanding_ugx?: number;
  invoice_reference?: string; invoice_issuer?: string; document_date?: string;
  description?: string;
}
export interface CreateExpensePayload {
  category_id: number; payment_basis: "paid" | "supplier_credit";
  supplier_id?: number; payee_name?: string; payment_method: FinancePaymentMethod;
  effective_date: string; net_ugx: number; tax_ugx: number; gross_ugx: number;
  input_vat_eligible: boolean; source_document_date?: string;
  invoice_reference?: string; invoice_issuer?: string;
  status: ExpenseStatus; description?: string;
}

const unavailable = (): never => {
  throw new Error("Expense transactions cannot be recorded until hosted finance posting is connected.");
};
export function useFinanceExpensesData() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const expenseCategories: ExpenseCategory[] = [];
  // Totals remain unavailable until the desktop publishes an authoritative
  // summary domain; the web client must not recreate accounting calculations.
  const [expenseSummary] = useState<{ total_expenses: number; paid_expenses: number; pending_expenses: number; expense_categories: number } | null>(null);
  const refreshExpenses = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const mirror = await loadFinancialMirror("authoritative_expenses");
      let invalidCount = 0;
      const next = mirror.rows.flatMap(({ localRecordId, record }) => {
        try {
        const state = requiredEnum(record, "state", ["draft", "posted", "cancelled", "voided", "corrected", "refunded"] as const);
        const status = requiredEnum(record, "status", ["pending", "approved", "paid", "rejected"] as const);
        const paymentBasis = requiredEnum(record, "payment_basis", ["paid", "supplier_credit"] as const);
        const method = requiredEnum(record, "payment_method", ["cash", "mobile_money", "bank_transfer", "card", "cheque", "other"] as const);
        return [{
          id: localRecordId,
          reference: String(mirrorValue(record, "reference", "public_id") ?? localRecordId),
          category: String(mirrorValue(record, "category_name_snapshot") ?? "Unclassified"),
          category_id: requiredId(record, "category_id"),
          payee: String(mirrorValue(record, "payee_name") ?? "—"),
          supplier_id: Number(mirrorValue(record, "supplier_id") ?? 0) || undefined,
          net_ugx: requiredAmount(record, "net_ugx"),
          tax_ugx: requiredAmount(record, "tax_ugx"),
          gross_ugx: requiredAmount(record, "gross_ugx"),
          effective_date: String(mirrorValue(record, "effective_date") ?? ""),
          method: method as FinancePaymentMethod,
          status,
          state,
          payment_basis: paymentBasis,
          invoice_reference: String(mirrorValue(record, "invoice_reference") ?? "") || undefined,
          invoice_issuer: String(mirrorValue(record, "invoice_issuer") ?? "") || undefined,
          document_date: String(mirrorValue(record, "invoice_document_date", "source_document_date") ?? "") || undefined,
          description: String(mirrorValue(record, "description") ?? "") || undefined,
        }];
        } catch {
          invalidCount += 1;
          return [];
        }
      });
      if (invalidCount) setError(`${invalidCount} expense record(s) were hidden because required financial details were missing or invalid.`);
      setExpenses(next); setLastSuccessfulSync(mirror.lastSuccessfulSync); setIsStale(mirror.isStale); return next;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Financial mirror request failed."); return []; }
    finally { setLoading(false); }
  }, []);
  const addExpense = useCallback(async (_payload: CreateExpensePayload & { payee: string }): Promise<never> => unavailable(), []);
  const settleExpense = useCallback(async (_id: number, _amount: number, _reference: string): Promise<never> => unavailable(), []);
  const reverseExpense = useCallback(async (_id: number, _reason: string): Promise<never> => unavailable(), []);
  return {
    expenses, expenseSummary, expenseCategories, loading,
    error, lastSuccessfulSync, isStale, refreshExpenses, addExpense, settleExpense, reverseExpense,
  };
}
