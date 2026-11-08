"use client";

import { useCallback, useMemo, useState } from "react";
import type { FinancePaymentMethod } from "@/components/akilibiz/finance/finance-overview-data";

export type CashFlowType = "Inflow" | "Outflow";
export interface CashFlowRow { id: number; reference: string; flow_type: CashFlowType; category: string; amount: number; method: FinancePaymentMethod; date: string; description?: string | null; }

const initialEntries: CashFlowRow[] = [
  { id: 1, reference: "SAL-20260919-001", flow_type: "Inflow", category: "Sales Revenue", amount: 420000, method: "mobile_money", date: "2026-09-19", description: "Point-of-sale sales receipt" },
  { id: 2, reference: "EXP-20260918-001", flow_type: "Outflow", category: "Stock Purchase", amount: 100000, method: "bank_transfer", date: "2026-09-18", description: "Supplier settlement" },
  { id: 3, reference: "SAL-20260917-002", flow_type: "Inflow", category: "Sales Revenue", amount: 315000, method: "cash", date: "2026-09-17", description: "Point-of-sale sales receipt" },
  { id: 4, reference: "EXP-20260916-001", flow_type: "Outflow", category: "Utilities", amount: 85000, method: "mobile_money", date: "2026-09-16", description: "Utility payment" },
];

export function useFinanceCashFlowData() {
  const [cashFlowEntries] = useState<CashFlowRow[]>(initialEntries);
  const cashFlowSummary = useMemo(() => { const total_inflow = cashFlowEntries.filter((entry) => entry.flow_type === "Inflow").reduce((total, entry) => total + entry.amount, 0); const total_outflow = cashFlowEntries.filter((entry) => entry.flow_type === "Outflow").reduce((total, entry) => total + entry.amount, 0); return { total_inflow, total_outflow, net_cash_flow: total_inflow - total_outflow, transaction_count: cashFlowEntries.length }; }, [cashFlowEntries]);
  const refreshCashFlow = useCallback(async () => cashFlowEntries, [cashFlowEntries]);
  return { cashFlowEntries, cashFlowSummary, loading: false, error: null as string | null, refreshCashFlow, clearError: () => {} };
}
