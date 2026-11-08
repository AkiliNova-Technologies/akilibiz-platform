import { useCallback } from "react";
import { getErrorMessage } from "@/utils/error-message";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchSupplierPayments,
  fetchSupplierPaymentById,
  createSupplierPayment,
  updateSupplierPayment,
  markSupplierPaymentSettled,
  fetchSupplierPaymentSummary,
  selectSupplierPayments,
  selectSelectedSupplierPayment,
  selectSupplierPaymentSummary,
  selectSupplierPaymentsLoading,
  selectSupplierPaymentsError,
  clearSelectedSupplierPayment,
  clearSupplierPaymentsError,
} from "@/redux/slices/supplierPaymentsSlice";
import type {
  CreateSupplierPaymentPayload,
  SupplierPaymentQuery,
  UpdateSupplierPaymentPayload,
} from "@/services/tauri/supplier-payments";

export const useReduxSupplierPayments = () => {
  const dispatch = useAppDispatch();

  const payments = useAppSelector(selectSupplierPayments);
  const selectedPayment = useAppSelector(selectSelectedSupplierPayment);
  const summary = useAppSelector(selectSupplierPaymentSummary);
  const loading = useAppSelector(selectSupplierPaymentsLoading);
  const error = useAppSelector(selectSupplierPaymentsError);

  const getPayments = useCallback(async (params?: SupplierPaymentQuery) => {
    try {
      return await dispatch(fetchSupplierPayments(params)).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load supplier payments"));
      throw err;
    }
  }, [dispatch]);

  const getPayment = useCallback(async (paymentId: number) => {
    try {
      return await dispatch(fetchSupplierPaymentById(paymentId)).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load supplier payment"));
      throw err;
    }
  }, [dispatch]);

  const addPayment = useCallback(async (payload: CreateSupplierPaymentPayload) => {
    try {
      const result = await dispatch(createSupplierPayment(payload)).unwrap();
      toast.success("Supplier payment recorded successfully");
      return result;
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to record supplier payment"));
      return null;
    }
  }, [dispatch]);

  const editPayment = useCallback(
    async (paymentId: number, payload: UpdateSupplierPaymentPayload) => {
      try {
        const result = await dispatch(
          updateSupplierPayment({ id: paymentId, payload }),
        ).unwrap();
        toast.success("Supplier payment updated successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to update supplier payment"));
        return null;
      }
    },
    [dispatch],
  );

  const markSettled = useCallback(async (paymentId: number) => {
    try {
      const result = await dispatch(markSupplierPaymentSettled(paymentId)).unwrap();
      toast.success("Supplier payment marked as settled");
      return result;
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to mark payment settled"));
      return null;
    }
  }, [dispatch]);

  const getSummary = useCallback(async () => {
    try {
      return await dispatch(fetchSupplierPaymentSummary()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load supplier payment summary"));
      throw err;
    }
  }, [dispatch]);

  const refreshPayments = useCallback(async (params?: SupplierPaymentQuery) => {
    return await Promise.all([
      dispatch(fetchSupplierPayments(params)).unwrap(),
      dispatch(fetchSupplierPaymentSummary()).unwrap(),
    ]);
  }, [dispatch]);

  const clearPayment = useCallback(() => {
    dispatch(clearSelectedSupplierPayment());
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearSupplierPaymentsError());
  }, [dispatch]);

  return {
    payments,
    selectedPayment,
    summary,
    loading,
    error,
    getPayments,
    getPayment,
    addPayment,
    editPayment,
    markSettled,
    getSummary,
    refreshPayments,
    clearPayment,
    clearError,
  };
};
