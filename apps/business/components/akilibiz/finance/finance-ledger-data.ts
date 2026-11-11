"use client";
import { useCallback, useState } from "react";
import { loadFinancialMirror, loadAllFinancialMirrorRows } from "./financial-mirror-client";
import { mapJournalLines } from "./financial-mirror-mappers";
export type LedgerEntryType = "Debit" | "Credit";
export interface LedgerRow {
  id: number; reference: string; entry_type: LedgerEntryType;
  source: string; category: string; amount: number; account: string;
  recorded_by: string; date: string; description?: string | null;
}
export function useFinanceLedgerData() {
  const [ledgerEntries, setLedgerEntries] = useState<LedgerRow[]>([]);
  const [ledgerSummary, setLedgerSummary] = useState<{
    total_credits: number; total_debits: number; net_position: number; total_entries: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const refreshLedger = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [lines, entries, accounts, status] = await Promise.all([
        loadAllFinancialMirrorRows("journal_lines"),
        loadAllFinancialMirrorRows("journal_entries"),
        loadAllFinancialMirrorRows("chart_of_accounts"),
        loadFinancialMirror("journal_entries", {page:1,pageSize:1}),
      ]);
      const rows = mapJournalLines(lines, entries, accounts);
      if (rows.length !== lines.length) {
        throw new Error("Some synchronized journal lines are incomplete. Ledger totals cannot be verified.");
      }
      const credits = rows.filter(row => row.entry_type === "Credit")
        .reduce((sum,row) => sum + row.amount,0);
      const debits = rows.filter(row => row.entry_type === "Debit")
        .reduce((sum,row) => sum + row.amount,0);
      if (!Number.isSafeInteger(credits) || !Number.isSafeInteger(debits)) {
        throw new Error("The synchronized journal exceeds the supported financial amount range.");
      }
      setLedgerEntries(rows);
      setLedgerSummary({ total_credits:credits,total_debits:debits,
        net_position:credits-debits,total_entries:rows.length });
      setLastSuccessfulSync(status.lastSuccessfulSync);
      setIsStale(status.isStale);
      return rows;
    } catch (reason) {
      setLedgerEntries([]);setLedgerSummary(null);
      setError(reason instanceof Error ? reason.message : "Ledger mirror request failed.");
      return [];
    }
    finally { setLoading(false); }
  }, []);
  return { ledgerEntries, ledgerSummary, loading, error, lastSuccessfulSync, isStale, refreshLedger, clearError: () => setError(null) };
}
