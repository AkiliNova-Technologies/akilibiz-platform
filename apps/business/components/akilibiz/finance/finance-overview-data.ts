"use client";
import { useCallback, useState } from "react";
import { loadFinancialMirror } from "./financial-mirror-client";
import { mapFinanceTransaction } from "./financial-mirror-mappers";
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
  const [overviewTransactions, setOverviewTransactions] = useState<FinanceOverviewTransaction[]>([]);
  const [overviewSummary] = useState<FinanceOverviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const refreshOverview = useCallback(async (options?: { limit?: number }) => {
    setLoading(true); setError(null);
    try {
      const mirror = await loadFinancialMirror("finance_transactions", { pageSize: options?.limit ?? 100 });
      const transactions = mirror.rows.map(mapFinanceTransaction);
      setOverviewTransactions(transactions); setLastSuccessfulSync(mirror.lastSuccessfulSync); setIsStale(mirror.isStale);
      return { overviewSummary: null, overviewTransactions: transactions };
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Financial mirror request failed.");
      return { overviewSummary: null, overviewTransactions: [] };
    } finally { setLoading(false); }
  }, []);
  return { overviewSummary, overviewTransactions, loading, error, lastSuccessfulSync, isStale, refreshOverview };
}
