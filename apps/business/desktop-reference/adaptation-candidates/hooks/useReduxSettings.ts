import { useCallback } from "react";
import { getErrorMessage } from "@/utils/error-message";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchBusinessProfile,
  updateBusinessProfile,
  fetchReceiptSettings,
  updateReceiptSettings,
  fetchTaxConfig,
  updateTaxConfig,
  selectBusinessProfile,
  selectReceiptSettings,
  selectTaxConfig,
  selectSettingsLoading,
  selectSettingsError,
  clearSettingsError,
  selectBackupRecords,
  createBackup,
  fetchBackupRecords,
  verifyBackup,
} from "@/redux/slices/settingsSlice";
import type {
  CreateBackupPayload,
  BackupVerification,
  UpdateBusinessProfilePayload,
  UpdateReceiptSettingsPayload,
  UpdateTaxConfigPayload,
} from "@/services/tauri/settings";

export const useReduxSettings = () => {
  const dispatch = useAppDispatch();

  const businessProfile = useAppSelector(selectBusinessProfile);
  const receiptSettings = useAppSelector(selectReceiptSettings);
  const taxConfig = useAppSelector(selectTaxConfig);
  const loading = useAppSelector(selectSettingsLoading);
  const error = useAppSelector(selectSettingsError);
  const backupRecords = useAppSelector(selectBackupRecords);

  const getBusinessProfile = useCallback(async () => {
    try {
      return await dispatch(fetchBusinessProfile()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load business profile"));
      throw err;
    }
  }, [dispatch]);

  const saveBusinessProfile = useCallback(
    async (payload: UpdateBusinessProfilePayload) => {
      try {
        const result = await dispatch(updateBusinessProfile(payload)).unwrap();
        toast.success("Business profile updated successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to update business profile"));
        throw err;
      }
    },
    [dispatch],
  );

  const getReceiptSettings = useCallback(async () => {
    try {
      return await dispatch(fetchReceiptSettings()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load receipt settings"));
      throw err;
    }
  }, [dispatch]);

  const saveReceiptSettings = useCallback(
    async (payload: UpdateReceiptSettingsPayload) => {
      try {
        const result = await dispatch(updateReceiptSettings(payload)).unwrap();
        toast.success("Receipt settings updated successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to update receipt settings"));
        throw err;
      }
    },
    [dispatch],
  );

  const getTaxConfig = useCallback(async () => {
    try {
      return await dispatch(fetchTaxConfig()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load tax configuration"));
      throw err;
    }
  }, [dispatch]);

  const saveTaxConfig = useCallback(
    async (payload: UpdateTaxConfigPayload) => {
      try {
        const result = await dispatch(updateTaxConfig(payload)).unwrap();
        toast.success("Tax configuration updated successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to update tax configuration"));
        throw err;
      }
    },
    [dispatch],
  );

  const clearError = useCallback(() => {
    dispatch(clearSettingsError());
  }, [dispatch]);

  const getBackupRecords = useCallback(async () => {
    try {
      return await dispatch(fetchBackupRecords()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load backup records"));
      throw err;
    }
  }, [dispatch]);

  const saveBackup = useCallback(
    async (payload: CreateBackupPayload) => {
      try {
        const result = await dispatch(createBackup(payload)).unwrap();
        toast.success("Backup created successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to create backup"));
        throw err;
      }
    },
    [dispatch],
  );

  const checkBackup = useCallback(
    async (sourcePath: string): Promise<BackupVerification> => {
      try {
        const result = await dispatch(verifyBackup(sourcePath)).unwrap();
        toast.success("Backup integrity verified");
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to verify backup";
        toast.error(message);
        throw err;
      }
    },
    [dispatch],
  );

  return {
    businessProfile,
    receiptSettings,
    taxConfig,
    loading,
    error,
    getBusinessProfile,
    saveBusinessProfile,
    getReceiptSettings,
    saveReceiptSettings,
    getTaxConfig,
    saveTaxConfig,
    clearError,
    backupRecords,
    getBackupRecords,
    saveBackup,
    checkBackup,
  };
};
