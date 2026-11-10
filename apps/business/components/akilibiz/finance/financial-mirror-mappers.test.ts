import { describe, expect, it } from "vitest";
import { mapCashFlowTransaction, mapIncomeTransaction, mapJournalLines } from "./financial-mirror-mappers";
import type { FinancialMirrorRow } from "./financial-mirror-client";

const row = (id: number, record: Record<string, unknown>): FinancialMirrorRow => ({ localRecordId: id, capturedAt: "2026-11-09T10:00:00Z", record });

describe("financial mirror presentation", () => {
  it("presents authoritative income without inventing totals", () => {
    const source = row(4, { id: 4, reference: "FIN-4", transaction_type: "income", amount_ugx: 25000, category_id: 2, status: "received", payment_method: "cash", transaction_date: "2026-11-09", source_name: "Sale" });
    expect(mapIncomeTransaction(source)).toMatchObject({ id: 4, reference: "FIN-4", amount: 25000, source: "Sale", status: "received" });
    expect(mapCashFlowTransaction(source)?.flow_type).toBe("Inflow");
  });

  it("does not invent money or payment states when source fields are absent", () => {
    expect(mapIncomeTransaction(row(1, {transaction_type: "income", amount_ugx: 0, category_id: 1, payment_method: "cash", transaction_date: "2026-11-09"}))).toBeNull();
    expect(mapCashFlowTransaction(row(2, {transaction_type: "income", payment_method: "cash", transaction_date: "2026-11-09"}))).toBeNull();
    expect(mapCashFlowTransaction(row(3, {transaction_type: "unknown", amount_ugx: 100, payment_method: "cash", transaction_date: "2026-11-09"}))).toBeNull();
  });

  it("joins mirrored journal lines only to matching authoritative entry and account records", () => {
    const result = mapJournalLines(
      [row(30, { journal_entry_id: 10, account_id: 20, debit_ugx: 5000, credit_ugx: 0, memo: "Cash received" }), row(31, { journal_entry_id: 999, account_id: 20, debit_ugx: 1, credit_ugx: 0 })],
      [row(10, { journal_number: "JRN-10", entry_date: "2026-11-09", description: "Receipt" })],
      [row(20, { code: "1000", name: "Cash", account_type: "asset" })],
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ reference: "JRN-10", entry_type: "Debit", amount: 5000, account: "1000 · Cash" });
  });
});
