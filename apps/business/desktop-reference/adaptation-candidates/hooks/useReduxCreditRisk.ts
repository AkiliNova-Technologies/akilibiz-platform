import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import {
  fetchCustomerRisk,
  fetchCustomerCreditEvents,
  setSelectedCustomer,
  clearError,
} from "../redux/slices/creditRiskSlice";
import type { RiskScore } from "../services/tauri/credit-risk";

export function useReduxCreditRisk() {
  const dispatch = useAppDispatch();
  const { scores, events, loading, error, selectedCustomerId } =
    useAppSelector((state) => state.creditRisk);

  const getCustomerRisk = useCallback(
    (customerId: number) => {
      dispatch(fetchCustomerRisk(customerId));
    },
    [dispatch]
  );

  const getCustomerEvents = useCallback(
    (customerId: number, limit?: number, offset?: number) => {
      dispatch(fetchCustomerCreditEvents({ customerId, limit, offset }));
    },
    [dispatch]
  );

  const selectCustomer = useCallback(
    (customerId: number | null) => {
      dispatch(setSelectedCustomer(customerId));
    },
    [dispatch]
  );

  const clearCreditRiskError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const getCachedRiskScore = useCallback(
    (customerId: number): RiskScore | undefined => {
      return scores[customerId];
    },
    [scores]
  );

  return {
    scores,
    events,
    loading,
    error,
    selectedCustomerId,
    getCustomerRisk,
    getCustomerEvents,
    selectCustomer,
    clearCreditRiskError,
    getCachedRiskScore,
  };
}