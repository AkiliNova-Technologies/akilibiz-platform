"use client";

import { useCallback, useMemo, useState } from "react";
import type { FinancePaymentMethod } from "@/components/akilibiz/finance/finance-overview-data";

export type IncomeStatus = "pending" | "received" | "verified" | "cancelled";

export interface IncomeCategory {
  id: number;
  name: string;
  category_type: "income";
  description?: string | null;
  is_active: boolean;
}

export interface IncomeRow {
  id: number;
  reference: string;
  category: string;
  category_id: number;
  amount: number;
  method: FinancePaymentMethod;
  source: string;
  date: string;
  status: IncomeStatus;
  description?: string | null;
}

export interface CreateIncomePayload {
  category_id: number;
  amount: number;
  payment_method: FinancePaymentMethod;
  source_name?: string | null;
  transaction_date: string;
  status: IncomeStatus;
  description?: string | null;
}

const initialIncome: IncomeRow[] = [
  { id: 1, reference: "INC-20260919-001", category: "Sales Revenue", category_id: 1, amount: 420000, method: "mobile_money", source: "Point of Sale", date: "2026-09-19", status: "received", description: "Point-of-sale sales receipt" },
  { id: 2, reference: "INC-20260917-001", category: "Sales Revenue", category_id: 1, amount: 315000, method: "cash", source: "Point of Sale", date: "2026-09-17", status: "verified", description: "Point-of-sale sales receipt" },
  { id: 3, reference: "INC-20260916-001", category: "Other Income", category_id: 2, amount: 50000, method: "bank_transfer", source: "Service income", date: "2026-09-16", status: "pending", description: "Awaiting confirmation" },
];

const incomeCategories: IncomeCategory[] = [
  { id: 1, name: "Sales Revenue", category_type: "income", is_active: true },
  { id: 2, name: "Other Income", category_type: "income", is_active: true },
  { id: 3, name: "Service Income", category_type: "income", is_active: true },
];

export function useFinanceIncomeData() {
  const [incomeEntries, setIncomeEntries] = useState<IncomeRow[]>(initialIncome);
  const incomeSummary = useMemo(() => ({
    total_income: incomeEntries.filter((entry) => entry.status !== "cancelled").reduce((total, entry) => total + entry.amount, 0),
    received_income: incomeEntries.filter((entry) => entry.status === "received" || entry.status === "verified").reduce((total, entry) => total + entry.amount, 0),
    pending_income: incomeEntries.filter((entry) => entry.status === "pending").reduce((total, entry) => total + entry.amount, 0),
    income_categories: incomeCategories.length,
  }), [incomeEntries]);
  const addIncomeEntry = useCallback(async (payload: CreateIncomePayload) => {
    const category = incomeCategories.find((item) => item.id === payload.category_id);
    if (!category) return null;
    const entry: IncomeRow = { id: Date.now(), reference: `INC-${payload.transaction_date.replaceAll("-", "")}-${String(Date.now()).slice(-3)}`, category: category.name, category_id: category.id, amount: payload.amount, method: payload.payment_method, source: payload.source_name ?? "", date: payload.transaction_date, status: payload.status, description: payload.description ?? null };
    setIncomeEntries((entries) => [entry, ...entries]);
    return entry;
  }, []);
  const refreshIncome = useCallback(async () => incomeEntries, [incomeEntries]);
  return { incomeEntries, incomeSummary, incomeCategories, loading: false, error: null as string | null, refreshIncome, addIncomeEntry, clearError: () => {} };
}
