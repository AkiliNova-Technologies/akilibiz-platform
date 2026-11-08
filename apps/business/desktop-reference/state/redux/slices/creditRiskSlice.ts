import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import * as creditRiskService from "@/services/tauri/credit-risk";
import type { RiskScore, CreditEvent } from "@/services/tauri/credit-risk";

interface CreditRiskState {
  scores: Record<number, RiskScore>;
  events: Record<number, CreditEvent[]>;
  loading: boolean;
  error: string | null;
  selectedCustomerId: number | null;
}

const initialState: CreditRiskState = {
  scores: {},
  events: {},
  loading: false,
  error: null,
  selectedCustomerId: null,
};

export const fetchCustomerRisk = createAsyncThunk(
  "creditRisk/fetchCustomerRisk",
  async (customerId: number, { rejectWithValue }) => {
    try {
      const riskScore = await creditRiskService.calculateCustomerRisk(customerId);
      return { customerId, riskScore };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch risk score"
      );
    }
  }
);

export const fetchCustomerCreditEvents = createAsyncThunk(
  "creditRisk/fetchCustomerCreditEvents",
  async (
    { customerId, limit, offset }: { customerId: number; limit?: number; offset?: number },
    { rejectWithValue }
  ) => {
    try {
      const events = await creditRiskService.getCustomerCreditEvents(
        customerId,
        limit,
        offset
      );
      return { customerId, events };
    } catch (error) {
      return rejectWithValue(
        error instanceof Error ? error.message : "Failed to fetch credit events"
      );
    }
  }
);

const creditRiskSlice = createSlice({
  name: "creditRisk",
  initialState,
  reducers: {
    setSelectedCustomer: (state, action: PayloadAction<number | null>) => {
      state.selectedCustomerId = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearScores: (state) => {
      state.scores = {};
      state.events = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch customer risk
      .addCase(fetchCustomerRisk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerRisk.fulfilled, (state, action) => {
        state.loading = false;
        state.scores[action.payload.customerId] = action.payload.riskScore;
      })
      .addCase(fetchCustomerRisk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch customer credit events
      .addCase(fetchCustomerCreditEvents.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCustomerCreditEvents.fulfilled, (state, action) => {
        state.loading = false;
        state.events[action.payload.customerId] = action.payload.events;
      })
      .addCase(fetchCustomerCreditEvents.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setSelectedCustomer, clearError, clearScores } =
  creditRiskSlice.actions;

export default creditRiskSlice.reducer;