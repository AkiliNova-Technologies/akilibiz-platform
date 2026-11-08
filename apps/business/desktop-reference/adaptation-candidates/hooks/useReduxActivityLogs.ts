import { useCallback } from "react";
import { getErrorMessage } from "@/utils/error-message";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchActivityLogs,
  fetchActivityLogById,
  fetchActivityLogSummary,
  selectActivityLogs,
  selectSelectedActivityLog,
  selectActivityLogSummary,
  selectActivityLogsLoading,
  selectActivityLogsError,
  clearSelectedActivityLog,
  clearActivityLogsError,
} from "@/redux/slices/activityLogsSlice";
import type { ActivityLogQuery } from "@/services/tauri/activity-logs";

export const useReduxActivityLogs = () => {
  const dispatch = useAppDispatch();

  const logs = useAppSelector(selectActivityLogs);
  const selectedLog = useAppSelector(selectSelectedActivityLog);
  const summary = useAppSelector(selectActivityLogSummary);
  const loading = useAppSelector(selectActivityLogsLoading);
  const error = useAppSelector(selectActivityLogsError);

  const getLogs = useCallback(
    async (params?: ActivityLogQuery) => {
      try {
        return await dispatch(fetchActivityLogs(params)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load activity logs"));
        throw err;
      }
    },
    [dispatch],
  );

  const getLog = useCallback(
    async (logId: number) => {
      try {
        return await dispatch(fetchActivityLogById(logId)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load activity log"));
        throw err;
      }
    },
    [dispatch],
  );

  const getSummary = useCallback(async () => {
    try {
      return await dispatch(fetchActivityLogSummary()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load activity log summary"));
      throw err;
    }
  }, [dispatch]);

  const refreshLogs = useCallback(async (params?: ActivityLogQuery) => {
    return await Promise.all([
      dispatch(fetchActivityLogs(params)).unwrap(),
      dispatch(fetchActivityLogSummary()).unwrap(),
    ]);
  }, [dispatch]);

  const clearLog = useCallback(() => {
    dispatch(clearSelectedActivityLog());
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearActivityLogsError());
  }, [dispatch]);

  return {
    logs,
    selectedLog,
    summary,
    loading,
    error,
    getLogs,
    getLog,
    getSummary,
    refreshLogs,
    clearLog,
    clearError,
  };
};
