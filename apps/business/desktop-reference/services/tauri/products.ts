import { invoke } from "@tauri-apps/api/core";

export type ProductType = "stock_item" | "service" | "digital" | "fee";
export type InventoryType =
  | "count"
  | "weight"
  | "liquid"
  | "length"
  | "area"
  | "volume";

export interface ProductQueryParams {
  skip?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  is_active?: boolean;
  low_stock_only?: boolean;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  barcode?: string | null;
  brand?: string | null;
  description?: string | null;

  product_type: ProductType;
  inventory_type: InventoryType;

  stock_unit: string;
  sales_unit: string;
  purchase_unit: string;
  unit_conversion_factor: number;
  pack_size?: number | null;

  cost_price: number;
  selling_price: number;
  wholesale_price?: number | null;
  minimum_selling_price?: number | null;

  stock_quantity: number;
  min_stock_level: number;
  max_stock_level: number;

  allow_decimal_quantity: boolean;
  allow_negative_stock: boolean;
  track_expiry: boolean;
  track_batches: boolean;
  is_taxable: boolean;
  tax_classification_id: number | null;
  tax_inclusive: boolean;

  category_id?: number;
  category_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profit_margin: number;
  is_low_stock: boolean;
}

export interface CreateProductPayload {
  name: string;
  sku: string;
  barcode?: string | null;
  brand?: string | null;
  category_id: number;
  description?: string | null;

  product_type: ProductType;
  inventory_type: InventoryType;

  stock_unit: string;
  sales_unit: string;
  purchase_unit?: string | null;
  unit_conversion_factor?: number;
  pack_size?: number | null;

  cost_price: number;
  selling_price: number;
  wholesale_price?: number | null;
  minimum_selling_price?: number | null;

  /** Stock is established after creation through inventory adjustments. */
  stock_quantity?: number;
  min_stock_level: number;
  max_stock_level: number;

  allow_decimal_quantity: boolean;
  allow_negative_stock: boolean;
  track_expiry: boolean;
  track_batches: boolean;
  is_taxable: boolean;
  tax_classification_id?: number | null;
  tax_inclusive?: boolean;
  is_active?: boolean;
}

export interface UpdateProductPayload {
  name?: string | null;
  sku?: string | null;
  barcode?: string | null;
  brand?: string | null;
  category_id?: number;
  description?: string | null;

  product_type?: ProductType;
  inventory_type?: InventoryType;

  stock_unit?: string | null;
  sales_unit?: string | null;
  purchase_unit?: string | null;
  unit_conversion_factor?: number;
  pack_size?: number | null;

  cost_price?: number;
  selling_price?: number;
  wholesale_price?: number | null;
  minimum_selling_price?: number | null;

  stock_quantity?: number;
  min_stock_level?: number;
  max_stock_level?: number;

  allow_decimal_quantity?: boolean;
  allow_negative_stock?: boolean;
  track_expiry?: boolean;
  track_batches?: boolean;
  is_taxable?: boolean;
  tax_classification_id?: number | null;
  tax_inclusive?: boolean;
  is_active?: boolean;
}

export const tauriProductService = {
  async getProducts(params: ProductQueryParams = {}): Promise<Product[]> {
    return await invoke<Product[]>("get_products", { params });
  },

  async getProduct(productId: number): Promise<Product> {
    return await invoke<Product>("get_product", { productId });
  },

  async createProduct(payload: CreateProductPayload): Promise<Product> {
    return await invoke<Product>("create_product", { payload });
  },

  async updateProduct(
    productId: number,
    payload: UpdateProductPayload,
  ): Promise<Product> {
    return await invoke<Product>("update_product", { productId, payload });
  },

  async deactivateProduct(productId: number): Promise<Product> {
    return await invoke<Product>("deactivate_product", { productId });
  },
};
