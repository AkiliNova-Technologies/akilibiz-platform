import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  clearDashboardError,
  fetchDashboardData,
  resetDashboardState,
} from "@/redux/slices/dashboardSlice";

export function useReduxDashboard() {
  const dispatch = useAppDispatch();

  const {
    summary,
    recentSales,
    topProducts,
    lowStockItems,
    staffPerformance,
    loading,
    error,
  } = useAppSelector((state) => state.dashboard);

  const loadDashboard = useCallback(async () => {
    return await dispatch(fetchDashboardData()).unwrap();
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearDashboardError());
  }, [dispatch]);

  const resetDashboard = useCallback(() => {
    dispatch(resetDashboardState());
  }, [dispatch]);

  return {
    summary,
    recentSales,
    topProducts,
    lowStockItems,
    staffPerformance,
    loading,
    error,

    loadDashboard,
    clearError,
    resetDashboard,
  };
}