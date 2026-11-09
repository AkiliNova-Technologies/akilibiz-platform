"use client";
import { useCallback, useState } from "react";
export type LedgerEntryType = "Debit" | "Credit";
export interface LedgerRow {
  id: number; reference: string; entry_type: LedgerEntryType;
  source: string; category: string; amount: number; account: string;
  recorded_by: string; date: string; description?: string | null;
}
export function useFinanceLedgerData() {
  const [ledgerEntries] = useState<LedgerRow[]>([]);
  const [ledgerSummary] = useState<{
    total_credits: number; total_debits: number; net_position: number; total_entries: number;
  } | null>(null);
  const refreshLedger = useCallback(async () => ledgerEntries, [ledgerEntries]);
  return { ledgerEntries, ledgerSummary, loading: false, error: null as string | null, refreshLedger, clearError: () => {} };
}
