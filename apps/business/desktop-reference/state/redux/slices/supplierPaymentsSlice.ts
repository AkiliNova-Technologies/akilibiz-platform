import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/utils/error-message";
import {
  tauriSupplierPaymentsService,
  type CreateSupplierPaymentPayload,
  type SupplierPaymentQuery,
  type SupplierPaymentResponse,
  type SupplierPaymentSummary,
  type UpdateSupplierPaymentPayload,
} from "@/services/tauri/supplier-payments";

interface SupplierPaymentsState {
  items: SupplierPaymentResponse[];
  selectedPayment: SupplierPaymentResponse | null;
  summary: SupplierPaymentSummary | null;
  loading: boolean;
  error: string | null;
}

const initialState: SupplierPaymentsState = {
  items: [],
  selectedPayment: null,
  summary: null,
  loading: false,
  error: null,
};

export const fetchSupplierPayments = createAsyncThunk<
  SupplierPaymentResponse[],
  SupplierPaymentQuery | undefined,
  { rejectValue: string }
>("supplierPayments/fetchAll", async (params, { rejectWithValue }) => {
  try {
    return await tauriSupplierPaymentsService.getSupplierPayments(params || {});
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch supplier payments"));
  }
});

export const fetchSupplierPaymentById = createAsyncThunk<
  SupplierPaymentResponse,
  number,
  { rejectValue: string }
>("supplierPayments/fetchById", async (paymentId, { rejectWithValue }) => {
  try {
    return await tauriSupplierPaymentsService.getSupplierPayment(paymentId);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch supplier payment"));
  }
});

export const createSupplierPayment = createAsyncThunk<
  SupplierPaymentResponse,
  CreateSupplierPaymentPayload,
  { rejectValue: string }
>("supplierPayments/create", async (payload, { rejectWithValue }) => {
  try {
    return await tauriSupplierPaymentsService.createSupplierPayment(payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to create supplier payment"));
  }
});

export const updateSupplierPayment = createAsyncThunk<
  SupplierPaymentResponse,
  { id: number; payload: UpdateSupplierPaymentPayload },
  { rejectValue: string }
>("supplierPayments/update", async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await tauriSupplierPaymentsService.updateSupplierPayment(id, payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to update supplier payment"));
  }
});

export const markSupplierPaymentSettled = createAsyncThunk<
  SupplierPaymentResponse,
  number,
  { rejectValue: string }
>("supplierPayments/markSettled", async (paymentId, { rejectWithValue }) => {
  try {
    return await tauriSupplierPaymentsService.markSupplierPaymentSettled(paymentId);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to mark payment settled"));
  }
});

export const fetchSupplierPaymentSummary = createAsyncThunk<
  SupplierPaymentSummary,
  void,
  { rejectValue: string }
>("supplierPayments/fetchSummary", async (_, { rejectWithValue }) => {
  try {
    return await tauriSupplierPaymentsService.getSupplierPaymentSummary();
  } catch (error) {
    return rejectWithValue(
      getErrorMessage(error, "Failed to fetch supplier payment summary"),
    );
  }
});

const supplierPaymentsSlice = createSlice({
  name: "supplierPayments",
  initialState,
  reducers: {
    clearSelectedSupplierPayment: (state) => {
      state.selectedPayment = null;
    },
    clearSupplierPaymentsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSupplierPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSupplierPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchSupplierPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch supplier payments";
      })

      .addCase(fetchSupplierPaymentById.fulfilled, (state, action) => {
        state.selectedPayment = action.payload;
      })

      .addCase(createSupplierPayment.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })

      .addCase(updateSupplierPayment.fulfilled, (state, action) => {
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        );
        if (state.selectedPayment?.id === action.payload.id) {
          state.selectedPayment = action.payload;
        }
      })

      .addCase(markSupplierPaymentSettled.fulfilled, (state, action) => {
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        );
        if (state.selectedPayment?.id === action.payload.id) {
          state.selectedPayment = action.payload;
        }
      })

      .addCase(fetchSupplierPaymentSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
      });
  },
});

export const {
  clearSelectedSupplierPayment,
  clearSupplierPaymentsError,
} = supplierPaymentsSlice.actions;

export const selectSupplierPayments = (state: { supplierPayments: SupplierPaymentsState }) =>
  state.supplierPayments.items;
export const selectSelectedSupplierPayment = (state: { supplierPayments: SupplierPaymentsState }) =>
  state.supplierPayments.selectedPayment;
export const selectSupplierPaymentSummary = (state: { supplierPayments: SupplierPaymentsState }) =>
  state.supplierPayments.summary;
export const selectSupplierPaymentsLoading = (state: { supplierPayments: SupplierPaymentsState }) =>
  state.supplierPayments.loading;
export const selectSupplierPaymentsError = (state: { supplierPayments: SupplierPaymentsState }) =>
  state.supplierPayments.error;

export default supplierPaymentsSlice.reducer;
