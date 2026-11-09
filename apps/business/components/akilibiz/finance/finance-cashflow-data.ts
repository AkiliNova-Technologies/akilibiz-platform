"use client";
import { useCallback, useState } from "react";
import type { FinancePaymentMethod } from "@/components/akilibiz/finance/finance-overview-data";
export type CashFlowType = "Inflow" | "Outflow";
export interface CashFlowRow {
  id: number; reference: string; flow_type: CashFlowType; category: string;
  amount: number; method: FinancePaymentMethod; date: string; description?: string | null;
}
export function useFinanceCashFlowData() {
  const [cashFlowEntries] = useState<CashFlowRow[]>([]);
  const [cashFlowSummary] = useState<{
    total_inflow: number; total_outflow: number; net_cash_flow: number; transaction_count: number;
  } | null>(null);
  const refreshCashFlow = useCallback(async () => cashFlowEntries, [cashFlowEntries]);
  return { cashFlowEntries, cashFlowSummary, loading: false, error: null as string | null, refreshCashFlow, clearError: () => {} };
}
