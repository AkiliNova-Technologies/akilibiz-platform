"use client";

import { useCallback, useState } from "react";

export type FinanceTransactionType = "Income" | "Expense";
export type FinancePaymentMethod = "cash" | "bank_transfer" | "mobile_money" | "card" | "cheque" | "other";

export interface FinanceOverviewSummary {
  total_income: number;
  total_expenses: number;
  net_balance: number;
  cash_position: number;
}

export interface FinanceOverviewTransaction {
  id: number;
  reference: string;
  entry_type: FinanceTransactionType;
  category: string;
  amount: number;
  method: string;
  date: string;
  description?: string | null;
}

const transactions: FinanceOverviewTransaction[] = [
  { id: 1, reference: "SAL-20260919-001", entry_type: "Income", category: "Sales Revenue", amount: 420000, method: "mobile_money", date: "2026-09-19", description: "Point-of-sale sales receipt" },
  { id: 2, reference: "EXP-20260918-001", entry_type: "Expense", category: "Stock Purchase", amount: 100000, method: "bank_transfer", date: "2026-09-18", description: "Supplier settlement" },
  { id: 3, reference: "SAL-20260917-002", entry_type: "Income", category: "Sales Revenue", amount: 315000, method: "cash", date: "2026-09-17", description: "Point-of-sale sales receipt" },
  { id: 4, reference: "EXP-20260916-001", entry_type: "Expense", category: "Utilities", amount: 85000, method: "mobile_money", date: "2026-09-16", description: "Utility payment" },
];

export const formatFinanceCurrency = (amount: number) =>
  new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(amount);

export const formatFinanceDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-UG", { year: "numeric", month: "short", day: "numeric" });
};

export function useFinanceOverviewData() {
  const [overviewTransactions] = useState<FinanceOverviewTransaction[]>(transactions);
  const overviewSummary: FinanceOverviewSummary = {
    total_income: overviewTransactions.filter((transaction) => transaction.entry_type === "Income").reduce((total, transaction) => total + transaction.amount, 0),
    total_expenses: overviewTransactions.filter((transaction) => transaction.entry_type === "Expense").reduce((total, transaction) => total + transaction.amount, 0),
    net_balance: 0,
    cash_position: 550000,
  };
  overviewSummary.net_balance = overviewSummary.total_income - overviewSummary.total_expenses;
  const refreshOverview = useCallback(async (_options?: { limit?: number }) => ({ overviewSummary, overviewTransactions }), [overviewSummary, overviewTransactions]);
  return { overviewSummary, overviewTransactions, loading: false, refreshOverview };
}
