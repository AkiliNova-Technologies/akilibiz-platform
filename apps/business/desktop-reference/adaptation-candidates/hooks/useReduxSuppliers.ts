import { useCallback } from "react";
import { getErrorMessage } from "@/utils/error-message";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchSuppliers,
  fetchSupplierById,
  createSupplier,
  updateSupplier,
  deactivateSupplier,
  fetchSupplierSummary,
  selectSuppliers,
  selectSelectedSupplier,
  selectSupplierSummary,
  selectSuppliersLoading,
  selectSuppliersError,
  clearSelectedSupplier,
  clearSuppliersError,
} from "@/redux/slices/suppliersSlice";
import type {
  CreateSupplierPayload,
  SupplierQuery,
  UpdateSupplierPayload,
} from "@/services/tauri/suppliers";

export const useReduxSuppliers = () => {
  const dispatch = useAppDispatch();

  const suppliers = useAppSelector(selectSuppliers);
  const selectedSupplier = useAppSelector(selectSelectedSupplier);
  const summary = useAppSelector(selectSupplierSummary);
  const loading = useAppSelector(selectSuppliersLoading);
  const error = useAppSelector(selectSuppliersError);

  const getSuppliers = useCallback(
    async (params?: SupplierQuery) => {
      try {
        return await dispatch(fetchSuppliers(params)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load suppliers"));
        throw err;
      }
    },
    [dispatch],
  );

  const getSupplier = useCallback(
    async (supplierId: number) => {
      try {
        return await dispatch(fetchSupplierById(supplierId)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load supplier"));
        throw err;
      }
    },
    [dispatch],
  );

  const addSupplier = useCallback(
    async (payload: CreateSupplierPayload) => {
      try {
        const result = await dispatch(createSupplier(payload)).unwrap();
        toast.success("Supplier added successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to add supplier"));
        return null;
      }
    },
    [dispatch],
  );

  const editSupplier = useCallback(
    async (supplierId: number, payload: UpdateSupplierPayload) => {
      try {
        const result = await dispatch(
          updateSupplier({ id: supplierId, payload }),
        ).unwrap();
        toast.success("Supplier updated successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to update supplier"));
        return null;
      }
    },
    [dispatch],
  );

  const removeSupplier = useCallback(
    async (supplierId: number) => {
      try {
        const result = await dispatch(deactivateSupplier(supplierId)).unwrap();
        toast.success("Supplier deactivated successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to deactivate supplier"));
        return null;
      }
    },
    [dispatch],
  );

  const getSupplierSummary = useCallback(async () => {
    try {
      return await dispatch(fetchSupplierSummary()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load supplier summary"));
      throw err;
    }
  }, [dispatch]);

  const refreshSuppliers = useCallback(
    async (params?: SupplierQuery) => {
      return await Promise.all([
        dispatch(fetchSuppliers(params)).unwrap(),
        dispatch(fetchSupplierSummary()).unwrap(),
      ]);
    },
    [dispatch],
  );

  const clearSupplier = useCallback(() => {
    dispatch(clearSelectedSupplier());
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearSuppliersError());
  }, [dispatch]);

  return {
    suppliers,
    selectedSupplier,
    summary,
    loading,
    error,
    getSuppliers,
    getSupplier,
    addSupplier,
    editSupplier,
    removeSupplier,
    getSupplierSummary,
    refreshSuppliers,
    clearSupplier,
    clearError,
  };
};
