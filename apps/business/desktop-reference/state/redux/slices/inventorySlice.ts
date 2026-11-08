import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/utils/error-message";
import {
  tauriInventoryService,
  type AdjustStockPayload,
  type InventoryOverviewItem,
  type InventorySummary,
  type LowStockAlert,
  type StockHistoryQuery,
  type StockMovement,
} from "@/services/tauri/inventory";

interface InventoryState {
  overview: InventoryOverviewItem[];
  summary: InventorySummary | null;
  logs: StockMovement[];
  lowStockAlerts: LowStockAlert[];
  loading: boolean;
  error: string | null;
}

const initialState: InventoryState = {
  overview: [],
  summary: null,
  logs: [],
  lowStockAlerts: [],
  loading: false,
  error: null,
};

export const fetchInventoryOverview = createAsyncThunk<
  InventoryOverviewItem[],
  void,
  { rejectValue: string }
>("inventory/fetchOverview", async (_, { rejectWithValue }) => {
  try {
    return await tauriInventoryService.getInventoryOverview();
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, "Failed to load inventory overview"),
    );
  }
});

export const fetchInventorySummary = createAsyncThunk<
  InventorySummary,
  void,
  { rejectValue: string }
>("inventory/fetchSummary", async (_, { rejectWithValue }) => {
  try {
    return await tauriInventoryService.getInventorySummary();
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, "Failed to load inventory summary"),
    );
  }
});

export const adjustStock = createAsyncThunk<
  StockMovement,
  AdjustStockPayload,
  { rejectValue: string }
>("inventory/adjustStock", async (payload, { rejectWithValue }) => {
  try {
    return await tauriInventoryService.adjustStock(payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to adjust stock"));
  }
});

export const fetchStockHistory = createAsyncThunk<
  StockMovement[],
  StockHistoryQuery | undefined,
  { rejectValue: string }
>("inventory/fetchStockHistory", async (query, { rejectWithValue }) => {
  try {
    return await tauriInventoryService.getStockHistory(query || {});
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to load stock history"));
  }
});

export const fetchLowStockAlerts = createAsyncThunk<
  LowStockAlert[],
  void,
  { rejectValue: string }
>("inventory/fetchLowStockAlerts", async (_, { rejectWithValue }) => {
  try {
    return await tauriInventoryService.getLowStockAlerts();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to load low stock alerts"));
  }
});

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    clearInventoryError: (state) => {
      state.error = null;
    },
    clearInventoryLogs: (state) => {
      state.logs = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventoryOverview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventoryOverview.fulfilled, (state, action) => {
        state.loading = false;
        state.overview = action.payload;
      })
      .addCase(fetchInventoryOverview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load inventory overview";
      })

      .addCase(fetchInventorySummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventorySummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
      })
      .addCase(fetchInventorySummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load inventory summary";
      })

      .addCase(adjustStock.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(adjustStock.fulfilled, (state, action) => {
        state.loading = false;
        state.logs.unshift(action.payload);
      })
      .addCase(adjustStock.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to adjust stock";
      })

      .addCase(fetchStockHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStockHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.logs = action.payload;
      })
      .addCase(fetchStockHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load stock history";
      })

      .addCase(fetchLowStockAlerts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLowStockAlerts.fulfilled, (state, action) => {
        state.loading = false;
        state.lowStockAlerts = action.payload;
      })
      .addCase(fetchLowStockAlerts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to load low stock alerts";
      });
  },
});

export const { clearInventoryError, clearInventoryLogs } =
  inventorySlice.actions;

export const selectInventoryOverview = (state: { inventory: InventoryState }) =>
  state.inventory.overview;
export const selectInventorySummary = (state: { inventory: InventoryState }) =>
  state.inventory.summary;
export const selectInventoryLogs = (state: { inventory: InventoryState }) =>
  state.inventory.logs;
export const selectLowStockAlerts = (state: { inventory: InventoryState }) =>
  state.inventory.lowStockAlerts;
export const selectInventoryLoading = (state: { inventory: InventoryState }) =>
  state.inventory.loading;
export const selectInventoryError = (state: { inventory: InventoryState }) =>
  state.inventory.error;

export default inventorySlice.reducer;
