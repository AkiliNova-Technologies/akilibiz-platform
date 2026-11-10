import type { FinancialMirrorRow } from "./financial-mirror-client";
import { mirrorValue } from "./financial-mirror-client";
import { requiredAmount, requiredEnum, requiredId } from "./mirror-field-validation";
import type { FinanceOverviewTransaction, FinancePaymentMethod } from "./finance-overview-data";
import type { IncomeRow } from "./finance-income-data";
import type { CashFlowRow } from "./finance-cashflow-data";
import type { LedgerRow } from "./finance-ledger-data";

const text = (record: Record<string, unknown>, ...keys: string[]) =>
  String(mirrorValue(record, ...keys) ?? "");
const methods = ["cash", "bank_transfer", "mobile_money", "card", "cheque", "other"] as const;
function validatedTransaction(row: FinancialMirrorRow) {
  const record = row.record;
  const type = requiredEnum(record, "transaction_type", ["income", "expense"] as const);
  const amount = requiredAmount(record, "amount_ugx", "amount");
  const method = requiredEnum(record, "payment_method", methods);
  const date = text(record, "transaction_date", "created_at");
  if (!date || Number.isNaN(Date.parse(date))) throw new Error("Missing transaction date");
  return { type, amount, method, date };
}
export function mapFinanceTransaction(row: FinancialMirrorRow): FinanceOverviewTransaction | null {
  try {
    const { type, amount, method, date } = validatedTransaction(row);
    return {
      id: row.localRecordId,
      reference: text(row.record, "reference", "public_id") || String(row.localRecordId),
      entry_type: type === "income" ? "Income" : "Expense",
      category: text(row.record, "source_name", "account_name", "category_id") || "Unclassified",
      amount, method, date, description: text(row.record, "description") || null,
    };
  } catch { return null; }
}

export function mapIncomeTransaction(row: FinancialMirrorRow): IncomeRow | null {
  if (text(row.record, "transaction_type").toLowerCase() !== "income") return null;
  try {
    const { amount, method, date } = validatedTransaction(row);
    const status = requiredEnum(row.record, "status", ["pending", "received", "verified", "cancelled"] as const);
    return {
      id: row.localRecordId,
      reference: text(row.record, "reference", "public_id") || String(row.localRecordId),
      category: text(row.record, "source_name", "account_name", "category_id") || "Unclassified",
      category_id: requiredId(row.record, "category_id"),
      amount, method: method as FinancePaymentMethod,
      source: text(row.record, "source_name", "counterparty_name", "payee_name") || "—",
      date, status, description: text(row.record, "description") || null,
    };
  } catch { return null; }
}

export function mapCashFlowTransaction(row: FinancialMirrorRow): CashFlowRow | null {
  try {
    const { type, amount, method, date } = validatedTransaction(row);
    return {
      id: row.localRecordId,
      reference: text(row.record, "reference", "public_id") || String(row.localRecordId),
      flow_type: type === "income" ? "Inflow" : "Outflow",
      category: text(row.record, "source_name", "account_name", "category_id") || "Unclassified",
      amount, method: method as FinancePaymentMethod, date,
      description: text(row.record, "description") || null,
    };
  } catch { return null; }
}

export function mapJournalLines(
  lines: FinancialMirrorRow[],
  entries: FinancialMirrorRow[],
  accounts: FinancialMirrorRow[],
): LedgerRow[] {
  const entryById = new Map(entries.map((row) => [row.localRecordId, row.record]));
  const accountById = new Map(accounts.map((row) => [row.localRecordId, row.record]));
  return lines.flatMap((row) => {
    try {
      const entryId = requiredId(row.record, "journal_entry_id");
      const accountId = requiredId(row.record, "account_id");
      const entry = entryById.get(entryId);
      const account = accountById.get(accountId);
      if (!entry || !account) return [];
      const debit = requiredAmount(row.record, "debit_ugx");
      const credit = requiredAmount(row.record, "credit_ugx");
      if ((debit > 0) === (credit > 0)) return [];
      const date = text(entry, "entry_date", "created_at");
      if (!date || Number.isNaN(Date.parse(date))) return [];
      return [{
        id: row.localRecordId,
        reference: text(entry, "journal_number", "public_id") || String(entryId),
        entry_type: credit > 0 ? "Credit" as const : "Debit" as const,
        source: "Desktop journal",
        category: text(account, "account_type", "category_id") || "Unclassified",
        amount: credit > 0 ? credit : debit,
        account: [text(account, "code"), text(account, "name")].filter(Boolean).join(" · ") || String(accountId),
        recorded_by: text(entry, "created_by_name_snapshot") || "Desktop",
        date, description: text(row.record, "memo") || text(entry, "description") || null,
      }];
    } catch { return []; }
  });
}
