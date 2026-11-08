import {
  createAsyncThunk,
  createSlice,
} from "@reduxjs/toolkit";
import type {
  DashboardLowStockItem,
  DashboardRecentSale,
  DashboardStaffPerformance,
  DashboardSummary,
  DashboardTopProduct,
} from "@/services/tauri/dashboard";
import {
  getDashboardLowStockItems,
  getDashboardRecentSales,
  getDashboardStaffPerformance,
  getDashboardSummary,
  getDashboardTopProducts,
} from "@/services/tauri/dashboard";

interface DashboardState {
  summary: DashboardSummary | null;
  recentSales: DashboardRecentSale[];
  topProducts: DashboardTopProduct[];
  lowStockItems: DashboardLowStockItem[];
  staffPerformance: DashboardStaffPerformance[];

  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  summary: null,
  recentSales: [],
  topProducts: [],
  lowStockItems: [],
  staffPerformance: [],

  loading: false,
  error: null,
};

export const fetchDashboardData = createAsyncThunk(
  "dashboard/fetchDashboardData",
  async (_, { rejectWithValue }) => {
    try {
      const [
        summary,
        recentSales,
        topProducts,
        lowStockItems,
        staffPerformance,
      ] = await Promise.all([
        getDashboardSummary(),
        getDashboardRecentSales(6),
        getDashboardTopProducts(5),
        getDashboardLowStockItems(6),
        getDashboardStaffPerformance(5),
      ]);

      return {
        summary,
        recentSales,
        topProducts,
        lowStockItems,
        staffPerformance,
      };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to load dashboard data",
      );
    }
  },
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    clearDashboardError(state) {
      state.error = null;
    },
    resetDashboardState() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload.summary;
        state.recentSales = action.payload.recentSales;
        state.topProducts = action.payload.topProducts;
        state.lowStockItems = action.payload.lowStockItems;
        state.staffPerformance = action.payload.staffPerformance;
      })
      .addCase(fetchDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error =
          (action.payload as string) ?? "Failed to load dashboard data";
      });
  },
});

export const { clearDashboardError, resetDashboardState } =
  dashboardSlice.actions;

export default dashboardSlice.reducer;