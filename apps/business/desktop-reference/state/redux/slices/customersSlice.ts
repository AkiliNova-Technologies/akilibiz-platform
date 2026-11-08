import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/utils/error-message";
import {
  tauriCustomersService,
  type AddLoyaltyPointsPayload,
  type CreateCustomerPayload,
  type CustomerCreditRow,
  type CustomerPurchaseHistoryRow,
  type CustomerQuery,
  type CustomerResponse,
  type CustomerSummary,
  type UpdateCustomerPayload,
} from "@/services/tauri/customers";

interface CustomersState {
  items: CustomerResponse[];
  selectedCustomer: CustomerResponse | null;
  purchaseHistory: CustomerPurchaseHistoryRow[];
  creditAccounts: CustomerCreditRow[];
  summary: CustomerSummary | null;
  loading: boolean;
  error: string | null;
}

const initialState: CustomersState = {
  items: [],
  selectedCustomer: null,
  purchaseHistory: [],
  creditAccounts: [],
  summary: null,
  loading: false,
  error: null,
};

export const fetchCustomers = createAsyncThunk<
  CustomerResponse[],
  CustomerQuery | undefined,
  { rejectValue: string }
>("customers/fetchAll", async (params, { rejectWithValue }) => {
  try {
    return await tauriCustomersService.getCustomers(params || {});
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch customers"));
  }
});

export const fetchCustomerById = createAsyncThunk<
  CustomerResponse,
  number,
  { rejectValue: string }
>("customers/fetchById", async (id, { rejectWithValue }) => {
  try {
    return await tauriCustomersService.getCustomer(id);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch customer"));
  }
});

export const createCustomer = createAsyncThunk<
  CustomerResponse,
  CreateCustomerPayload,
  { rejectValue: string }
>("customers/create", async (payload, { rejectWithValue }) => {
  try {
    return await tauriCustomersService.createCustomer(payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to create customer"));
  }
});

export const updateCustomer = createAsyncThunk<
  CustomerResponse,
  { id: number; payload: UpdateCustomerPayload },
  { rejectValue: string }
>("customers/update", async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await tauriCustomersService.updateCustomer(id, payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to update customer"));
  }
});

export const deleteCustomer = createAsyncThunk<
  CustomerResponse,
  number,
  { rejectValue: string }
>("customers/delete", async (id, { rejectWithValue }) => {
  try {
    return await tauriCustomersService.deactivateCustomer(id);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to deactivate customer"));
  }
});

export const addLoyaltyPoints = createAsyncThunk<
  CustomerResponse,
  { id: number; payload: AddLoyaltyPointsPayload },
  { rejectValue: string }
>("customers/addLoyaltyPoints", async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await tauriCustomersService.addLoyaltyPoints(id, payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to add loyalty points"));
  }
});

export const fetchPurchaseHistory = createAsyncThunk<
  CustomerPurchaseHistoryRow[],
  number,
  { rejectValue: string }
>("customers/fetchPurchaseHistory", async (id, { rejectWithValue }) => {
  try {
    return await tauriCustomersService.getCustomerPurchaseHistory(id);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch purchase history"));
  }
});

export const fetchCustomerCreditAccounts = createAsyncThunk<
  CustomerCreditRow[],
  void,
  { rejectValue: string }
>("customers/fetchCreditAccounts", async (_, { rejectWithValue }) => {
  try {
    return await tauriCustomersService.getCustomerCreditAccounts();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch credit accounts"));
  }
});

export const fetchCustomerSummary = createAsyncThunk<
  CustomerSummary,
  void,
  { rejectValue: string }
>("customers/fetchSummary", async (_, { rejectWithValue }) => {
  try {
    return await tauriCustomersService.getCustomerSummary();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch customer summary"));
  }
});

const customersSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {
    clearSelectedCustomer: (state) => {
      state.selectedCustomer = null;
      state.purchaseHistory = [];
    },
    clearError: (state) => {
      state.error = null;
    },
    clearCreditAccounts: (state) => {
      state.creditAccounts = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch customers";
      })

      .addCase(fetchCustomerById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedCustomer = action.payload;
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch customer";
      })

      .addCase(createCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create customer";
      })

      .addCase(updateCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.map((customer) =>
          customer.id === action.payload.id ? action.payload : customer,
        );
        if (state.selectedCustomer?.id === action.payload.id) {
          state.selectedCustomer = action.payload;
        }
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update customer";
      })

      .addCase(deleteCustomer.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.map((customer) =>
          customer.id === action.payload.id ? action.payload : customer,
        );
        if (state.selectedCustomer?.id === action.payload.id) {
          state.selectedCustomer = action.payload;
        }
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to deactivate customer";
      })

      .addCase(addLoyaltyPoints.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addLoyaltyPoints.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.map((customer) =>
          customer.id === action.payload.id ? action.payload : customer,
        );
        if (state.selectedCustomer?.id === action.payload.id) {
          state.selectedCustomer = action.payload;
        }
      })
      .addCase(addLoyaltyPoints.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to add loyalty points";
      })

      .addCase(fetchPurchaseHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPurchaseHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.purchaseHistory = action.payload;
      })
      .addCase(fetchPurchaseHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch purchase history";
      })

      .addCase(fetchCustomerCreditAccounts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerCreditAccounts.fulfilled, (state, action) => {
        state.loading = false;
        state.creditAccounts = action.payload;
      })
      .addCase(fetchCustomerCreditAccounts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch credit accounts";
      })

      .addCase(fetchCustomerSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
      })
      .addCase(fetchCustomerSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch customer summary";
      });
  },
});

export const {
  clearSelectedCustomer,
  clearError,
  clearCreditAccounts,
} = customersSlice.actions;

export const selectCustomers = (state: { customers: CustomersState }) =>
  state.customers.items;
export const selectSelectedCustomer = (state: { customers: CustomersState }) =>
  state.customers.selectedCustomer;
export const selectPurchaseHistory = (state: { customers: CustomersState }) =>
  state.customers.purchaseHistory;
export const selectCustomerCreditAccounts = (state: { customers: CustomersState }) =>
  state.customers.creditAccounts;
export const selectCustomerSummary = (state: { customers: CustomersState }) =>
  state.customers.summary;
export const selectCustomersLoading = (state: { customers: CustomersState }) =>
  state.customers.loading;
export const selectCustomersError = (state: { customers: CustomersState }) =>
  state.customers.error;

export default customersSlice.reducer;
