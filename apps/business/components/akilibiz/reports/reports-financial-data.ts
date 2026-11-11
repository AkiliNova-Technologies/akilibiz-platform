"use client";
import { useCallback, useState } from "react";
import { loadAllFinancialMirrorRows, type FinancialMirrorRow } from "@/components/akilibiz/finance/financial-mirror-client";

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
const empty = (): Record<FinancialReportTab, FinancialReportEntry[]> => ({
  receivables:[],payables:[],tax:[],"gross-profit":[],"profit-loss":[],
  journals:[],trial:[],"detailed-trial":[],"balance-sheet":[],
});
const positiveId = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v > 0;
const ugx = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const validDate = (v: unknown) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));

export function mapHostedJournalReports(
  accountRows: FinancialMirrorRow[],
  journalRows: FinancialMirrorRow[],
  lineRows: FinancialMirrorRow[],
): { journals: FinancialReportEntry[]; trial: FinancialReportEntry[]; summary: TrialBalanceSummary } {
  const accounts = new Map<number, Record<string, unknown>>();
  for (const row of accountRows) {
    if (!positiveId(row.localRecordId) || accounts.has(row.localRecordId) ||
        typeof row.record.code !== "string" || typeof row.record.name !== "string") {
      throw new Error("Synchronized chart of accounts is incomplete.");
    }
    accounts.set(row.localRecordId,row.record);
  }
  const journals = new Map<number, Record<string, unknown>>();
  for (const row of journalRows) {
    const r=row.record;
    if (!positiveId(row.localRecordId) || journals.has(row.localRecordId) ||
        r.status !== "posted" || !validDate(r.entry_date) ||
        typeof r.journal_number !== "string") {
      throw new Error("Synchronized journal entry is incomplete or not posted.");
    }
    journals.set(row.localRecordId,r);
  }
  const entryTotals = new Map<number,{ debit:number; credit:number; lines:number }>();
  const accountTotals = new Map<number,{ debit:number; credit:number }>();
  const detailed: FinancialReportEntry[] = [];
  for (const row of lineRows) {
    const r = row.record;
    const entryId = r.journal_entry_id;
    const accountId = r.account_id;
    if (!positiveId(row.localRecordId) || !positiveId(entryId) || !positiveId(accountId) ||
        !ugx(r.debit_ugx) || !ugx(r.credit_ugx) ||
        (r.debit_ugx > 0) === (r.credit_ugx > 0)) {
      throw new Error("Synchronized journal contains an invalid debit or credit.");
    }
    const entry = journals.get(entryId), account = accounts.get(accountId);
    if (!entry || !account) throw new Error("A journal line references an unsynchronized account or entry.");
    const subtotal = entryTotals.get(entryId) ?? {debit:0,credit:0,lines:0};
    subtotal.debit += r.debit_ugx; subtotal.credit += r.credit_ugx; subtotal.lines++;
    entryTotals.set(entryId,subtotal);
    const balance = accountTotals.get(accountId) ?? {debit:0,credit:0};
    balance.debit += r.debit_ugx;balance.credit += r.credit_ugx;
    accountTotals.set(accountId,balance);
    detailed.push({
      id:row.localRecordId,
      label:`${entry.journal_number} · ${account.code} · ${account.name}`,
      date: String(entry.entry_date), debit:r.debit_ugx, credit:r.credit_ugx,
      status:"Posted",detail:{journal:entry.journal_number,account:account.name,
        memo:typeof r.memo==="string"?r.memo:""},
    });
  }
  for (const [entryId,entry] of journals) {
    const totals=entryTotals.get(entryId);
    if (!totals || totals.lines<2 || totals.debit!==totals.credit || totals.debit<=0 ||
        !Number.isSafeInteger(totals.debit)) throw new Error("Synchronized journal is missing lines or is unbalanced.");
  }
  const trial: FinancialReportEntry[] = [];
  let debitTotal=0,creditTotal=0;
  for (const [accountId,amounts] of accountTotals) {
    const account=accounts.get(accountId)!;
    const net=amounts.debit-amounts.credit;
    const debit=Math.max(net,0),credit=Math.max(-net,0);
    debitTotal+=debit;creditTotal+=credit;
    trial.push({
      id:accountId,label:`${account.code} · ${account.name}`,date:"Selected period",
      debit,credit,status:"Posted",detail:{debits:amounts.debit,credits:amounts.credit},
    });
  }
  if (!Number.isSafeInteger(debitTotal) || !Number.isSafeInteger(creditTotal) || debitTotal!==creditTotal) {
    throw new Error("Synchronized trial balance does not balance.");
  }
  return {
    journals:detailed,trial:trial.sort((a,b)=>a.label.localeCompare(b.label)),
    summary:{total_debit_ugx:debitTotal,total_credit_ugx:creditTotal,balances_equal:true},
  };
}

export function useReportsFinancialData() {
  const [entries,setEntries] = useState<Record<FinancialReportTab,FinancialReportEntry[]>>(empty);
  const [trial,setTrial] = useState<TrialBalanceSummary|null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const refresh=useCallback(async () => {
    setLoading(true);setError(null);
    try {
      const [accounts,journals,lines]=await Promise.all([
        loadAllFinancialMirrorRows("chart_of_accounts"),
        loadAllFinancialMirrorRows("journal_entries"),
        loadAllFinancialMirrorRows("journal_lines"),
      ]);
      const parsed=mapHostedJournalReports(accounts,journals,lines);
      setEntries({...empty(),journals:parsed.journals,
        trial:parsed.trial,"detailed-trial":parsed.trial});
      setTrial(parsed.summary);
    } catch(cause) {
      setEntries(empty());setTrial(null);
      setError(cause instanceof Error?cause.message:"Accounting journals could not be loaded.");
    } finally {setLoading(false);}
  },[]);
  return {
    entries, grossProfit:null as GrossProfitReport|null,profitLoss:null as ProfitLossReport|null,
    trial,balanceSheet:null as BalanceSheetSummary|null,loading,error,refresh,
  };
}
