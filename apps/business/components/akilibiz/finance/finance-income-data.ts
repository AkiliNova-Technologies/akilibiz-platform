"use client";
import { useCallback, useState } from "react";
import type { FinancePaymentMethod } from "@/components/akilibiz/finance/finance-overview-data";

export type IncomeStatus = "pending" | "received" | "verified" | "cancelled";
export interface IncomeCategory {
  id: number; name: string; category_type: "income";
  description?: string | null; is_active: boolean;
}
export interface IncomeRow {
  id: number; reference: string; category: string; category_id: number;
  amount: number; method: FinancePaymentMethod; source: string;
  date: string; status: IncomeStatus; description?: string | null;
}
export interface CreateIncomePayload {
  category_id: number; amount: number; payment_method: FinancePaymentMethod;
  source_name?: string | null; transaction_date: string; status: IncomeStatus;
  description?: string | null;
}
export interface IncomeSummary {
  total_income: number; received_income: number; pending_income: number; income_categories: number;
}

export function useFinanceIncomeData() {
  // Real income data and posting are not yet connected to hosted finance.
  const [incomeEntries] = useState<IncomeRow[]>([]);
  const incomeSummary: IncomeSummary | null = null;
  const incomeCategories: IncomeCategory[] = [];
  const addIncomeEntry = useCallback(async (_payload: CreateIncomePayload): Promise<never> => {
    throw new Error("Income recording is unavailable until hosted finance posting is connected.");
  }, []);
  const refreshIncome = useCallback(async () => incomeEntries, [incomeEntries]);
  return { incomeEntries, incomeSummary, incomeCategories, loading: false,
    error: null as string | null, refreshIncome, addIncomeEntry, clearError: () => {} };
}
