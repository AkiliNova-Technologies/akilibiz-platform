import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/utils/error-message";
import {
  tauriCategoryService,
  type Category,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from "@/services/tauri/categories";

interface CategoryState {
  items: Category[];
  selectedCategory: Category | null;
  loading: boolean;
  error: string | null;
}

const initialState: CategoryState = {
  items: [],
  selectedCategory: null,
  loading: false,
  error: null,
};

export const fetchCategories = createAsyncThunk<
  Category[],
  void,
  { rejectValue: string }
>("categories/fetchAll", async (_, { rejectWithValue }) => {
  try {
    return await tauriCategoryService.getCategories();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch categories"));
  }
});

export const fetchCategoryById = createAsyncThunk<
  Category,
  number,
  { rejectValue: string }
>("categories/fetchById", async (id, { rejectWithValue }) => {
  try {
    return await tauriCategoryService.getCategory(id);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to fetch category"));
  }
});

export const createCategory = createAsyncThunk<
  Category,
  CreateCategoryPayload,
  { rejectValue: string }
>("categories/create", async (payload, { rejectWithValue }) => {
  try {
    return await tauriCategoryService.createCategory(payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to create category"));
  }
});

export const updateCategory = createAsyncThunk<
  Category,
  { id: number; payload: UpdateCategoryPayload },
  { rejectValue: string }
>("categories/update", async ({ id, payload }, { rejectWithValue }) => {
  try {
    return await tauriCategoryService.updateCategory(id, payload);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to update category"));
  }
});

const categorySlice = createSlice({
  name: "categories",
  initialState,
  reducers: {
    clearSelectedCategory: (state) => {
      state.selectedCategory = null;
    },
    clearCategoryError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch categories";
      })

      .addCase(fetchCategoryById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategoryById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedCategory = action.payload;
      })
      .addCase(fetchCategoryById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch category";
      })

      .addCase(createCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create category";
      })

      .addCase(updateCategory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCategory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = state.items.map((item) =>
          item.id === action.payload.id ? action.payload : item,
        );
        if (state.selectedCategory?.id === action.payload.id) {
          state.selectedCategory = action.payload;
        }
      })
      .addCase(updateCategory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to update category";
      });
  },
});

export const { clearSelectedCategory, clearCategoryError } =
  categorySlice.actions;

export const selectCategories = (state: { categories: CategoryState }) =>
  state.categories.items;
export const selectSelectedCategory = (state: { categories: CategoryState }) =>
  state.categories.selectedCategory;
export const selectCategoryLoading = (state: { categories: CategoryState }) =>
  state.categories.loading;
export const selectCategoryError = (state: { categories: CategoryState }) =>
  state.categories.error;

export type CategoryItem = Category;

export default categorySlice.reducer;
