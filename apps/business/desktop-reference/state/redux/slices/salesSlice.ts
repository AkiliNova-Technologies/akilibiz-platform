import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  tauriSalesService,
  type CancelSalePayload,
  type CreateSalePayload,
  type RecordSalePaymentPayload,
  type SaleDetailResponse,
  type SaleListResponse,
  type SalesQuery,
  type SalesSummary,
} from "@/services/tauri/sales";

interface SalesState {
  items: SaleListResponse[];
  selectedSale: SaleDetailResponse | null;
  summary: SalesSummary | null;
  loading: boolean;
  error: string | null;
}

const initialState: SalesState = {
  items: [],
  selectedSale: null,
  summary: null,
  loading: false,
  error: null,
};

export const fetchSales = createAsyncThunk<
  SaleListResponse[],
  SalesQuery | undefined,
  { rejectValue: string }
>("sales/fetchAll", async (params, { rejectWithValue }) => {
  try {
    return await tauriSalesService.getSales(params || {});
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch sales"
    );
  }
});

export const fetchSaleById = createAsyncThunk<
  SaleDetailResponse,
  number,
  { rejectValue: string }
>("sales/fetchById", async (saleId, { rejectWithValue }) => {
  try {
    return await tauriSalesService.getSale(saleId);
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch sale"
    );
  }
});

export const createSale = createAsyncThunk<
  SaleDetailResponse,
  CreateSalePayload,
  { rejectValue: string }
>("sales/create", async (payload, { rejectWithValue }) => {
  try {
    return await tauriSalesService.createSale(payload);
  } catch (error) {
    console.error("createSale error:", error);
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to create sale"
    );
  }
});

export const cancelSale = createAsyncThunk<
  SaleDetailResponse,
  { saleId: number; payload: CancelSalePayload },
  { rejectValue: string }
>("sales/cancel", async ({ saleId, payload }, { rejectWithValue }) => {
  try {
    return await tauriSalesService.cancelSale(saleId, payload);
  } catch (error) {
    console.error("cancelSale error:", error);
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to cancel sale"
    );
  }
});

export const fetchSalesSummary = createAsyncThunk<
  SalesSummary,
  SalesQuery | undefined,
  { rejectValue: string }
>("sales/fetchSummary", async (params, { rejectWithValue }) => {
  try {
    return await tauriSalesService.getSalesSummary(params || {});
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch sales summary"
    );
  }
});

export const recordSalePayment = createAsyncThunk<
  SaleDetailResponse,
  { saleId: number; payload: RecordSalePaymentPayload },
  { rejectValue: string }
>("sales/recordPayment", async ({ saleId, payload }, { rejectWithValue }) => {
  try {
    return await tauriSalesService.recordSalePayment(saleId, payload);
  } catch (error) {
    console.error("recordSalePayment error:", error);
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to record payment"
    );
  }
});

const salesSlice = createSlice({
  name: "sales",
  initialState,
  reducers: {
    clearSelectedSale: (state) => {
      state.selectedSale = null;
    },
    clearSalesError: (state) => {
      state.error = null;
    },
    clearSales: (state) => {
      state.items = [];
      state.selectedSale = null;
      state.summary = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSales.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSales.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchSales.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch sales";
      })

      .addCase(fetchSaleById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSaleById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedSale = action.payload;
      })
      .addCase(fetchSaleById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch sale";
      })

      .addCase(createSale.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSale.fulfilled, (state, action) => {
        state.loading = false;

        const sale = action.payload;

        state.selectedSale = sale;

        state.items.unshift({
          id: sale.id,
          sale_number: sale.sale_number,
          customer_id: sale.customer_id,
          customer_name: sale.customer_name,
          customer_phone: sale.customer_phone,
          cashier_name: sale.cashier_name,
          items_count: sale.items_count,
          subtotal: sale.subtotal,
          discount_amount: sale.discount_amount,
          tax_amount: sale.tax_amount,
          tax_classification: sale.tax_classification,
          tax_rate: sale.tax_rate,
          total_amount: sale.total_amount,
          amount_paid: sale.amount_paid,
          change_amount: sale.change_amount,
          balance_due: sale.balance_due,
          payment_status: sale.payment_status,
          due_date: sale.due_date,
          last_payment_at: sale.last_payment_at,
          payment_method: sale.payment_method,
          status: sale.status,
          created_at: sale.created_at,
        });
      })
      .addCase(createSale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create sale";
      })

      .addCase(cancelSale.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelSale.fulfilled, (state, action) => {
        state.loading = false;

        const sale = action.payload;
        state.selectedSale = sale;

        state.items = state.items.map((item) =>
          item.id === sale.id
            ? {
                ...item,
                status: sale.status,
              }
            : item,
        );
      })
      .addCase(cancelSale.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to cancel sale";
      })

      .addCase(fetchSalesSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSalesSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
      })
      .addCase(fetchSalesSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch sales summary";
      })

      .addCase(recordSalePayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(recordSalePayment.fulfilled, (state, action) => {
        state.loading = false;

        const sale = action.payload;
        state.selectedSale = sale;

        state.items = state.items.map((item) =>
          item.id === sale.id
            ? {
                ...item,
                amount_paid: sale.amount_paid,
                balance_due: sale.balance_due,
                payment_status: sale.payment_status,
                last_payment_at: sale.last_payment_at,
              }
            : item,
        );
      })
      .addCase(recordSalePayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to record payment";
      });
  },
});

export const { clearSelectedSale, clearSalesError, clearSales } =
  salesSlice.actions;

export const selectSales = (state: { sales: SalesState }) => state.sales.items;
export const selectSelectedSale = (state: { sales: SalesState }) =>
  state.sales.selectedSale;
export const selectSalesSummary = (state: { sales: SalesState }) =>
  state.sales.summary;
export const selectSalesLoading = (state: { sales: SalesState }) =>
  state.sales.loading;
export const selectSalesError = (state: { sales: SalesState }) =>
  state.sales.error;

export default salesSlice.reducer;