"use client";
import { useCallback, useState } from "react";

export type FinancialReportTab =
  "receivables" | "payables" | "tax" | "gross-profit" | "profit-loss" |
  "journals" | "trial" | "detailed-trial" | "balance-sheet";
export interface FinancialReportEntry {
  id: number; label: string; date: string; amount?: number; debit?: number;
  credit?: number; status: string; detail: object;
}
export interface GrossProfitReport {
  revenue_ugx: number; cogs_ugx: number; gross_profit_ugx: number;
}
export interface ProfitLossReport {
  revenue_ugx: number; cogs_ugx: number; gross_profit_ugx: number;
  operating_expenses_ugx: number; net_profit_loss_ugx: number;
}
export interface TrialBalanceSummary {
  total_debit_ugx: number; total_credit_ugx: number; balances_equal: boolean;
}
export interface BalanceSheetSummary {
  assets_ugx: number; liabilities_ugx: number; equity_ugx: number;
  liabilities_and_equity_ugx: number; balances_equal: boolean;
}

export function useReportsFinancialData() {
  // Report results must be sourced from the authoritative hosted ledger.
  const [entries] = useState<Record<FinancialReportTab, FinancialReportEntry[]>>({
    receivables: [], payables: [], tax: [], "gross-profit": [], "profit-loss": [],
    journals: [], trial: [], "detailed-trial": [], "balance-sheet": [],
  });
  const grossProfit: GrossProfitReport | null = null;
  const profitLoss: ProfitLossReport | null = null;
  const trial: TrialBalanceSummary | null = null;
  const balanceSheet: BalanceSheetSummary | null = null;
  const refresh = useCallback(async () => null, []);
  return { entries, grossProfit, profitLoss, trial, balanceSheet, loading: false, refresh };
}
