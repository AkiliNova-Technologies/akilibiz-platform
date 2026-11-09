"use client";

import { useCallback, useMemo, useState } from "react";
import type { FinancePaymentMethod } from "@/components/akilibiz/finance/finance-overview-data";

export type ExpenseStatus = "pending" | "approved" | "paid" | "rejected";
export type ExpenseState = "posted" | "voided" | "corrected" | "refunded";
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
  // The authoritative desktop expense ledger has not been connected to hosted finance.
  const [expenses] = useState<ExpenseRow[]>([]);
  const expenseCategories: ExpenseCategory[] = [];
  const expenseSummary = useMemo(() =>
    expenses.length > 0
      ? {
          total_expenses: expenses.filter((expense) => expense.state === "posted")
            .reduce((total, expense) => total + expense.gross_ugx, 0),
          paid_expenses: expenses.filter((expense) => expense.status === "paid")
            .reduce((total, expense) => total + expense.gross_ugx, 0),
          pending_expenses: expenses.filter((expense) =>
            expense.status === "pending" || expense.status === "approved",
          ).reduce((total, expense) => total + expense.gross_ugx, 0),
          expense_categories: new Set(expenses.map((expense) => expense.category_id)).size,
        }
      : null, [expenses]);
  const refreshExpenses = useCallback(async () => expenses, [expenses]);
  const addExpense = useCallback(async (_payload: CreateExpensePayload & { payee: string }): Promise<never> => unavailable(), []);
  const settleExpense = useCallback(async (_id: number, _amount: number, _reference: string): Promise<never> => unavailable(), []);
  const reverseExpense = useCallback(async (_id: number, _reason: string): Promise<never> => unavailable(), []);
  return {
    expenses, expenseSummary, expenseCategories, loading: false,
    error: null as string | null, refreshExpenses, addExpense, settleExpense, reverseExpense,
  };
}
