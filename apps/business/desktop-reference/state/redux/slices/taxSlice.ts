import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/utils/error-message";
import {
  tauriTaxService,
  type TaxClassification,
  type TaxRate,
  type TaxSettings,
  type UpdateTaxSettingsPayload,
  type TaxCalculationResult,
  type CalculateTaxPayload,
} from "@/services/tauri/tax";

interface TaxState {
  classifications: TaxClassification[];
  rates: TaxRate[];
  settings: TaxSettings | null;
  calculationResult: TaxCalculationResult | null;
  loading: boolean;
  error: string | null;
}

const initialState: TaxState = {
  classifications: [],
  rates: [],
  settings: null,
  calculationResult: null,
  loading: false,
  error: null,
};

export const fetchTaxClassifications = createAsyncThunk<
  TaxClassification[],
  void,
  { rejectValue: string }
>("tax/fetchClassifications", async (_, { rejectWithValue }) => {
  try {
    return await tauriTaxService.getTaxClassifications();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch tax classifications"));
  }
});

export const fetchTaxRates = createAsyncThunk<
  TaxRate[],
  void,
  { rejectValue: string }
>("tax/fetchRates", async (_, { rejectWithValue }) => {
  try {
    return await tauriTaxService.getTaxRates();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch tax rates"));
  }
});

export const fetchTaxSettings = createAsyncThunk<
  TaxSettings,
  void,
  { rejectValue: string }
>("tax/fetchSettings", async (_, { rejectWithValue }) => {
  try {
    return await tauriTaxService.getTaxSettings();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch tax settings"));
  }
});

export const updateTaxSettings = createAsyncThunk<
  TaxSettings,
  UpdateTaxSettingsPayload,
  { rejectValue: string }
>("tax/updateSettings", async (payload, { rejectWithValue }) => {
  try {
    return await tauriTaxService.updateTaxSettings(payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to update tax settings"));
  }
});

export const calculateTax = createAsyncThunk<
  TaxCalculationResult,
  CalculateTaxPayload,
  { rejectValue: string }
>("tax/calculate", async (payload, { rejectWithValue }) => {
  try {
    return await tauriTaxService.calculateTax(payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to calculate tax"));
  }
});

const taxSlice = createSlice({
  name: "tax",
  initialState,
  reducers: {
    clearTaxError: (state) => {
      state.error = null;
    },
    clearCalculationResult: (state) => {
      state.calculationResult = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTaxClassifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaxClassifications.fulfilled, (state, action) => {
        state.loading = false;
        state.classifications = action.payload;
      })
      .addCase(fetchTaxClassifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch tax classifications";
      })

      .addCase(fetchTaxRates.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaxRates.fulfilled, (state, action) => {
        state.loading = false;
        state.rates = action.payload;
      })
      .addCase(fetchTaxRates.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch tax rates";
      })

      .addCase(fetchTaxSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTaxSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(fetchTaxSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch tax settings";
      })

      .addCase(updateTaxSettings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTaxSettings.fulfilled, (state, action) => {
        state.loading = false;
        state.settings = action.payload;
      })
      .addCase(updateTaxSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update tax settings";
      })

      .addCase(calculateTax.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(calculateTax.fulfilled, (state, action) => {
        state.loading = false;
        state.calculationResult = action.payload;
      })
      .addCase(calculateTax.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to calculate tax";
      });
  },
});

export const { clearTaxError, clearCalculationResult } = taxSlice.actions;

export const selectTaxClassifications = (state: { tax: TaxState }) =>
  state.tax.classifications;
export const selectTaxRates = (state: { tax: TaxState }) =>
  state.tax.rates;
export const selectTaxSettings = (state: { tax: TaxState }) =>
  state.tax.settings;
export const selectTaxCalculationResult = (state: { tax: TaxState }) =>
  state.tax.calculationResult;
export const selectTaxLoading = (state: { tax: TaxState }) =>
  state.tax.loading;
export const selectTaxError = (state: { tax: TaxState }) =>
  state.tax.error;

export default taxSlice.reducer;
