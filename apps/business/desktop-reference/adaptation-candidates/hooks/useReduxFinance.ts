import { useCallback } from "react";
import { getErrorMessage } from "@/utils/error-message";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  createExpenseEntry,
  createIncomeEntry,
  fetchCashFlowEntries,
  fetchCashFlowSummary,
  fetchExpenseCategories,
  fetchExpenseEntries,
  fetchExpenseSummary,
  fetchFinanceOverviewSummary,
  fetchFinanceOverviewTransactions,
  fetchIncomeCategories,
  fetchIncomeEntries,
  fetchIncomeSummary,
  fetchLedgerEntries,
  fetchLedgerSummary,
  selectCashFlowEntries,
  selectCashFlowSummary,
  selectExpenseCategories,
  selectExpenseEntries,
  selectExpenseSummary,
  selectFinanceError,
  selectFinanceLoading,
  selectFinanceOverviewSummary,
  selectFinanceOverviewTransactions,
  selectIncomeCategories,
  selectIncomeEntries,
  selectIncomeSummary,
  selectLedgerEntries,
  selectLedgerSummary,
  clearFinanceError,
} from "@/redux/slices/financeSlice";
import type {
  CreateExpensePayload,
  CreateIncomePayload,
  FinanceTransactionQuery,
} from "@/services/tauri/finance";

export const useReduxFinance = () => {
  const dispatch = useAppDispatch();

  const overviewSummary = useAppSelector(selectFinanceOverviewSummary);
  const overviewTransactions = useAppSelector(
    selectFinanceOverviewTransactions,
  );

  const incomeEntries = useAppSelector(selectIncomeEntries);
  const incomeSummary = useAppSelector(selectIncomeSummary);
  const incomeCategories = useAppSelector(selectIncomeCategories);

  const expenseEntries = useAppSelector(selectExpenseEntries);
  const expenseSummary = useAppSelector(selectExpenseSummary);
  const expenseCategories = useAppSelector(selectExpenseCategories);

  const cashFlowEntries = useAppSelector(selectCashFlowEntries);
  const cashFlowSummary = useAppSelector(selectCashFlowSummary);

  const ledgerEntries = useAppSelector(selectLedgerEntries);
  const ledgerSummary = useAppSelector(selectLedgerSummary);

  const loading = useAppSelector(selectFinanceLoading);
  const error = useAppSelector(selectFinanceError);

  const getOverviewSummary = useCallback(async () => {
    try {
      return await dispatch(fetchFinanceOverviewSummary()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load finance overview summary"));
      throw err;
    }
  }, [dispatch]);

  const getOverviewTransactions = useCallback(
    async (params?: FinanceTransactionQuery) => {
      try {
        return await dispatch(fetchFinanceOverviewTransactions(params)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load finance overview transactions"));
        throw err;
      }
    },
    [dispatch],
  );

  const getIncomeEntries = useCallback(
    async (params?: FinanceTransactionQuery) => {
      try {
        return await dispatch(fetchIncomeEntries(params)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load income entries"));
        throw err;
      }
    },
    [dispatch],
  );

  const getIncomeSummary = useCallback(async () => {
    try {
      return await dispatch(fetchIncomeSummary()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load income summary"));
      throw err;
    }
  }, [dispatch]);

  const getIncomeCategories = useCallback(async () => {
    try {
      return await dispatch(fetchIncomeCategories()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load income categories"));
      throw err;
    }
  }, [dispatch]);

  const addIncomeEntry = useCallback(
    async (payload: CreateIncomePayload) => {
      try {
        const result = await dispatch(createIncomeEntry(payload)).unwrap();
        toast.success("Income recorded successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to record income"));
        return null;
      }
    },
    [dispatch],
  );

  const getExpenseEntries = useCallback(
    async (params?: FinanceTransactionQuery) => {
      try {
        return await dispatch(fetchExpenseEntries(params)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load expense entries"));
        throw err;
      }
    },
    [dispatch],
  );

  const getExpenseSummary = useCallback(async () => {
    try {
      return await dispatch(fetchExpenseSummary()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load expense summary"));
      throw err;
    }
  }, [dispatch]);

  const getExpenseCategories = useCallback(async () => {
    try {
      return await dispatch(fetchExpenseCategories()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load expense categories"));
      throw err;
    }
  }, [dispatch]);

  const addExpenseEntry = useCallback(
    async (payload: CreateExpensePayload) => {
      try {
        const result = await dispatch(createExpenseEntry(payload)).unwrap();
        toast.success("Expense recorded successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to record expense"));
        return null;
      }
    },
    [dispatch],
  );

  const getCashFlowEntries = useCallback(
    async (params?: FinanceTransactionQuery) => {
      try {
        return await dispatch(fetchCashFlowEntries(params)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load cash flow"));
        throw err;
      }
    },
    [dispatch],
  );

  const getCashFlowSummary = useCallback(async () => {
    try {
      return await dispatch(fetchCashFlowSummary()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load cash flow summary"));
      throw err;
    }
  }, [dispatch]);

  const getLedgerEntries = useCallback(
    async (params?: FinanceTransactionQuery) => {
      try {
        return await dispatch(fetchLedgerEntries(params)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load ledger entries"));
        throw err;
      }
    },
    [dispatch],
  );

  const getLedgerSummary = useCallback(async () => {
    try {
      return await dispatch(fetchLedgerSummary()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load ledger summary"));
      throw err;
    }
  }, [dispatch]);

  const refreshOverview = useCallback(
    async (params?: FinanceTransactionQuery) => {
      return await Promise.all([
        dispatch(fetchFinanceOverviewSummary()).unwrap(),
        dispatch(fetchFinanceOverviewTransactions(params)).unwrap(),
      ]);
    },
    [dispatch],
  );

  const refreshIncome = useCallback(
    async (params?: FinanceTransactionQuery) => {
      return await Promise.all([
        dispatch(fetchIncomeEntries(params)).unwrap(),
        dispatch(fetchIncomeSummary()).unwrap(),
        dispatch(fetchIncomeCategories()).unwrap(),
      ]);
    },
    [dispatch],
  );

  const refreshExpenses = useCallback(
    async (params?: FinanceTransactionQuery) => {
      return await Promise.all([
        dispatch(fetchExpenseEntries(params)).unwrap(),
        dispatch(fetchExpenseSummary()).unwrap(),
        dispatch(fetchExpenseCategories()).unwrap(),
      ]);
    },
    [dispatch],
  );

  const refreshCashFlow = useCallback(
    async (params?: FinanceTransactionQuery) => {
      return await Promise.all([
        dispatch(fetchCashFlowEntries(params)).unwrap(),
        dispatch(fetchCashFlowSummary()).unwrap(),
      ]);
    },
    [dispatch],
  );

  const refreshLedger = useCallback(
    async (params?: FinanceTransactionQuery) => {
      return await Promise.all([
        dispatch(fetchLedgerEntries(params)).unwrap(),
        dispatch(fetchLedgerSummary()).unwrap(),
      ]);
    },
    [dispatch],
  );

  const clearError = useCallback(() => {
    dispatch(clearFinanceError());
  }, [dispatch]);

  return {
    overviewSummary,
    overviewTransactions,

    incomeEntries,
    incomeSummary,
    incomeCategories,

    expenseEntries,
    expenseSummary,
    expenseCategories,

    cashFlowEntries,
    cashFlowSummary,

    ledgerEntries,
    ledgerSummary,

    loading,
    error,

    getOverviewSummary,
    getOverviewTransactions,

    getIncomeEntries,
    getIncomeSummary,
    getIncomeCategories,
    addIncomeEntry,

    getExpenseEntries,
    getExpenseSummary,
    getExpenseCategories,
    addExpenseEntry,

    getCashFlowEntries,
    getCashFlowSummary,

    getLedgerEntries,
    getLedgerSummary,

    refreshOverview,
    refreshIncome,
    refreshExpenses,
    refreshCashFlow,
    refreshLedger,

    clearError,
  };
};
