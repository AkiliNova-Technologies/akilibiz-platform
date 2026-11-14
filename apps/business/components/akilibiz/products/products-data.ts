"use client";

import { useCallback } from "react";

export type ProductType = "stock_item" | "service" | "digital" | "fee";
export type InventoryType = "count" | "weight" | "liquid" | "length" | "area" | "volume";
export interface Category { id: number; name: string; }
export interface TaxClassification { id: number; name: string; }
export interface Product { id: number; name: string; sku: string; barcode?: string | null; description?: string | null; brand?: string | null; product_type: ProductType; inventory_type: InventoryType; stock_unit: string; sales_unit: string; purchase_unit?: string | null; unit_conversion_factor: number; pack_size?: number | null; cost_price: number; selling_price: number; wholesale_price?: number | null; minimum_selling_price?: number | null; stock_quantity: number; min_stock_level: number; max_stock_level: number; allow_decimal_quantity: boolean; allow_negative_stock: boolean; track_expiry: boolean; track_batches: boolean; is_taxable: boolean; tax_classification_id?: number | null; tax_inclusive: boolean; category_id?: number; is_active: boolean; created_at: string; updated_at: string; profit_margin: number; is_low_stock: boolean; category_name?: string; }
export type ProductPayload = Omit<Product, "id" | "created_at" | "updated_at" | "profit_margin" | "is_low_stock" | "category_name" | "stock_quantity"> & { stock_quantity?: number };
// Product operations on AkiliBiz Web must use the hosted, business-scoped
// catalogue. This compatibility hook must never invent or mutate local demo
// products and falsely report those edits as saved.
export const categories: Category[] = [];
export const taxClassifications: TaxClassification[] = [];
const EMPTY_PRODUCTS: Product[] = [];
export const formatProductCurrency = (value: number) =>
  new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX",
    maximumFractionDigits: 0 }).format(value);

function unavailable(): never {
  throw new Error("Product changes are not yet available on the web. Use AkiliBiz Desktop.");
}
export function useProductsData() {
  const getProducts = useCallback(async () => EMPTY_PRODUCTS, []);
  const addProduct = useCallback(async (_payload: ProductPayload): Promise<Product> =>
    unavailable(), []);
  const editProduct = useCallback(async (_id: number, _payload: ProductPayload): Promise<Product | null> =>
    unavailable(), []);
  const removeProduct = useCallback(async (_id: number): Promise<boolean> =>
    unavailable(), []);
  return {
    products: EMPTY_PRODUCTS,
    categories,
    classifications: taxClassifications,
    loading: false,
    getProducts,
    getCategories: async () => categories,
    getTaxClassifications: async () => taxClassifications,
    addProduct, editProduct, removeProduct,
  };
}
