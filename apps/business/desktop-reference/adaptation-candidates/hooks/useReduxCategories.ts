import { useCallback } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchCategories,
  fetchCategoryById,
  createCategory,
  updateCategory,
  selectCategories,
  selectSelectedCategory,
  selectCategoryLoading,
  selectCategoryError,
  clearCategoryError,
} from "@/redux/slices/categoriesSlice";
import type {
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "@/services/tauri/categories";
import { useI18n } from "@/hooks/useI18n";

export const useReduxCategories = () => {
  const { t } = useI18n();
  const dispatch = useAppDispatch();

  const categories = useAppSelector(selectCategories);
  const selectedCategory = useAppSelector(selectSelectedCategory);
  const loading = useAppSelector(selectCategoryLoading);
  const error = useAppSelector(selectCategoryError);

  const getCategories = useCallback(async () => {
    try {
      return await dispatch(fetchCategories()).unwrap();
    } catch (err: unknown) {
      toast.error(t("categories.loadFailed"));
      throw err;
    }
  }, [dispatch, t]);

  const getCategory = useCallback(
    async (id: number) => {
      try {
        return await dispatch(fetchCategoryById(id)).unwrap();
      } catch (err: unknown) {
        toast.error(t("categories.loadOneFailed"));
        throw err;
      }
    },
    [dispatch, t],
  );

  const addCategory = useCallback(
    async (payload: CreateCategoryPayload) => {
      try {
        const result = await dispatch(createCategory(payload)).unwrap();
        toast.success(t("categories.createdSuccess"));
        return result;
      } catch (err: unknown) {
        toast.error(t("categories.createFailed"));
        throw err;
      }
    },
    [dispatch, t],
  );

  const editCategory = useCallback(
    async (id: number, payload: UpdateCategoryPayload) => {
      try {
        const result = await dispatch(updateCategory({ id, payload })).unwrap();
        toast.success(t("categories.updatedSuccess"));
        return result;
      } catch (err: unknown) {
        toast.error(t("categories.updateFailed"));
        throw err;
      }
    },
    [dispatch, t],
  );

  const clearError = useCallback(() => {
    dispatch(clearCategoryError());
  }, [dispatch]);

  return {
    categories,
    selectedCategory,
    loading,
    error,
    getCategories,
    getCategory,
    addCategory,
    editCategory,
    clearError,
  };
};
