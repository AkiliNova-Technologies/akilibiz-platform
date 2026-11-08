import { useCallback } from "react";
import { getErrorMessage } from "@/utils/error-message";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchSales,
  fetchSaleById,
  createSale,
  cancelSale,
  fetchSalesSummary,
  recordSalePayment as recordPayment,
  selectSales,
  selectSelectedSale,
  selectSalesSummary,
  selectSalesLoading,
  selectSalesError,
  clearSelectedSale,
  clearSalesError,
} from "@/redux/slices/salesSlice";
import type {
  CancelSalePayload,
  CreateSalePayload,
  RecordSalePaymentPayload,
  SalesQuery,
} from "@/services/tauri/sales";

export const useReduxSales = () => {
  const dispatch = useAppDispatch();

  const sales = useAppSelector(selectSales);
  const selectedSale = useAppSelector(selectSelectedSale);
  const summary = useAppSelector(selectSalesSummary);
  const loading = useAppSelector(selectSalesLoading);
  const error = useAppSelector(selectSalesError);

  const getSales = useCallback(
    async (params?: SalesQuery) => {
      try {
        return await dispatch(fetchSales(params)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load sales"));
        throw err;
      }
    },
    [dispatch],
  );

  const getSale = useCallback(
    async (saleId: number) => {
      try {
        return await dispatch(fetchSaleById(saleId)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load sale"));
        throw err;
      }
    },
    [dispatch],
  );

  const getSalesSummary = useCallback(
    async (params?: SalesQuery) => {
      try {
        return await dispatch(fetchSalesSummary(params)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load sales summary"));
        throw err;
      }
    },
    [dispatch],
  );

  const addSale = useCallback(
    async (payload: CreateSalePayload) => {
      try {
        const result = await dispatch(createSale(payload)).unwrap();
        toast.success("Sale completed successfully");
        return result;
      } catch (err) {
        console.error("addSale error:", err);
        toast.error(getErrorMessage(err, "Failed to complete sale"));
        return null;
      }
    },
    [dispatch],
  );

  const cancelExistingSale = useCallback(
    async (saleId: number, payload: CancelSalePayload) => {
      try {
        const result = await dispatch(cancelSale({ saleId, payload })).unwrap();
        toast.success("Sale cancelled successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to cancel sale"));
        return null;
      }
    },
    [dispatch],
  );

  const recordSalePayment = useCallback(
    async (saleId: number, payload: RecordSalePaymentPayload) => {
      try {
        const result = await dispatch(recordPayment({ saleId, payload })).unwrap();
        toast.success("Payment recorded successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to record payment"));
        return null;
      }
    },
    [dispatch],
  );

  const refreshSales = useCallback(
    async (params?: SalesQuery) => {
      return await Promise.all([
        dispatch(fetchSales(params)).unwrap(),
        dispatch(fetchSalesSummary(params)).unwrap(),
      ]);
    },
    [dispatch],
  );

  const clearSale = useCallback(() => {
    dispatch(clearSelectedSale());
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearSalesError());
  }, [dispatch]);

  return {
    sales,
    selectedSale,
    summary,
    loading,
    error,
    getSales,
    getSale,
    getSalesSummary,
    addSale,
    cancelExistingSale,
    recordSalePayment,
    refreshSales,
    clearSale,
    clearError,
  };
};
