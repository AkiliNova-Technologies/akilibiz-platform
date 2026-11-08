import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  FinancialReportRow,
  FinancialReportSummary,
  InventoryReportRow,
  InventoryReportSummary,
  ProfitLossRow,
  ProfitLossSummary,
  ReportOverviewRow,
  ReportQuery,
  ReportsOverviewSummary,
  SalesReportRow,
  SalesReportSummary,
} from "@/services/tauri/reports";
import {
  getFinancialReportSummary,
  getFinancialReports,
  getInventoryReportSummary,
  getInventoryReports,
  getProfitLossReports,
  getProfitLossSummary,
  getReportsOverview,
  getReportsOverviewSummary,
  getSalesReportSummary,
  getSalesReports,
} from "@/services/tauri/reports";

interface ReportState {
  overviewRows: ReportOverviewRow[];
  overviewSummary: ReportsOverviewSummary | null;

  salesRows: SalesReportRow[];
  salesSummary: SalesReportSummary | null;

  inventoryRows: InventoryReportRow[];
  inventorySummary: InventoryReportSummary | null;

  financialRows: FinancialReportRow[];
  financialSummary: FinancialReportSummary | null;

  profitLossRows: ProfitLossRow[];
  profitLossSummary: ProfitLossSummary | null;

  loading: boolean;
  error: string | null;

  currentQuery: ReportQuery;
}

const initialState: ReportState = {
  overviewRows: [],
  overviewSummary: null,

  salesRows: [],
  salesSummary: null,

  inventoryRows: [],
  inventorySummary: null,

  financialRows: [],
  financialSummary: null,

  profitLossRows: [],
  profitLossSummary: null,

  loading: false,
  error: null,

  currentQuery: {
    period_type: "monthly",
    skip: 0,
    limit: 100,
    search: "",
  },
};

export const fetchReportsOverview = createAsyncThunk(
  "reports/fetchReportsOverview",
  async (_, { rejectWithValue }) => {
    try {
      const [rows, summary] = await Promise.all([
        getReportsOverview(),
        getReportsOverviewSummary(),
      ]);

      return { rows, summary };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to load reports overview",
      );
    }
  },
);

export const fetchSalesReports = createAsyncThunk(
  "reports/fetchSalesReports",
  async (query: ReportQuery | undefined, { rejectWithValue }) => {
    try {
      const [rows, summary] = await Promise.all([
        getSalesReports(query),
        getSalesReportSummary(),
      ]);

      return { rows, summary };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to load sales reports",
      );
    }
  },
);

export const fetchInventoryReports = createAsyncThunk(
  "reports/fetchInventoryReports",
  async (query: ReportQuery | undefined, { rejectWithValue }) => {
    try {
      const [rows, summary] = await Promise.all([
        getInventoryReports(query),
        getInventoryReportSummary(),
      ]);

      return { rows, summary };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to load inventory reports",
      );
    }
  },
);

export const fetchFinancialReports = createAsyncThunk(
  "reports/fetchFinancialReports",
  async (query: ReportQuery | undefined, { rejectWithValue }) => {
    try {
      const [rows, summary] = await Promise.all([
        getFinancialReports(query),
        getFinancialReportSummary(),
      ]);

      return { rows, summary };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to load financial reports",
      );
    }
  },
);

export const fetchProfitLossReports = createAsyncThunk(
  "reports/fetchProfitLossReports",
  async (query: ReportQuery | undefined, { rejectWithValue }) => {
    try {
      const [rows, summary] = await Promise.all([
        getProfitLossReports(query),
        getProfitLossSummary(),
      ]);

      return { rows, summary };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to load profit & loss reports",
      );
    }
  },
);

const reportSlice = createSlice({
  name: "reports",
  initialState,
  reducers: {
    setReportQuery(state, action: PayloadAction<Partial<ReportQuery>>) {
      state.currentQuery = {
        ...state.currentQuery,
        ...action.payload,
      };
    },
    resetReportQuery(state) {
      state.currentQuery = initialState.currentQuery;
    },
    clearReportError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchReportsOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReportsOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.overviewRows = action.payload.rows;
        state.overviewSummary = action.payload.summary;
      })
      .addCase(fetchReportsOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to load reports overview";
      })

      .addCase(fetchSalesReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSalesReports.fulfilled, (state, action) => {
        state.loading = false;
        state.salesRows = action.payload.rows;
        state.salesSummary = action.payload.summary;
      })
      .addCase(fetchSalesReports.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to load sales reports";
      })

      .addCase(fetchInventoryReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryReports.fulfilled, (state, action) => {
        state.loading = false;
        state.inventoryRows = action.payload.rows;
        state.inventorySummary = action.payload.summary;
      })
      .addCase(fetchInventoryReports.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to load inventory reports";
      })

      .addCase(fetchFinancialReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchFinancialReports.fulfilled, (state, action) => {
        state.loading = false;
        state.financialRows = action.payload.rows;
        state.financialSummary = action.payload.summary;
      })
      .addCase(fetchFinancialReports.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to load financial reports";
      })

      .addCase(fetchProfitLossReports.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProfitLossReports.fulfilled, (state, action) => {
        state.loading = false;
        state.profitLossRows = action.payload.rows;
        state.profitLossSummary = action.payload.summary;
      })
      .addCase(fetchProfitLossReports.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? "Failed to load profit & loss reports";
      });
  },
});

export const { setReportQuery, resetReportQuery, clearReportError } =
  reportSlice.actions;

export default reportSlice.reducer;