import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/utils/error-message";
import {
  tauriSuppliersService,
  type CreateSupplierPayload,
  type SupplierQuery,
  type SupplierResponse,
  type SupplierSummary,
  type UpdateSupplierPayload,
} from "@/services/tauri/suppliers";

interface SuppliersState {
  items: SupplierResponse[];
  selectedSupplier: SupplierResponse | null;
  summary: SupplierSummary | null;
  loading: boolean;
  error: string | null;
}

const initialState: SuppliersState = {
  items: [],
  selectedSupplier: null,
  summary: null,
  loading: false,
  error: null,
};

export const fetchSuppliers = createAsyncThunk<
  SupplierResponse[],
  SupplierQuery | undefined,
  { rejectValue: string }
>("suppliers/fetchAll", async (params, { rejectWithValue }) => {
  try {
    return await tauriSuppliersService.getSuppliers(params || {});
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch suppliers"));
  }
});

export const fetchSupplierById = createAsyncThunk<
  SupplierResponse,
  number,
  { rejectValue: string }
>("suppliers/fetchById", async (supplierId, { rejectWithValue }) => {
  try {
    return await tauriSuppliersService.getSupplier(supplierId);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch supplier"));
  }
});

export const createSupplier = createAsyncThunk<
  SupplierResponse,
  CreateSupplierPayload,
  { rejectValue: string }
>("suppliers/create", async (payload, { rejectWithValue }) => {
  try {
    return await tauriSuppliersService.createSupplier(payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to create supplier"));
  }
});

export const updateSupplier = createAsyncThunk<
  SupplierResponse,
  { id: number; payload: UpdateSupplierPayload },
  { rejectValue: string }
>("suppliers/update", async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await tauriSuppliersService.updateSupplier(id, payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to update supplier"));
  }
});

export const deactivateSupplier = createAsyncThunk<
  SupplierResponse,
  number,
  { rejectValue: string }
>("suppliers/deactivate", async (supplierId, { rejectWithValue }) => {
  try {
    return await tauriSuppliersService.deactivateSupplier(supplierId);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to deactivate supplier"));
  }
});

export const fetchSupplierSummary = createAsyncThunk<
  SupplierSummary,
  void,
  { rejectValue: string }
>("suppliers/fetchSummary", async (_, { rejectWithValue }) => {
  try {
    return await tauriSuppliersService.getSupplierSummary();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch supplier summary"));
  }
});

const suppliersSlice = createSlice({
  name: "suppliers",
  initialState,
  reducers: {
    clearSelectedSupplier: (state) => {
      state.selectedSupplier = null;
    },
    clearSuppliersError: (state) => {
      state.error = null;
    },
    clearSuppliers: (state) => {
      state.items = [];
      state.selectedSupplier = null;
      state.summary = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSuppliers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchSuppliers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch suppliers";
      })

      .addCase(fetchSupplierById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSupplierById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedSupplier = action.payload;
      })
      .addCase(fetchSupplierById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch supplier";
      })

      .addCase(createSupplier.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSupplier.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createSupplier.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create supplier";
      })

      .addCase(updateSupplier.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSupplier.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.map((supplier) =>
          supplier.id === action.payload.id ? action.payload : supplier,
        );
        if (state.selectedSupplier?.id === action.payload.id) {
          state.selectedSupplier = action.payload;
        }
      })
      .addCase(updateSupplier.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update supplier";
      })

      .addCase(deactivateSupplier.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deactivateSupplier.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.map((supplier) =>
          supplier.id === action.payload.id ? action.payload : supplier,
        );
        if (state.selectedSupplier?.id === action.payload.id) {
          state.selectedSupplier = action.payload;
        }
      })
      .addCase(deactivateSupplier.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to deactivate supplier";
      })

      .addCase(fetchSupplierSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSupplierSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
      })
      .addCase(fetchSupplierSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch supplier summary";
      });
  },
});

export const {
  clearSelectedSupplier,
  clearSuppliersError,
  clearSuppliers,
} = suppliersSlice.actions;

export const selectSuppliers = (state: { suppliers: SuppliersState }) =>
  state.suppliers.items;
export const selectSelectedSupplier = (state: { suppliers: SuppliersState }) =>
  state.suppliers.selectedSupplier;
export const selectSupplierSummary = (state: { suppliers: SuppliersState }) =>
  state.suppliers.summary;
export const selectSuppliersLoading = (state: { suppliers: SuppliersState }) =>
  state.suppliers.loading;
export const selectSuppliersError = (state: { suppliers: SuppliersState }) =>
  state.suppliers.error;

export default suppliersSlice.reducer;
