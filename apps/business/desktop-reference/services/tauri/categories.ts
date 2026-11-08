import { invoke } from "@tauri-apps/api/core";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_count: number;
  stock_quantity_milli: number;
  inventory_value_ugx: number;
  unvalued_stock_quantity_milli: number;
  unvalued_product_count: number;
}

export interface CreateCategoryPayload {
  name: string;
  description?: string | null;
}

export interface UpdateCategoryPayload {
  name?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export const tauriCategoryService = {
  async getCategories(): Promise<Category[]> {
    return await invoke<Category[]>("get_categories");
  },

  async getCategory(categoryId: number): Promise<Category> {
    return await invoke<Category>("get_category", { categoryId });
  },

  async createCategory(payload: CreateCategoryPayload): Promise<Category> {
    return await invoke<Category>("create_category", { payload });
  },

  async updateCategory(
    categoryId: number,
    payload: UpdateCategoryPayload,
  ): Promise<Category> {
    return await invoke<Category>("update_category", { categoryId, payload });
  },
};
