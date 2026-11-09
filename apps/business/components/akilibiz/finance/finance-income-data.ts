"use client";
import { useCallback, useState } from "react";
import type { FinancePaymentMethod } from "@/components/akilibiz/finance/finance-overview-data";
import { loadFinancialMirror } from "./financial-mirror-client";
import { mapIncomeTransaction } from "./financial-mirror-mappers";

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
  const [incomeEntries, setIncomeEntries] = useState<IncomeRow[]>([]);
  const [incomeSummary] = useState<IncomeSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const incomeCategories: IncomeCategory[] = [];
  const addIncomeEntry = useCallback(async (_payload: CreateIncomePayload): Promise<never> => {
    throw new Error("Income recording is unavailable until hosted finance posting is connected.");
  }, []);
  const refreshIncome = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const mirror = await loadFinancialMirror("finance_transactions");
      const rows = mirror.rows.flatMap((row) => mapIncomeTransaction(row) ?? []);
      setIncomeEntries(rows); setLastSuccessfulSync(mirror.lastSuccessfulSync); setIsStale(mirror.isStale);
      return rows;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Income mirror request failed."); return []; }
    finally { setLoading(false); }
  }, []);
  return { incomeEntries, incomeSummary, incomeCategories, loading,
    error, lastSuccessfulSync, isStale, refreshIncome, addIncomeEntry, clearError: () => setError(null) };
}
