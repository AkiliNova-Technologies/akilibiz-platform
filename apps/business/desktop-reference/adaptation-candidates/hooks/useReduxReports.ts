import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  clearReportError,
  fetchFinancialReports,
  fetchInventoryReports,
  fetchProfitLossReports,
  fetchReportsOverview,
  fetchSalesReports,
  resetReportQuery,
  setReportQuery,
} from "@/redux/slices/reportsSlice";
import type { ReportQuery } from "@/services/tauri/reports";

export function useReduxReports() {
  const dispatch = useAppDispatch();

  const {
    overviewRows,
    overviewSummary,
    salesRows,
    salesSummary,
    inventoryRows,
    inventorySummary,
    financialRows,
    financialSummary,
    profitLossRows,
    profitLossSummary,
    loading,
    error,
    currentQuery,
  } = useAppSelector((state) => state.reports);

  const loadOverview = useCallback(async () => {
    return await dispatch(fetchReportsOverview()).unwrap();
  }, [dispatch]);

  const loadSalesReports = useCallback(
    async (query?: ReportQuery) => {
      return await dispatch(fetchSalesReports(query ?? currentQuery)).unwrap();
    },
    [dispatch, currentQuery],
  );

  const loadInventoryReports = useCallback(
    async (query?: ReportQuery) => {
      return await dispatch(fetchInventoryReports(query ?? currentQuery)).unwrap();
    },
    [dispatch, currentQuery],
  );

  const loadFinancialReports = useCallback(
    async (query?: ReportQuery) => {
      return await dispatch(fetchFinancialReports(query ?? currentQuery)).unwrap();
    },
    [dispatch, currentQuery],
  );

  const loadProfitLossReports = useCallback(
    async (query?: ReportQuery) => {
      return await dispatch(fetchProfitLossReports(query ?? currentQuery)).unwrap();
    },
    [dispatch, currentQuery],
  );

  const updateQuery = useCallback(
    (query: Partial<ReportQuery>) => {
      dispatch(setReportQuery(query));
    },
    [dispatch],
  );

  const clearError = useCallback(() => {
    dispatch(clearReportError());
  }, [dispatch]);

  const resetQuery = useCallback(() => {
    dispatch(resetReportQuery());
  }, [dispatch]);

  return {
    overviewRows,
    overviewSummary,

    salesRows,
    salesSummary,

    inventoryRows,
    inventorySummary,

    financialRows,
    financialSummary,

    profitLossRows,
    profitLossSummary,

    loading,
    error,
    currentQuery,

    loadOverview,
    loadSalesReports,
    loadInventoryReports,
    loadFinancialReports,
    loadProfitLossReports,

    updateQuery,
    resetQuery,
    clearError,
  };
}