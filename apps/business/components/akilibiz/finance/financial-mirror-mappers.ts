import type { FinancialMirrorRow } from "./financial-mirror-client";
import { mirrorValue } from "./financial-mirror-client";
import type { FinanceOverviewTransaction, FinancePaymentMethod } from "./finance-overview-data";
import type { IncomeRow } from "./finance-income-data";
import type { CashFlowRow } from "./finance-cashflow-data";
import type { LedgerRow } from "./finance-ledger-data";

const text = (record: Record<string, unknown>, ...keys: string[]) =>
  String(mirrorValue(record, ...keys) ?? "");
const amount = (record: Record<string, unknown>, ...keys: string[]) =>
  Number(mirrorValue(record, ...keys) ?? 0);

export function mapFinanceTransaction(row: FinancialMirrorRow): FinanceOverviewTransaction {
  const type = text(row.record, "transaction_type").toLowerCase();
  return {
    id: row.localRecordId,
    reference: text(row.record, "reference", "public_id") || String(row.localRecordId),
    entry_type: type === "income" ? "Income" : "Expense",
    category: text(row.record, "source_name", "account_name", "category_id") || "Unclassified",
    amount: amount(row.record, "amount_ugx", "amount"),
    method: text(row.record, "payment_method") || "other",
    date: text(row.record, "transaction_date", "created_at"),
    description: text(row.record, "description") || null,
  };
}

export function mapIncomeTransaction(row: FinancialMirrorRow): IncomeRow | null {
  if (text(row.record, "transaction_type").toLowerCase() !== "income") return null;
  return {
    id: row.localRecordId,
    reference: text(row.record, "reference", "public_id") || String(row.localRecordId),
    category: text(row.record, "source_name", "account_name", "category_id") || "Unclassified",
    category_id: amount(row.record, "category_id"),
    amount: amount(row.record, "amount_ugx", "amount"),
    method: (text(row.record, "payment_method") || "other") as FinancePaymentMethod,
    source: text(row.record, "source_name", "counterparty_name", "payee_name") || "—",
    date: text(row.record, "transaction_date", "created_at"),
    status: text(row.record, "status").toLowerCase() === "cancelled" ? "cancelled" : "received",
    description: text(row.record, "description") || null,
  };
}

export function mapCashFlowTransaction(row: FinancialMirrorRow): CashFlowRow {
  const type = text(row.record, "transaction_type").toLowerCase();
  return {
    id: row.localRecordId,
    reference: text(row.record, "reference", "public_id") || String(row.localRecordId),
    flow_type: type === "income" ? "Inflow" : "Outflow",
    category: text(row.record, "source_name", "account_name", "category_id") || "Unclassified",
    amount: amount(row.record, "amount_ugx", "amount"),
    method: (text(row.record, "payment_method") || "other") as FinancePaymentMethod,
    date: text(row.record, "transaction_date", "created_at"),
    description: text(row.record, "description") || null,
  };
}

export function mapJournalLines(
  lines: FinancialMirrorRow[],
  entries: FinancialMirrorRow[],
  accounts: FinancialMirrorRow[],
): LedgerRow[] {
  const entryById = new Map(entries.map((row) => [row.localRecordId, row.record]));
  const accountById = new Map(accounts.map((row) => [row.localRecordId, row.record]));
  return lines.flatMap((row) => {
    const entryId = amount(row.record, "journal_entry_id");
    const accountId = amount(row.record, "account_id");
    const entry = entryById.get(entryId);
    const account = accountById.get(accountId);
    if (!entry || !account) return [];
    const debit = amount(row.record, "debit_ugx");
    const credit = amount(row.record, "credit_ugx");
    return [{
      id: row.localRecordId,
      reference: text(entry, "journal_number", "public_id") || String(entryId),
      entry_type: credit > 0 ? "Credit" as const : "Debit" as const,
      source: "Desktop journal",
      category: text(account, "account_type", "category_id") || "Unclassified",
      amount: credit > 0 ? credit : debit,
      account: [text(account, "code"), text(account, "name")].filter(Boolean).join(" · ") || String(accountId),
      recorded_by: text(entry, "created_by_name_snapshot") || "Desktop",
      date: text(entry, "entry_date", "created_at"),
      description: text(row.record, "memo") || text(entry, "description") || null,
    }];
  });
}
