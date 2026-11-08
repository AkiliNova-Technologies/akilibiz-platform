import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchTaxClassifications,
  fetchTaxRates,
  fetchTaxSettings,
  updateTaxSettings,
  calculateTax,
  clearTaxError,
  clearCalculationResult,
  selectTaxClassifications,
  selectTaxRates,
  selectTaxSettings,
  selectTaxCalculationResult,
  selectTaxLoading,
  selectTaxError,
} from "@/redux/slices/taxSlice";
import type {
  UpdateTaxSettingsPayload,
  CalculateTaxPayload,
} from "@/services/tauri/tax";
import type { AppDispatch } from "@/redux/store";

export function useReduxTax() {
  const dispatch = useDispatch<AppDispatch>();

  const classifications = useSelector(selectTaxClassifications);
  const rates = useSelector(selectTaxRates);
  const settings = useSelector(selectTaxSettings);
  const calculationResult = useSelector(selectTaxCalculationResult);
  const loading = useSelector(selectTaxLoading);
  const error = useSelector(selectTaxError);

  const getTaxClassifications = useCallback(() => {
    return dispatch(fetchTaxClassifications());
  }, [dispatch]);

  const getTaxRates = useCallback(() => {
    return dispatch(fetchTaxRates());
  }, [dispatch]);

  const getTaxSettings = useCallback(() => {
    return dispatch(fetchTaxSettings());
  }, [dispatch]);

  const saveTaxSettings = useCallback(
    (payload: UpdateTaxSettingsPayload) => {
      return dispatch(updateTaxSettings(payload));
    },
    [dispatch],
  );

  const calculateTaxAmount = useCallback(
    (payload: CalculateTaxPayload) => {
      return dispatch(calculateTax(payload));
    },
    [dispatch],
  );

  const clearError = useCallback(() => {
    dispatch(clearTaxError());
  }, [dispatch]);

  const clearCalculation = useCallback(() => {
    dispatch(clearCalculationResult());
  }, [dispatch]);

  return {
    classifications,
    rates,
    settings,
    calculationResult,
    loading,
    error,
    getTaxClassifications,
    getTaxRates,
    getTaxSettings,
    saveTaxSettings,
    calculateTaxAmount,
    clearError,
    clearCalculation,
  };
}