"use client";

import { useCallback, useMemo, useState } from "react";

export type LedgerEntryType = "Debit" | "Credit";
export interface LedgerRow { id: number; reference: string; entry_type: LedgerEntryType; source: string; category: string; amount: number; account: string; recorded_by: string; date: string; description?: string | null; }

const initialEntries: LedgerRow[] = [
  { id: 1, reference: "SAL-20260919-001", entry_type: "Credit", source: "Sales", category: "Sales Revenue", amount: 420000, account: "Cash on Hand", recorded_by: "System", date: "2026-09-19", description: "Point-of-sale sales receipt" },
  { id: 2, reference: "EXP-20260918-001", entry_type: "Debit", source: "Expenses", category: "Stock Purchase", amount: 100000, account: "Accounts Payable", recorded_by: "System", date: "2026-09-18", description: "Supplier stock settlement" },
  { id: 3, reference: "SAL-20260917-002", entry_type: "Credit", source: "Sales", category: "Sales Revenue", amount: 315000, account: "Cash on Hand", recorded_by: "System", date: "2026-09-17", description: "Point-of-sale sales receipt" },
  { id: 4, reference: "EXP-20260916-001", entry_type: "Debit", source: "Expenses", category: "Utilities", amount: 85000, account: "Cash on Hand", recorded_by: "System", date: "2026-09-16", description: "Utility payment" },
];

export function useFinanceLedgerData() {
  const [ledgerEntries] = useState<LedgerRow[]>(initialEntries);
  const ledgerSummary = useMemo(() => { const total_credits = ledgerEntries.filter((entry) => entry.entry_type === "Credit").reduce((total, entry) => total + entry.amount, 0); const total_debits = ledgerEntries.filter((entry) => entry.entry_type === "Debit").reduce((total, entry) => total + entry.amount, 0); return { total_credits, total_debits, net_position: total_credits - total_debits, total_entries: ledgerEntries.length }; }, [ledgerEntries]);
  const refreshLedger = useCallback(async () => ledgerEntries, [ledgerEntries]);
  return { ledgerEntries, ledgerSummary, loading: false, error: null as string | null, refreshLedger, clearError: () => {} };
}
