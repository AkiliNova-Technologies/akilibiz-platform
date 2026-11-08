import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { getErrorMessage } from "@/utils/error-message";
import {
  fetchStaff,
  fetchStaffById,
  createStaff,
  updateStaff,
  fetchStaffRoles,
  selectStaff,
  selectSelectedStaff,
  selectStaffRoles,
  selectStaffLoading,
  selectStaffError,
  clearError as clearStaffError,
} from "@/redux/slices/staffSlice";
import { useCallback } from "react";
import { toast } from "sonner";
import type {
  CreateStaffPayload,
  UpdateStaffPayload,
} from "@/services/tauri/staff";

export const useReduxStaff = () => {
  const dispatch = useAppDispatch();
  const staff = useAppSelector(selectStaff);
  const selectedStaff = useAppSelector(selectSelectedStaff);
  const roles = useAppSelector(selectStaffRoles);
  const loading = useAppSelector(selectStaffLoading);
  const error = useAppSelector(selectStaffError);

  const getStaff = useCallback(async () => {
    try {
      await dispatch(fetchStaff()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load staff"));
    }
  }, [dispatch]);

  const getStaffMember = useCallback(
    async (id: number) => {
      try {
        await dispatch(fetchStaffById(id)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load staff member"));
      }
    },
    [dispatch],
  );

  const getStaffRoles = useCallback(async () => {
    try {
      await dispatch(fetchStaffRoles()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load staff roles"));
    }
  }, [dispatch]);

  const addStaff = useCallback(
    async (staffData: CreateStaffPayload) => {
      try {
        const result = await dispatch(createStaff(staffData)).unwrap();
        toast.success("Staff member added successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to add staff member"));
        throw err;
      }
    },
    [dispatch],
  );

  const editStaff = useCallback(
    async (id: number, payload: UpdateStaffPayload) => {
      try {
        const result = await dispatch(updateStaff({ id, payload })).unwrap();
        toast.success("Staff member updated successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to update staff member"));
        throw err;
      }
    },
    [dispatch],
  );

  const clearError = useCallback(() => {
    dispatch(clearStaffError());
  }, [dispatch]);

  return {
    staff,
    selectedStaff,
    roles,
    loading,
    error,
    getStaff,
    getStaffMember,
    getStaffRoles,
    addStaff,
    editStaff,
    clearError,
  };
};
