import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { getErrorMessage } from "@/utils/error-message";
import {
  fetchCustomers,
  fetchCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addLoyaltyPoints,
  fetchPurchaseHistory,
  fetchCustomerCreditAccounts,
  fetchCustomerSummary,
  selectCustomers,
  selectSelectedCustomer,
  selectPurchaseHistory,
  selectCustomerCreditAccounts,
  selectCustomerSummary,
  selectCustomersLoading,
  selectCustomersError,
  clearError as clearCustomersError,
} from "@/redux/slices/customersSlice";
import { useCallback } from "react";
import { toast } from "sonner";
import type {
  AddLoyaltyPointsPayload,
  CreateCustomerPayload,
  CustomerQuery,
  UpdateCustomerPayload,
} from "@/services/tauri/customers";

export const useReduxCustomers = () => {
  const dispatch = useAppDispatch();

  const customers = useAppSelector(selectCustomers);
  const selectedCustomer = useAppSelector(selectSelectedCustomer);
  const purchaseHistory = useAppSelector(selectPurchaseHistory);
  const creditAccounts = useAppSelector(selectCustomerCreditAccounts);
  const summary = useAppSelector(selectCustomerSummary);
  const loading = useAppSelector(selectCustomersLoading);
  const error = useAppSelector(selectCustomersError);

  const getCustomers = useCallback(
    async (params?: CustomerQuery) => {
      try {
        return await dispatch(fetchCustomers(params)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load customers"));
        throw err;
      }
    },
    [dispatch],
  );

  const getCustomer = useCallback(
    async (id: number) => {
      try {
        return await dispatch(fetchCustomerById(id)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load customer"));
        throw err;
      }
    },
    [dispatch],
  );

  const addCustomer = useCallback(
    async (payload: CreateCustomerPayload) => {
      try {
        const result = await dispatch(createCustomer(payload)).unwrap();
        toast.success("Customer added successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to add customer"));
        return null;
      }
    },
    [dispatch],
  );

  const editCustomer = useCallback(
    async (id: number, payload: UpdateCustomerPayload) => {
      try {
        const result = await dispatch(updateCustomer({ id, payload })).unwrap();
        toast.success("Customer updated successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to update customer"));
        return null;
      }
    },
    [dispatch],
  );

  const removeCustomer = useCallback(
    async (id: number) => {
      try {
        const result = await dispatch(deleteCustomer(id)).unwrap();
        toast.success("Customer deactivated successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to deactivate customer"));
        return null;
      }
    },
    [dispatch],
  );

  const addPoints = useCallback(
    async (id: number, payload: AddLoyaltyPointsPayload) => {
      try {
        const result = await dispatch(addLoyaltyPoints({ id, payload })).unwrap();
        toast.success(`Added ${payload.points} loyalty points`);
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to add loyalty points"));
        return null;
      }
    },
    [dispatch],
  );

  const getPurchaseHistory = useCallback(
    async (id: number) => {
      try {
        return await dispatch(fetchPurchaseHistory(id)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load purchase history"));
        throw err;
      }
    },
    [dispatch],
  );

  const getCreditAccounts = useCallback(async () => {
    try {
      return await dispatch(fetchCustomerCreditAccounts()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load credit accounts"));
      throw err;
    }
  }, [dispatch]);

  const getCustomerSummary = useCallback(async () => {
    try {
      return await dispatch(fetchCustomerSummary()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load customer summary"));
      throw err;
    }
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearCustomersError());
  }, [dispatch]);

  return {
    customers,
    selectedCustomer,
    purchaseHistory,
    creditAccounts,
    summary,
    loading,
    error,
    getCustomers,
    getCustomer,
    addCustomer,
    editCustomer,
    removeCustomer,
    addPoints,
    getPurchaseHistory,
    getCreditAccounts,
    getCustomerSummary,
    clearError,
  };
};
