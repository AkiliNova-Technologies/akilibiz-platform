import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/utils/error-message";
import {
  tauriPurchaseOrdersService,
  type CreatePurchaseOrderPayload,
  type PurchaseOrderQuery,
  type PurchaseOrderResponse,
  type PurchaseOrderSummary,
  type UpdatePurchaseOrderPayload,
} from "@/services/tauri/purchase-orders";

interface PurchaseOrdersState {
  items: PurchaseOrderResponse[];
  selectedOrder: PurchaseOrderResponse | null;
  summary: PurchaseOrderSummary | null;
  loading: boolean;
  error: string | null;
}

const initialState: PurchaseOrdersState = {
  items: [],
  selectedOrder: null,
  summary: null,
  loading: false,
  error: null,
};

export const fetchPurchaseOrders = createAsyncThunk<
  PurchaseOrderResponse[],
  PurchaseOrderQuery | undefined,
  { rejectValue: string }
>("purchaseOrders/fetchAll", async (params, { rejectWithValue }) => {
  try {
    return await tauriPurchaseOrdersService.getPurchaseOrders(params || {});
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch purchase orders"));
  }
});

export const fetchPurchaseOrderById = createAsyncThunk<
  PurchaseOrderResponse,
  number,
  { rejectValue: string }
>("purchaseOrders/fetchById", async (orderId, { rejectWithValue }) => {
  try {
    return await tauriPurchaseOrdersService.getPurchaseOrder(orderId);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch purchase order"));
  }
});

export const createPurchaseOrder = createAsyncThunk<
  PurchaseOrderResponse,
  CreatePurchaseOrderPayload,
  { rejectValue: string }
>("purchaseOrders/create", async (payload, { rejectWithValue }) => {
  try {
    return await tauriPurchaseOrdersService.createPurchaseOrder(payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to create purchase order"));
  }
});

export const updatePurchaseOrder = createAsyncThunk<
  PurchaseOrderResponse,
  { id: number; payload: UpdatePurchaseOrderPayload },
  { rejectValue: string }
>("purchaseOrders/update", async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await tauriPurchaseOrdersService.updatePurchaseOrder(id, payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to update purchase order"));
  }
});

export const markPurchaseOrderReceived = createAsyncThunk<
  PurchaseOrderResponse,
  number,
  { rejectValue: string }
>("purchaseOrders/markReceived", async (orderId, { rejectWithValue }) => {
  try {
    return await tauriPurchaseOrdersService.markPurchaseOrderReceived(orderId);
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, "Failed to mark purchase order as received"),
    );
  }
});

export const fetchPurchaseOrderSummary = createAsyncThunk<
  PurchaseOrderSummary,
  void,
  { rejectValue: string }
>("purchaseOrders/fetchSummary", async (_, { rejectWithValue }) => {
  try {
    return await tauriPurchaseOrdersService.getPurchaseOrderSummary();
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, "Failed to fetch purchase order summary"),
    );
  }
});

const purchaseOrdersSlice = createSlice({
  name: "purchaseOrders",
  initialState,
  reducers: {
    clearSelectedPurchaseOrder: (state) => {
      state.selectedOrder = null;
    },
    clearPurchaseOrdersError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPurchaseOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPurchaseOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchPurchaseOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch purchase orders";
      })

      .addCase(fetchPurchaseOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPurchaseOrderById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedOrder = action.payload;
      })
      .addCase(fetchPurchaseOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch purchase order";
      })

      .addCase(createPurchaseOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createPurchaseOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createPurchaseOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create purchase order";
      })

      .addCase(updatePurchaseOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updatePurchaseOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        );
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrder = action.payload;
        }
      })
      .addCase(updatePurchaseOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update purchase order";
      })

      .addCase(markPurchaseOrderReceived.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(markPurchaseOrderReceived.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        );
        if (state.selectedOrder?.id === action.payload.id) {
          state.selectedOrder = action.payload;
        }
      })
      .addCase(markPurchaseOrderReceived.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Failed to mark purchase order as received";
      })

      .addCase(fetchPurchaseOrderSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPurchaseOrderSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
      })
      .addCase(fetchPurchaseOrderSummary.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload || "Failed to fetch purchase order summary";
      });
  },
});

export const {
  clearSelectedPurchaseOrder,
  clearPurchaseOrdersError,
} = purchaseOrdersSlice.actions;

export const selectPurchaseOrders = (state: {
  purchaseOrders: PurchaseOrdersState;
}) => state.purchaseOrders.items;

export const selectSelectedPurchaseOrder = (state: {
  purchaseOrders: PurchaseOrdersState;
}) => state.purchaseOrders.selectedOrder;

export const selectPurchaseOrderSummary = (state: {
  purchaseOrders: PurchaseOrdersState;
}) => state.purchaseOrders.summary;

export const selectPurchaseOrdersLoading = (state: {
  purchaseOrders: PurchaseOrdersState;
}) => state.purchaseOrders.loading;

export const selectPurchaseOrdersError = (state: {
  purchaseOrders: PurchaseOrdersState;
}) => state.purchaseOrders.error;

export default purchaseOrdersSlice.reducer;
