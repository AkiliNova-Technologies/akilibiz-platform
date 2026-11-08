import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchProducts,
  fetchProductById,
  createProduct,
  updateProduct,
  deactivateProduct,
  selectProducts,
  selectSelectedProduct,
  selectProductsLoading,
  selectProductsError,
  clearError,
} from "@/redux/slices/productsSlice";
import type {
  CreateProductPayload,
  ProductQueryParams,
  UpdateProductPayload,
} from "@/services/tauri/products";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";

function normalizeNumber(value: unknown, fallback = 0) {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseFloat(value)
        : NaN;
  return Number.isFinite(num) ? num : fallback;
}

export const useReduxProducts = () => {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);
  const selectedProduct = useAppSelector(selectSelectedProduct);
  const loading = useAppSelector(selectProductsLoading);
  const error = useAppSelector(selectProductsError);

  const getProducts = useCallback(
    async (params?: ProductQueryParams) => {
      try {
        await dispatch(fetchProducts(params || {})).unwrap();
      } catch {
        toast.error(t("products.loadFailed"));
      }
    },
    [dispatch, t],
  );

  const getProduct = useCallback(
    async (id: number) => {
      try {
        await dispatch(fetchProductById(id)).unwrap();
      } catch {
        toast.error(t("products.loadOneFailed"));
      }
    },
    [dispatch, t],
  );

  const addProduct = useCallback(
    async (productData: CreateProductPayload) => {
      try {
        const transformedData: CreateProductPayload = {
          ...productData,
          category_id: Number(productData.category_id),
          unit_conversion_factor: normalizeNumber(
            productData.unit_conversion_factor,
            1,
          ),
          pack_size:
            productData.pack_size === null || productData.pack_size === undefined
              ? null
              : normalizeNumber(productData.pack_size),
          cost_price: normalizeNumber(productData.cost_price),
          selling_price: normalizeNumber(productData.selling_price),
          wholesale_price:
            productData.wholesale_price === null ||
            productData.wholesale_price === undefined
              ? null
              : normalizeNumber(productData.wholesale_price),
          minimum_selling_price:
            productData.minimum_selling_price === null ||
            productData.minimum_selling_price === undefined
              ? null
              : normalizeNumber(productData.minimum_selling_price),
          stock_quantity: normalizeNumber(productData.stock_quantity),
          min_stock_level: normalizeNumber(productData.min_stock_level),
          max_stock_level: normalizeNumber(productData.max_stock_level),
        };

        await dispatch(createProduct(transformedData)).unwrap();
        toast.success(t("products.added"));
        return true;
      } catch {
        toast.error(t("products.addFailed"));
        return false;
      }
    },
    [dispatch, t],
  );

  const editProduct = useCallback(
    async (id: number, productData: UpdateProductPayload) => {
      try {
        const transformedData: UpdateProductPayload = {
          ...productData,
          category_id:
            productData.category_id !== undefined
              ? Number(productData.category_id)
              : undefined,
          unit_conversion_factor:
            productData.unit_conversion_factor !== undefined
              ? normalizeNumber(productData.unit_conversion_factor, 1)
              : undefined,
          pack_size:
            productData.pack_size === null || productData.pack_size === undefined
              ? productData.pack_size
              : normalizeNumber(productData.pack_size),
          cost_price:
            productData.cost_price !== undefined
              ? normalizeNumber(productData.cost_price)
              : undefined,
          selling_price:
            productData.selling_price !== undefined
              ? normalizeNumber(productData.selling_price)
              : undefined,
          wholesale_price:
            productData.wholesale_price === null ||
            productData.wholesale_price === undefined
              ? productData.wholesale_price
              : normalizeNumber(productData.wholesale_price),
          minimum_selling_price:
            productData.minimum_selling_price === null ||
            productData.minimum_selling_price === undefined
              ? productData.minimum_selling_price
              : normalizeNumber(productData.minimum_selling_price),
          stock_quantity:
            productData.stock_quantity !== undefined
              ? normalizeNumber(productData.stock_quantity)
              : undefined,
          min_stock_level:
            productData.min_stock_level !== undefined
              ? normalizeNumber(productData.min_stock_level)
              : undefined,
          max_stock_level:
            productData.max_stock_level !== undefined
              ? normalizeNumber(productData.max_stock_level)
              : undefined,
        };

        await dispatch(updateProduct({ id, payload: transformedData })).unwrap();
        toast.success(t("products.updated"));
        return true;
      } catch {
        toast.error(t("products.updateFailed"));
        return false;
      }
    },
    [dispatch, t],
  );

  const removeProduct = useCallback(
    async (id: number) => {
      try {
        await dispatch(deactivateProduct(id)).unwrap();
        toast.success(t("products.deactivated"));
        return true;
      } catch {
        toast.error(t("products.deactivateFailed"));
        return false;
      }
    },
    [dispatch, t],
  );

  const clearProductsError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    products,
    selectedProduct,
    loading,
    error,
    getProducts,
    getProduct,
    addProduct,
    editProduct,
    removeProduct,
    clearProductsError,
  };
};
