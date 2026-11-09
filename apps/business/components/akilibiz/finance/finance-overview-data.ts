"use client";
import { useCallback, useState } from "react";
export type FinanceTransactionType = "Income" | "Expense";
export type FinancePaymentMethod = "cash" | "bank_transfer" | "mobile_money" | "card" | "cheque" | "other";
export interface FinanceOverviewSummary {
  total_income: number; total_expenses: number; net_balance: number; cash_position: number;
}
export interface FinanceOverviewTransaction {
  id: number; reference: string; entry_type: FinanceTransactionType;
  category: string; amount: number; method: string; date: string; description?: string | null;
}
export const formatFinanceCurrency = (amount: number) =>
  new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(amount);
export const formatFinanceDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-UG", { year: "numeric", month: "short", day: "numeric" });
};
export function useFinanceOverviewData() {
  // Hosted finance has no authoritative overview ledger connected.
  const [overviewTransactions] = useState<FinanceOverviewTransaction[]>([]);
  const [overviewSummary] = useState<FinanceOverviewSummary | null>(null);
  const refreshOverview = useCallback(async (_options?: { limit?: number }) => ({
    overviewSummary, overviewTransactions,
  }), [overviewTransactions]);
  return { overviewSummary, overviewTransactions, loading: false, refreshOverview };
}
