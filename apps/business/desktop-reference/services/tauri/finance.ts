import { invoke } from "@tauri-apps/api/core";

export type FinancePaymentMethod =
  | "cash"
  | "bank_transfer"
  | "mobile_money"
  | "card"
  | "cheque"
  | "other";

export type IncomeStatus = "pending" | "received" | "verified" | "cancelled";
export type ExpenseStatus = "pending" | "approved" | "paid" | "rejected";

export interface FinanceTransactionQuery {
  skip?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  payment_method?: FinancePaymentMethod | "all";
  status?: string | "all";
  date_from?: string;
  date_to?: string;
}

export interface FinanceCategory {
  id: number;
  name: string;
  category_type: "income" | "expense";
  description?: string | null;
  is_active: boolean;
}

export interface FinanceOverviewSummary {
  total_income: number;
  total_expenses: number;
  net_balance: number;
  cash_position: number;
}

export interface FinanceOverviewRow {
  id: number;
  reference: string;
  entry_type: "Income" | "Expense";
  category: string;
  amount: number;
  method: string;
  date: string;
  description?: string | null;
}

export interface IncomeRow {
  id: number;
  reference: string;
  category: string;
  amount: number;
  method: string;
  source: string;
  date: string;
  status: string;
  description?: string | null;
}

export interface IncomeSummary {
  total_income: number;
  received_income: number;
  pending_income: number;
  income_categories: number;
}

export interface CreateIncomePayload {
  category_id: number;
  amount: number;
  payment_method: FinancePaymentMethod;
  source_name?: string | null;
  transaction_date: string;
  status: IncomeStatus;
  description?: string | null;
}

export interface ExpenseRow {
  id: number;
  reference: string;
  category: string;
  amount: number;
  method: string;
  vendor: string;
  date: string;
  status: string;
  description?: string | null;
}

export interface ExpenseSummary {
  total_expenses: number;
  paid_expenses: number;
  pending_expenses: number;
  expense_categories: number;
}

export interface CreateExpensePayload {
  category_id: number;
  amount: number;
  payment_method: FinancePaymentMethod;
  payee_name?: string | null;
  transaction_date: string;
  status: ExpenseStatus;
  description?: string | null;
}
export interface AuthoritativeExpense { id:number; reference:string; state:string; payment_basis:"paid"|"supplier_credit"; effective_date:string; net_ugx:number; tax_ugx:number; gross_ugx:number; payable_id?:number|null }
export interface AuthoritativeExpenseRow extends AuthoritativeExpense { public_id:string; category:string; payee_or_supplier?:string|null; input_vat_eligible:boolean; payable_state?:string|null; lifecycle_status:string }
export interface AuthoritativeExpenseDetail { expense:AuthoritativeExpenseRow; tax_evidence_count:number; payable_id?:number|null; payable_outstanding_ugx?:number|null; settlement_count:number; void_id?:number|null; correction_id?:number|null; refund_id?:number|null; journal_entry_id?:number|null }
export interface AuthoritativeExpenseQuery { skip?:number; limit?:number; state?:string; date_from?:string; date_to?:string; search?:string }
export interface CreateAuthoritativeExpensePayload { category_id:number; payment_basis:"paid"|"supplier_credit"; supplier_id?:number|null; payee_name?:string|null; payment_method:FinancePaymentMethod; effective_date:string; source_document_date?:string|null; net_ugx:number; tax_ugx:number; gross_ugx:number; input_vat_eligible:boolean; non_deductible:boolean; invoice_reference?:string|null; invoice_issuer?:string|null; description?:string|null; idempotency_key:string }
export interface SettleExpensePayablePayload { payable_id:number; amount_ugx:number; effective_date:string; payment_method:FinancePaymentMethod; reference:string; idempotency_key:string }
export interface VoidAuthoritativeExpensePayload { effective_date:string; reason:string; idempotency_key:string }
export interface AccountingPeriod { id:number; date_from:string; date_to:string; state:"open"|"closed"; created_at:string; closed_at?:string|null; close_reason?:string|null; latest_action?:string|null; latest_action_at?:string|null; latest_action_reason?:string|null; latest_action_actor_name?:string|null }

export interface CashFlowRow {
  id: number;
  reference: string;
  flow_type: "Inflow" | "Outflow";
  category: string;
  amount: number;
  method: string;
  date: string;
  description?: string | null;
}

export interface CashFlowSummary {
  total_inflow: number;
  total_outflow: number;
  net_cash_flow: number;
  transaction_count: number;
}

export interface LedgerRow {
  id: number;
  reference: string;
  entry_type: "Debit" | "Credit";
  source: string;
  category: string;
  amount: number;
  account: string;
  recorded_by: string;
  date: string;
  description?: string | null;
}

export interface LedgerSummary {
  total_credits: number;
  total_debits: number;
  net_position: number;
  total_entries: number;
}

function normalizeQuery(
  query: FinanceTransactionQuery = {},
): FinanceTransactionQuery {
  return {
    skip: query.skip ?? 0,
    limit: query.limit ?? 100,
    search: query.search?.trim() || undefined,
    category_id: query.category_id,
    payment_method:
      query.payment_method && query.payment_method !== "all"
        ? query.payment_method
        : undefined,
    status: query.status && query.status !== "all" ? query.status : undefined,
    date_from: query.date_from?.trim() || undefined,
    date_to: query.date_to?.trim() || undefined,
  };
}

export const tauriFinanceService = {
  async getFinanceOverviewSummary(): Promise<FinanceOverviewSummary> {
    return await invoke<FinanceOverviewSummary>(
      "get_finance_overview_summary",
    );
  },

  async getFinanceOverviewTransactions(
    query: FinanceTransactionQuery = {},
  ): Promise<FinanceOverviewRow[]> {
    return await invoke<FinanceOverviewRow[]>(
      "get_finance_overview_transactions",
      {
        params: normalizeQuery(query),
      },
    );
  },

  async getIncomeEntries(
    query: FinanceTransactionQuery = {},
  ): Promise<IncomeRow[]> {
    return await invoke<IncomeRow[]>("get_income_entries", {
      params: normalizeQuery(query),
    });
  },

  async getIncomeSummary(): Promise<IncomeSummary> {
    return await invoke<IncomeSummary>("get_income_summary");
  },

  async createIncomeEntry(
    payload: CreateIncomePayload,
  ): Promise<IncomeRow> {
    return await invoke<IncomeRow>("create_income_entry", { payload });
  },

  async getIncomeCategories(): Promise<FinanceCategory[]> {
    return await invoke<FinanceCategory[]>("get_income_categories");
  },

  async getExpenseEntries(
    query: FinanceTransactionQuery = {},
  ): Promise<ExpenseRow[]> {
    return await invoke<ExpenseRow[]>("get_expense_entries", {
      params: normalizeQuery(query),
    });
  },

  async getExpenseSummary(): Promise<ExpenseSummary> {
    return await invoke<ExpenseSummary>("get_expense_summary");
  },

  async createExpenseEntry(
    payload: CreateExpensePayload,
  ): Promise<ExpenseRow> {
    return await invoke<ExpenseRow>("create_expense_entry", { payload });
  },
  async createAuthoritativeExpense(payload: CreateAuthoritativeExpensePayload): Promise<AuthoritativeExpense> { return await invoke<AuthoritativeExpense>("create_authoritative_expense", { payload }); },
  async postAuthoritativeExpense(expenseId:number, payload:{effective_date:string;idempotency_key:string}): Promise<AuthoritativeExpense> { return await invoke<AuthoritativeExpense>("post_authoritative_expense", { expenseId, payload }); },
  async cancelAuthoritativeExpense(expenseId:number, payload:{reason?:string}): Promise<AuthoritativeExpense> { return await invoke<AuthoritativeExpense>("cancel_authoritative_expense", { expenseId, payload }); },
  async getAuthoritativeExpenses(query:AuthoritativeExpenseQuery={}): Promise<AuthoritativeExpenseRow[]> { return await invoke<AuthoritativeExpenseRow[]>("get_authoritative_expenses", { query: { skip:query.skip ?? 0, limit:query.limit ?? 20, state:query.state || undefined, date_from:query.date_from || undefined, date_to:query.date_to || undefined, search:query.search?.trim() || undefined } }); },
  async getAuthoritativeExpense(expenseId:number): Promise<AuthoritativeExpenseDetail> { return await invoke<AuthoritativeExpenseDetail>("get_authoritative_expense", { expenseId }); },
  async settleExpensePayable(payload: SettleExpensePayablePayload): Promise<number> { return await invoke<number>("settle_expense_payable", { payload }); },
  async voidAuthoritativeExpense(expenseId:number, payload: VoidAuthoritativeExpensePayload): Promise<AuthoritativeExpense> { return await invoke<AuthoritativeExpense>("void_authoritative_expense", { expenseId, payload }); },
  async getAccountingPeriods(): Promise<AccountingPeriod[]> { return await invoke<AccountingPeriod[]>("get_accounting_periods"); },
  async createAccountingPeriod(payload:{date_from:string;date_to:string}): Promise<AccountingPeriod> { return await invoke<AccountingPeriod>("create_accounting_period", { payload }); },
  async closeAccountingPeriod(periodId:number, payload:{reason:string}): Promise<AccountingPeriod> { return await invoke<AccountingPeriod>("close_accounting_period", { periodId, payload }); },

  async getExpenseCategories(): Promise<FinanceCategory[]> {
    return await invoke<FinanceCategory[]>("get_expense_categories");
  },

  async getCashFlowEntries(
    query: FinanceTransactionQuery = {},
  ): Promise<CashFlowRow[]> {
    return await invoke<CashFlowRow[]>("get_cash_flow_entries", {
      params: normalizeQuery(query),
    });
  },

  async getCashFlowSummary(): Promise<CashFlowSummary> {
    return await invoke<CashFlowSummary>("get_cash_flow_summary");
  },

  async getLedgerEntries(
    query: FinanceTransactionQuery = {},
  ): Promise<LedgerRow[]> {
    return await invoke<LedgerRow[]>("get_ledger_entries", {
      params: normalizeQuery(query),
    });
  },

  async getLedgerSummary(): Promise<LedgerSummary> {
    return await invoke<LedgerSummary>("get_ledger_summary");
  },
};
