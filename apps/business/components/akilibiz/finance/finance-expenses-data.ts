"use client";

import { useCallback, useState } from "react";
import type { FinancePaymentMethod } from "@/components/akilibiz/finance/finance-overview-data";
import {
  loadAllFinancialMirrorRows,
  loadFinancialMirror,
  mirrorValue,
} from "@/components/akilibiz/finance/financial-mirror-client";
import {
  requiredAmount,
  requiredEnum,
  requiredId,
} from "@/components/akilibiz/finance/mirror-field-validation";

export type ExpenseStatus = "pending" | "approved" | "paid" | "rejected";
export type ExpenseState =
  "draft" | "posted" | "cancelled" | "voided" | "corrected" | "refunded";
export interface ExpenseCategory {
  id: number;
  name: string;
  is_active: boolean;
}
export interface ExpenseRow {
  id: number;
  reference: string;
  category: string;
  category_id: number;
  payee: string;
  supplier_id?: number;
  net_ugx: number;
  tax_ugx: number;
  gross_ugx: number;
  effective_date: string;
  due_date?: string | null;
  method: FinancePaymentMethod;
  status: ExpenseStatus;
  state: ExpenseState;
  payment_basis: "paid" | "supplier_credit";
  payable_outstanding_ugx?: number;
  invoice_reference?: string;
  invoice_issuer?: string;
  document_date?: string;
  description?: string;
}
export interface CreateExpensePayload {
  category_id: number;
  payment_basis: "paid" | "supplier_credit";
  supplier_id?: number;
  payee_name?: string;
  payment_method: FinancePaymentMethod;
  effective_date: string;
  net_ugx: number;
  tax_ugx: number;
  gross_ugx: number;
  input_vat_eligible: boolean;
  source_document_date?: string;
  invoice_reference?: string;
  invoice_issuer?: string;
  status: ExpenseStatus;
  description?: string;
}
export function useFinanceExpensesData() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSuccessfulSync, setLastSuccessfulSync] = useState<string | null>(
    null,
  );
  const [isStale, setIsStale] = useState(false);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>(
    [],
  );
  const [sourceBusinessPublicId, setSourceBusinessPublicId] = useState("");
  // Totals remain unavailable until the desktop publishes an authoritative
  // summary domain; the web client must not recreate accounting calculations.
  const [expenseSummary] = useState<{
    total_expenses: number;
    paid_expenses: number;
    pending_expenses: number;
    expense_categories: number;
  } | null>(null);
  const refreshExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mirror, payableRows, businessProfile] = await Promise.all([
        loadFinancialMirror("authoritative_expenses"),
        loadAllFinancialMirrorRows("expense_payables"),
        loadFinancialMirror("business_profile"),
      ]);
      const completeRows =
        mirror.total > mirror.rows.length
          ? await loadAllFinancialMirrorRows("authoritative_expenses")
          : mirror.rows;
      let invalidCount = 0;
      const payableByExpense = new Map(
        payableRows.map((row) => [Number(row.record.expense_id), row.record]),
      );
      const categories = new Map<number, string>();
      const next = completeRows.flatMap(({ localRecordId, record }) => {
        try {
          const state = requiredEnum(record, "state", [
            "draft",
            "posted",
            "cancelled",
            "voided",
            "corrected",
            "refunded",
          ] as const);
          const paymentBasis = requiredEnum(record, "payment_basis", [
            "paid",
            "supplier_credit",
          ] as const);
          const payable = payableByExpense.get(localRecordId);
          const outstanding = Number(payable?.outstanding_amount_ugx ?? 0);
          const status: ExpenseStatus =
            state === "posted"
              ? paymentBasis === "paid" || outstanding === 0
                ? "paid"
                : "approved"
              : state === "draft"
                ? "pending"
                : "rejected";
          const method = requiredEnum(record, "payment_method", [
            "cash",
            "mobile_money",
            "bank_transfer",
            "card",
            "cheque",
            "other",
          ] as const);
          const categoryId = requiredId(record, "category_id");
          categories.set(
            categoryId,
            String(mirrorValue(record, "category_name_snapshot") ?? "Expense"),
          );
          return [
            {
              id: localRecordId,
              reference: String(
                mirrorValue(record, "reference", "public_id") ?? localRecordId,
              ),
              category: String(
                mirrorValue(record, "category_name_snapshot") ?? "Unclassified",
              ),
              category_id: categoryId,
              payee: String(mirrorValue(record, "payee_name") ?? "—"),
              supplier_id:
                Number(mirrorValue(record, "supplier_id") ?? 0) || undefined,
              net_ugx: requiredAmount(record, "net_ugx"),
              tax_ugx: requiredAmount(record, "tax_ugx"),
              gross_ugx: requiredAmount(record, "gross_ugx"),
              effective_date: String(
                mirrorValue(record, "effective_date") ?? "",
              ),
              method: method as FinancePaymentMethod,
              status,
              state,
              payment_basis: paymentBasis,
              payable_outstanding_ugx: outstanding,
              invoice_reference:
                String(mirrorValue(record, "invoice_reference") ?? "") ||
                undefined,
              invoice_issuer:
                String(mirrorValue(record, "invoice_issuer") ?? "") ||
                undefined,
              document_date:
                String(
                  mirrorValue(
                    record,
                    "invoice_document_date",
                    "source_document_date",
                  ) ?? "",
                ) || undefined,
              description:
                String(mirrorValue(record, "description") ?? "") || undefined,
            },
          ];
        } catch {
          invalidCount += 1;
          return [];
        }
      });
      setSourceBusinessPublicId(
        completeRows.find((row) => row.localBusinessPublicId)
          ?.localBusinessPublicId ??
          payableRows.find((row) => row.localBusinessPublicId)
            ?.localBusinessPublicId ??
          businessProfile.rows.find((row) => row.localBusinessPublicId)
            ?.localBusinessPublicId ??
          "",
      );
      setExpenseCategories(
        [...categories].map(([id, name]) => ({ id, name, is_active: true })),
      );
      if (invalidCount)
        setError(
          `${invalidCount} expense record(s) were hidden because required details or supplier-credit settlement evidence were unavailable.`,
        );
      setExpenses(next);
      setLastSuccessfulSync(mirror.lastSuccessfulSync);
      setIsStale(mirror.isStale);
      return next;
    } catch (reason) {
      setExpenses([]);
      setIsStale(true);
      setError(
        reason instanceof Error
          ? reason.message
          : "Financial mirror request failed.",
      );
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  const submit = useCallback(
    async (body: Record<string, unknown>) => {
      if (!sourceBusinessPublicId)
        throw new Error("Wait for the desktop expense records to synchronize.");
      const response = await fetch("/api/finance/expenses/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: crypto.randomUUID(),
          sourceBusinessPublicId,
          ...body,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(
          result.error ?? "Unable to send the expense for approval.",
        );
      return result;
    },
    [sourceBusinessPublicId],
  );
  const methodName = (value: FinancePaymentMethod) =>
    ({
      cash: "Cash",
      bank_transfer: "Bank Transfer",
      mobile_money: "Mobile Money",
      card: "Card",
      cheque: "Cheque",
      other: "Other",
    })[value];
  const addExpense = useCallback(
    async (payload: CreateExpensePayload & { payee: string }) =>
      submit({
        operation: "create",
        expense: {
          category_id: payload.category_id,
          payment_basis: payload.payment_basis,
          supplier_id: payload.supplier_id ?? null,
          payee_name: payload.payee_name ?? payload.payee,
          payment_method: methodName(payload.payment_method),
          effective_date: payload.effective_date,
          source_document_date: payload.source_document_date ?? null,
          due_date: null,
          payment_confirmation_reference: null,
          net_ugx: payload.net_ugx,
          tax_ugx: payload.tax_ugx,
          gross_ugx: payload.gross_ugx,
          input_vat_eligible: payload.input_vat_eligible,
          non_deductible: false,
          invoice_reference: payload.invoice_reference ?? null,
          invoice_issuer: payload.invoice_issuer ?? null,
          description: payload.description ?? null,
        },
      }),
    [submit],
  );
  const settleExpense = useCallback(
    async (id: number, amount: number, reference: string) => {
      const expense = expenses.find((row) => row.id === id);
      if (!expense) throw new Error("Expense not found.");
      const payableRows = await loadAllFinancialMirrorRows("expense_payables");
      const payable = payableRows.find(
        (row) => Number(row.record.expense_id) === id,
      );
      if (!payable) throw new Error("No outstanding liability was found.");
      return submit({
        operation: "settle",
        payableId: payable.localRecordId,
        amountUgx: amount,
        effectiveDate: new Date().toISOString().slice(0, 10),
        paymentMethod: "Bank Transfer",
        reference,
      });
    },
    [expenses, submit],
  );
  const reverseExpense = useCallback(
    async (id: number, reason: string) =>
      submit({
        operation: "void",
        expenseId: id,
        effectiveDate: new Date().toISOString().slice(0, 10),
        reason,
      }),
    [submit],
  );
  return {
    expenses,
    expenseSummary,
    expenseCategories,
    loading,
    error,
    lastSuccessfulSync,
    isStale,
    refreshExpenses,
    addExpense,
    settleExpense,
    reverseExpense,
  };
}
