import { useCallback } from "react";
import { getErrorMessage } from "@/utils/error-message";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  adjustStock,
  fetchInventoryOverview,
  fetchInventorySummary,
  fetchLowStockAlerts,
  fetchStockHistory,
  selectInventoryError,
  selectInventoryLoading,
  selectInventoryLogs,
  selectInventoryOverview,
  selectInventorySummary,
  selectLowStockAlerts,
  clearInventoryError,
  clearInventoryLogs,
} from "@/redux/slices/inventorySlice";
import type {
  AdjustStockPayload,
  StockHistoryQuery,
} from "@/services/tauri/inventory";

function normalizeNumber(value: unknown, fallback = 0) {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? parseFloat(value)
        : NaN;

  return Number.isFinite(num) ? num : fallback;
}

export const useReduxInventory = () => {
  const dispatch = useAppDispatch();

  const overview = useAppSelector(selectInventoryOverview);
  const summary = useAppSelector(selectInventorySummary);
  const logs = useAppSelector(selectInventoryLogs);
  const lowStockAlerts = useAppSelector(selectLowStockAlerts);
  const loading = useAppSelector(selectInventoryLoading);
  const error = useAppSelector(selectInventoryError);

  const getOverview = useCallback(async () => {
    try {
      return await dispatch(fetchInventoryOverview()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load inventory overview"));
      throw err;
    }
  }, [dispatch]);

  const getSummary = useCallback(async () => {
    try {
      return await dispatch(fetchInventorySummary()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load inventory summary"));
      throw err;
    }
  }, [dispatch]);

  const getLogs = useCallback(
    async (
      productId?: number,
      query?: Omit<StockHistoryQuery, "product_id">,
    ) => {
      try {
        return await dispatch(
          fetchStockHistory({
            ...(query || {}),
            product_id: productId,
          }),
        ).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load stock history"));
        throw err;
      }
    },
    [dispatch],
  );

  const getLowStock = useCallback(async () => {
    try {
      return await dispatch(fetchLowStockAlerts()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load low stock alerts"));
      throw err;
    }
  }, [dispatch]);

  const refreshInventory = useCallback(async () => {
    await Promise.all([
      dispatch(fetchInventoryOverview()).unwrap(),
      dispatch(fetchInventorySummary()).unwrap(),
      dispatch(fetchLowStockAlerts()).unwrap(),
    ]);
  }, [dispatch]);

  const adjust = useCallback(
    async (
      productId: number,
      adjustment: {
        quantity_change?: number | string;
        quantity?: number | string;
        adjustment_type: AdjustStockPayload["adjustment_type"];
        reason: string;
        notes?: string;
        unit_cost?: number | string | null;
        opening_unit_cost_ugx?: number | string | null;
        reference_type?: string | null;
        reference_id?: string | null;
        performed_by_user_id?: number | null;
      },
    ) => {
      try {
        const rawQty = adjustment.quantity ?? adjustment.quantity_change ?? 0;

        const payload: AdjustStockPayload = {
          product_id: productId,
          adjustment_type: adjustment.adjustment_type,
          quantity: Math.abs(normalizeNumber(rawQty)),
          reason: adjustment.reason,
          notes: adjustment.notes || null,
          unit_cost:
            adjustment.unit_cost === null ||
            adjustment.unit_cost === undefined
              ? null
              : normalizeNumber(adjustment.unit_cost),
          opening_unit_cost_ugx:
            adjustment.opening_unit_cost_ugx === null ||
            adjustment.opening_unit_cost_ugx === undefined
              ? null
              : normalizeNumber(adjustment.opening_unit_cost_ugx),
          reference_type: adjustment.reference_type || null,
          reference_id: adjustment.reference_id || null,
          performed_by_user_id: adjustment.performed_by_user_id ?? null,
        };

        await dispatch(adjustStock(payload)).unwrap();
        await refreshInventory();

        toast.success("Stock adjusted successfully");
        return true;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to adjust stock"));
        return false;
      }
    },
    [dispatch, refreshInventory],
  );

  const clearError = useCallback(() => {
    dispatch(clearInventoryError());
  }, [dispatch]);

  const clearLogs = useCallback(() => {
    dispatch(clearInventoryLogs());
  }, [dispatch]);

  return {
    overview,
    summary,
    logs,
    lowStockAlerts,
    loading,
    error,
    getOverview,
    getSummary,
    getLogs,
    getLowStock,
    refreshInventory,
    adjust,
    clearError,
    clearLogs,
  };
};
