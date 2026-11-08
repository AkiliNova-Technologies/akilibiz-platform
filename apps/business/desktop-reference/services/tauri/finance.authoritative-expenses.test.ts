import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

import { tauriFinanceService } from "./finance";

describe("authoritative expense UI API contract", () => {
  beforeEach(() => invoke.mockReset());

  it("submits exact paid or supplier-credit expense evidence without legacy fields", async () => {
    invoke.mockResolvedValue({ id: 9, state: "posted" });
    await tauriFinanceService.createAuthoritativeExpense({
      category_id: 4, payment_basis: "supplier_credit", supplier_id: 7,
      payment_method: "cash", effective_date: "2026-06-15", source_document_date: "2026-06-14",
      net_ugx: 1000, tax_ugx: 180, gross_ugx: 1180, input_vat_eligible: true,
      non_deductible: false, invoice_reference: "INV-9", invoice_issuer: "Supplier",
      idempotency_key: "request-1",
    });
    expect(invoke).toHaveBeenCalledWith("create_authoritative_expense", expect.objectContaining({ payload: expect.objectContaining({ payment_basis: "supplier_credit", supplier_id: 7, gross_ugx: 1180 }) }));
  });

  it("sends the entered exact partial-payment amount and a reversal-only void request", async () => {
    invoke.mockResolvedValueOnce(22).mockResolvedValueOnce({ id: 9, state: "voided" });
    await tauriFinanceService.settleExpensePayable({ payable_id: 3, amount_ugx: 400, effective_date: "2026-06-15", payment_method: "cash", reference: "PAY-1", idempotency_key: "settle-1" });
    await tauriFinanceService.voidAuthoritativeExpense(9, { effective_date: "2026-06-15", reason: "Invoice cancelled", idempotency_key: "void-1" });
    expect(invoke).toHaveBeenNthCalledWith(1, "settle_expense_payable", { payload: expect.objectContaining({ amount_ugx: 400 }) });
    expect(invoke).toHaveBeenNthCalledWith(2, "void_authoritative_expense", { expenseId: 9, payload: expect.objectContaining({ reason: "Invoice cancelled" }) });
  });
});
