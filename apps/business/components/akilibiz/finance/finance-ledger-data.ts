"use client";
import { useCallback, useState } from "react";
import { loadFinancialMirror } from "./financial-mirror-client";
import { mapJournalLines } from "./financial-mirror-mappers";
export type LedgerEntryType = "Debit" | "Credit";
export interface LedgerRow {
  id: number; reference: string; entry_type: LedgerEntryType;
  source: string; category: string; amount: number; account: string;
  recorded_by: string; date: string; description?: string | null;
}
export function useFinanceLedgerData() {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerRow[]>([]);
  const [ledgerSummary] = useState<{
    total_credits: number; total_debits: number; net_position: number; total_entries: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const refreshLedger = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [lines, entries, accounts] = await Promise.all([
        loadFinancialMirror("journal_lines"), loadFinancialMirror("journal_entries"), loadFinancialMirror("chart_of_accounts"),
      ]);
      const rows = mapJournalLines(lines.rows, entries.rows, accounts.rows);
      const times = [lines.lastSuccessfulSync, entries.lastSuccessfulSync, accounts.lastSuccessfulSync].filter((value): value is string => Boolean(value));
      setLedgerEntries(rows); setLastSuccessfulSync(times.sort()[0] ?? null); setIsStale(lines.isStale || entries.isStale || accounts.isStale);
      return rows;
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Ledger mirror request failed."); return []; }
    finally { setLoading(false); }
  }, []);
  return { ledgerEntries, ledgerSummary, loading, error, lastSuccessfulSync, isStale, refreshLedger, clearError: () => setError(null) };
}
