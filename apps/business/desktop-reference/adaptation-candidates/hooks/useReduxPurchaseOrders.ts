import { useCallback } from "react";
import { getErrorMessage } from "@/utils/error-message";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchPurchaseOrders,
  fetchPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  markPurchaseOrderReceived,
  fetchPurchaseOrderSummary,
  selectPurchaseOrders,
  selectSelectedPurchaseOrder,
  selectPurchaseOrderSummary,
  selectPurchaseOrdersLoading,
  selectPurchaseOrdersError,
  clearSelectedPurchaseOrder,
  clearPurchaseOrdersError,
} from "@/redux/slices/purchaseOrdersSlice";
import type {
  CreatePurchaseOrderPayload,
  PurchaseOrderQuery,
  UpdatePurchaseOrderPayload,
} from "@/services/tauri/purchase-orders";

export const useReduxPurchaseOrders = () => {
  const dispatch = useAppDispatch();

  const orders = useAppSelector(selectPurchaseOrders);
  const selectedOrder = useAppSelector(selectSelectedPurchaseOrder);
  const summary = useAppSelector(selectPurchaseOrderSummary);
  const loading = useAppSelector(selectPurchaseOrdersLoading);
  const error = useAppSelector(selectPurchaseOrdersError);

  const getOrders = useCallback(
    async (params?: PurchaseOrderQuery) => {
      try {
        return await dispatch(fetchPurchaseOrders(params)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load purchase orders"));
        throw err;
      }
    },
    [dispatch],
  );

  const getOrder = useCallback(
    async (orderId: number) => {
      try {
        return await dispatch(fetchPurchaseOrderById(orderId)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load purchase order"));
        throw err;
      }
    },
    [dispatch],
  );

  const addOrder = useCallback(
    async (payload: CreatePurchaseOrderPayload) => {
      try {
        const result = await dispatch(createPurchaseOrder(payload)).unwrap();
        toast.success("Purchase order created successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to create purchase order"));
        return null;
      }
    },
    [dispatch],
  );

  const editOrder = useCallback(
    async (orderId: number, payload: UpdatePurchaseOrderPayload) => {
      try {
        const result = await dispatch(
          updatePurchaseOrder({ id: orderId, payload }),
        ).unwrap();
        toast.success("Purchase order updated successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to update purchase order"));
        return null;
      }
    },
    [dispatch],
  );

  const markReceived = useCallback(
    async (orderId: number) => {
      try {
        const result = await dispatch(
          markPurchaseOrderReceived(orderId),
        ).unwrap();
        toast.success("Purchase order marked as received");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to mark order as received"));
        return null;
      }
    },
    [dispatch],
  );

  const getSummary = useCallback(async () => {
    try {
      return await dispatch(fetchPurchaseOrderSummary()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load purchase order summary"));
      throw err;
    }
  }, [dispatch]);

  const refreshOrders = useCallback(
    async (params?: PurchaseOrderQuery) => {
      return await Promise.all([
        dispatch(fetchPurchaseOrders(params)).unwrap(),
        dispatch(fetchPurchaseOrderSummary()).unwrap(),
      ]);
    },
    [dispatch],
  );

  const clearOrder = useCallback(() => {
    dispatch(clearSelectedPurchaseOrder());
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearPurchaseOrdersError());
  }, [dispatch]);

  return {
    orders,
    selectedOrder,
    summary,
    loading,
    error,
    getOrders,
    getOrder,
    addOrder,
    editOrder,
    markReceived,
    getSummary,
    refreshOrders,
    clearOrder,
    clearError,
  };
};
