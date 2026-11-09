"use client";
import { useCallback, useState } from "react";
import type { FinancePaymentMethod } from "@/components/akilibiz/finance/finance-overview-data";
import { loadFinancialMirror } from "./financial-mirror-client";
import { mapCashFlowTransaction } from "./financial-mirror-mappers";
export type CashFlowType = "Inflow" | "Outflow";
export interface CashFlowRow {
  id: number; reference: string; flow_type: CashFlowType; category: string;
  amount: number; method: FinancePaymentMethod; date: string; description?: string | null;
}
export function useFinanceCashFlowData() {
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowRow[]>([]);
  const [cashFlowSummary] = useState<{
    total_inflow: number; total_outflow: number; net_cash_flow: number; transaction_count: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const refreshCashFlow = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const mirror = await loadFinancialMirror("finance_transactions");
      const rows = mirror.rows.map(mapCashFlowTransaction);
      setCashFlowEntries(rows); setLastSuccessfulSync(mirror.lastSuccessfulSync); setIsStale(mirror.isStale);
      return rows;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Cash-flow mirror request failed."); return []; }
    finally { setLoading(false); }
  }, []);
  return { cashFlowEntries, cashFlowSummary, loading, error, lastSuccessfulSync, isStale, refreshCashFlow, clearError: () => setError(null) };
}
