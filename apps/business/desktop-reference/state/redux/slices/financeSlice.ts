import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/utils/error-message";
import {
  tauriFinanceService,
  type CashFlowRow,
  type CashFlowSummary,
  type CreateExpensePayload,
  type CreateIncomePayload,
  type ExpenseRow,
  type ExpenseSummary,
  type FinanceCategory,
  type FinanceOverviewRow,
  type FinanceOverviewSummary,
  type FinanceTransactionQuery,
  type IncomeRow,
  type IncomeSummary,
  type LedgerRow,
  type LedgerSummary,
} from "@/services/tauri/finance";

interface FinanceState {
  overviewSummary: FinanceOverviewSummary | null;
  overviewTransactions: FinanceOverviewRow[];

  incomeEntries: IncomeRow[];
  incomeSummary: IncomeSummary | null;
  incomeCategories: FinanceCategory[];

  expenseEntries: ExpenseRow[];
  expenseSummary: ExpenseSummary | null;
  expenseCategories: FinanceCategory[];

  cashFlowEntries: CashFlowRow[];
  cashFlowSummary: CashFlowSummary | null;

  ledgerEntries: LedgerRow[];
  ledgerSummary: LedgerSummary | null;

  loading: boolean;
  error: string | null;
}

const initialState: FinanceState = {
  overviewSummary: null,
  overviewTransactions: [],

  incomeEntries: [],
  incomeSummary: null,
  incomeCategories: [],

  expenseEntries: [],
  expenseSummary: null,
  expenseCategories: [],

  cashFlowEntries: [],
  cashFlowSummary: null,

  ledgerEntries: [],
  ledgerSummary: null,

  loading: false,
  error: null,
};

export const fetchFinanceOverviewSummary = createAsyncThunk<
  FinanceOverviewSummary,
  void,
  { rejectValue: string }
>("finance/fetchFinanceOverviewSummary", async (_, { rejectWithValue }) => {
  try {
    return await tauriFinanceService.getFinanceOverviewSummary();
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, "Failed to fetch finance overview summary"),
    );
  }
});

export const fetchFinanceOverviewTransactions = createAsyncThunk<
  FinanceOverviewRow[],
  FinanceTransactionQuery | undefined,
  { rejectValue: string }
>(
  "finance/fetchFinanceOverviewTransactions",
  async (params, { rejectWithValue }) => {
    try {
      return await tauriFinanceService.getFinanceOverviewTransactions(
        params || {},
      );
    } catch (error) {
      return rejectWithValue(
        getErrorMessage(error, "Failed to fetch finance overview transactions"),
      );
    }
  },
);

export const fetchIncomeEntries = createAsyncThunk<
  IncomeRow[],
  FinanceTransactionQuery | undefined,
  { rejectValue: string }
>("finance/fetchIncomeEntries", async (params, { rejectWithValue }) => {
  try {
    return await tauriFinanceService.getIncomeEntries(params || {});
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch income entries"));
  }
});

export const fetchIncomeSummary = createAsyncThunk<
  IncomeSummary,
  void,
  { rejectValue: string }
>("finance/fetchIncomeSummary", async (_, { rejectWithValue }) => {
  try {
    return await tauriFinanceService.getIncomeSummary();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch income summary"));
  }
});

export const fetchIncomeCategories = createAsyncThunk<
  FinanceCategory[],
  void,
  { rejectValue: string }
>("finance/fetchIncomeCategories", async (_, { rejectWithValue }) => {
  try {
    return await tauriFinanceService.getIncomeCategories();
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, "Failed to fetch income categories"),
    );
  }
});

export const createIncomeEntry = createAsyncThunk<
  IncomeRow,
  CreateIncomePayload,
  { rejectValue: string }
>("finance/createIncomeEntry", async (payload, { rejectWithValue }) => {
  try {
    return await tauriFinanceService.createIncomeEntry(payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to create income entry"));
  }
});

export const fetchExpenseEntries = createAsyncThunk<
  ExpenseRow[],
  FinanceTransactionQuery | undefined,
  { rejectValue: string }
>("finance/fetchExpenseEntries", async (params, { rejectWithValue }) => {
  try {
    return await tauriFinanceService.getExpenseEntries(params || {});
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch expense entries"));
  }
});

export const fetchExpenseSummary = createAsyncThunk<
  ExpenseSummary,
  void,
  { rejectValue: string }
>("finance/fetchExpenseSummary", async (_, { rejectWithValue }) => {
  try {
    return await tauriFinanceService.getExpenseSummary();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch expense summary"));
  }
});

export const fetchExpenseCategories = createAsyncThunk<
  FinanceCategory[],
  void,
  { rejectValue: string }
>("finance/fetchExpenseCategories", async (_, { rejectWithValue }) => {
  try {
    return await tauriFinanceService.getExpenseCategories();
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, "Failed to fetch expense categories"),
    );
  }
});

export const createExpenseEntry = createAsyncThunk<
  ExpenseRow,
  CreateExpensePayload,
  { rejectValue: string }
>("finance/createExpenseEntry", async (payload, { rejectWithValue }) => {
  try {
    return await tauriFinanceService.createExpenseEntry(payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to create expense entry"));
  }
});

export const fetchCashFlowEntries = createAsyncThunk<
  CashFlowRow[],
  FinanceTransactionQuery | undefined,
  { rejectValue: string }
>("finance/fetchCashFlowEntries", async (params, { rejectWithValue }) => {
  try {
    return await tauriFinanceService.getCashFlowEntries(params || {});
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch cash flow"));
  }
});

export const fetchCashFlowSummary = createAsyncThunk<
  CashFlowSummary,
  void,
  { rejectValue: string }
>("finance/fetchCashFlowSummary", async (_, { rejectWithValue }) => {
  try {
    return await tauriFinanceService.getCashFlowSummary();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch cash flow summary"));
  }
});

export const fetchLedgerEntries = createAsyncThunk<
  LedgerRow[],
  FinanceTransactionQuery | undefined,
  { rejectValue: string }
>("finance/fetchLedgerEntries", async (params, { rejectWithValue }) => {
  try {
    return await tauriFinanceService.getLedgerEntries(params || {});
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch ledger entries"));
  }
});

export const fetchLedgerSummary = createAsyncThunk<
  LedgerSummary,
  void,
  { rejectValue: string }
>("finance/fetchLedgerSummary", async (_, { rejectWithValue }) => {
  try {
    return await tauriFinanceService.getLedgerSummary();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch ledger summary"));
  }
});

const financeSlice = createSlice({
  name: "finance",
  initialState,
  reducers: {
    clearFinanceError: (state) => {
      state.error = null;
    },
    clearIncomeEntries: (state) => {
      state.incomeEntries = [];
    },
    clearExpenseEntries: (state) => {
      state.expenseEntries = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFinanceOverviewSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFinanceOverviewSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.overviewSummary = action.payload;
      })
      .addCase(fetchFinanceOverviewSummary.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Failed to fetch finance overview summary";
      })

      .addCase(fetchFinanceOverviewTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFinanceOverviewTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.overviewTransactions = action.payload;
      })
      .addCase(fetchFinanceOverviewTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Failed to fetch finance overview transactions";
      })

      .addCase(fetchIncomeEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIncomeEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.incomeEntries = action.payload;
      })
      .addCase(fetchIncomeEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch income entries";
      })

      .addCase(fetchIncomeSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchIncomeSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.incomeSummary = action.payload;
      })
      .addCase(fetchIncomeSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch income summary";
      })

      .addCase(fetchIncomeCategories.fulfilled, (state, action) => {
        state.incomeCategories = action.payload;
      })
      .addCase(fetchIncomeCategories.rejected, (state, action) => {
        state.error = action.payload || "Failed to fetch income categories";
      })

      .addCase(createIncomeEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createIncomeEntry.fulfilled, (state, action) => {
        state.loading = false;
        state.incomeEntries.unshift(action.payload);
      })
      .addCase(createIncomeEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create income entry";
      })

      .addCase(fetchExpenseEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpenseEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.expenseEntries = action.payload;
      })
      .addCase(fetchExpenseEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch expense entries";
      })

      .addCase(fetchExpenseSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExpenseSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.expenseSummary = action.payload;
      })
      .addCase(fetchExpenseSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch expense summary";
      })

      .addCase(fetchExpenseCategories.fulfilled, (state, action) => {
        state.expenseCategories = action.payload;
      })
      .addCase(fetchExpenseCategories.rejected, (state, action) => {
        state.error = action.payload || "Failed to fetch expense categories";
      })

      .addCase(createExpenseEntry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createExpenseEntry.fulfilled, (state, action) => {
        state.loading = false;
        state.expenseEntries.unshift(action.payload);
      })
      .addCase(createExpenseEntry.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create expense entry";
      })

      .addCase(fetchCashFlowEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCashFlowEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.cashFlowEntries = action.payload;
      })
      .addCase(fetchCashFlowEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch cash flow entries";
      })

      .addCase(fetchCashFlowSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCashFlowSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.cashFlowSummary = action.payload;
      })
      .addCase(fetchCashFlowSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch cash flow summary";
      })

      .addCase(fetchLedgerEntries.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLedgerEntries.fulfilled, (state, action) => {
        state.loading = false;
        state.ledgerEntries = action.payload;
      })
      .addCase(fetchLedgerEntries.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch ledger entries";
      })

      .addCase(fetchLedgerSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLedgerSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.ledgerSummary = action.payload;
      })
      .addCase(fetchLedgerSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch ledger summary";
      });
  },
});

export const { clearFinanceError, clearIncomeEntries, clearExpenseEntries } =
  financeSlice.actions;

export const selectFinanceOverviewSummary = (state: { finance: FinanceState }) =>
  state.finance.overviewSummary;
export const selectFinanceOverviewTransactions = (state: {
  finance: FinanceState;
}) => state.finance.overviewTransactions;

export const selectIncomeEntries = (state: { finance: FinanceState }) =>
  state.finance.incomeEntries;
export const selectIncomeSummary = (state: { finance: FinanceState }) =>
  state.finance.incomeSummary;
export const selectIncomeCategories = (state: { finance: FinanceState }) =>
  state.finance.incomeCategories;

export const selectExpenseEntries = (state: { finance: FinanceState }) =>
  state.finance.expenseEntries;
export const selectExpenseSummary = (state: { finance: FinanceState }) =>
  state.finance.expenseSummary;
export const selectExpenseCategories = (state: { finance: FinanceState }) =>
  state.finance.expenseCategories;

export const selectCashFlowEntries = (state: { finance: FinanceState }) =>
  state.finance.cashFlowEntries;
export const selectCashFlowSummary = (state: { finance: FinanceState }) =>
  state.finance.cashFlowSummary;

export const selectLedgerEntries = (state: { finance: FinanceState }) =>
  state.finance.ledgerEntries;
export const selectLedgerSummary = (state: { finance: FinanceState }) =>
  state.finance.ledgerSummary;

export const selectFinanceLoading = (state: { finance: FinanceState }) =>
  state.finance.loading;
export const selectFinanceError = (state: { finance: FinanceState }) =>
  state.finance.error;

export default financeSlice.reducer;
