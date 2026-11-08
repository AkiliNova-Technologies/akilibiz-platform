import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  tauriProductService,
  type Product,
  type CreateProductPayload,
  type UpdateProductPayload,
  type ProductQueryParams,
} from "@/services/tauri/products";

interface ProductsState {
  items: Product[];
  selectedProduct: Product | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  items: [],
  selectedProduct: null,
  loading: false,
  error: null,
};

export const fetchProducts = createAsyncThunk<
  Product[],
  ProductQueryParams | undefined,
  { rejectValue: string }
>("products/fetchAll", async (params, { rejectWithValue }) => {
  try {
    return await tauriProductService.getProducts(params || {});
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch products"
    );
  }
});

export const fetchProductById = createAsyncThunk<
  Product,
  number,
  { rejectValue: string }
>("products/fetchById", async (id, { rejectWithValue }) => {
  try {
    return await tauriProductService.getProduct(id);
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to fetch product"
    );
  }
});

export const createProduct = createAsyncThunk<
  Product,
  CreateProductPayload,
  { rejectValue: string }
>("products/create", async (productData, { rejectWithValue }) => {
  try {
    return await tauriProductService.createProduct(productData);
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to create product"
    );
  }
});

export const updateProduct = createAsyncThunk<
  Product,
  { id: number; payload: UpdateProductPayload },
  { rejectValue: string }
>("products/update", async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await tauriProductService.updateProduct(id, payload);
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to update product"
    );
  }
});

export const deactivateProduct = createAsyncThunk<
  Product,
  number,
  { rejectValue: string }
>("products/deactivate", async (id, { rejectWithValue }) => {
  try {
    return await tauriProductService.deactivateProduct(id);
  } catch (error) {
    return rejectWithValue(
      error instanceof Error ? error.message : "Failed to deactivate product"
    );
  }
});

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    clearSelectedProduct: (state) => {
      state.selectedProduct = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch products";
      })

      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch product";
      })

      .addCase(createProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createProduct.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create product";
      })

      .addCase(updateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedProduct?.id === action.payload.id) {
          state.selectedProduct = action.payload;
        }
      })
      .addCase(updateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update product";
      })

      .addCase(deactivateProduct.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deactivateProduct.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.items.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
        if (state.selectedProduct?.id === action.payload.id) {
          state.selectedProduct = action.payload;
        }
      })
      .addCase(deactivateProduct.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to deactivate product";
      });
  },
});

export const { clearSelectedProduct, clearError } = productsSlice.actions;

export const selectProducts = (state: { products: ProductsState }) =>
  state.products.items;
export const selectSelectedProduct = (state: { products: ProductsState }) =>
  state.products.selectedProduct;
export const selectProductsLoading = (state: { products: ProductsState }) =>
  state.products.loading;
export const selectProductsError = (state: { products: ProductsState }) =>
  state.products.error;

export default productsSlice.reducer;