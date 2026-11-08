import { useCallback } from "react";
import { getErrorMessage } from "@/utils/error-message";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchRoles,
  fetchRoleById,
  fetchPermissions,
  createRole,
  deleteRoleThunk,
  saveRolePermissions,
  fetchRoleSummary,
  selectRoles,
  selectSelectedRole,
  selectPermissions,
  selectRoleSummary,
  selectRolesPermissionsLoading,
  selectRolesPermissionsError,
  clearSelectedRole,
  clearRolesPermissionsError,
} from "@/redux/slices/rolesPermissionsSlice";
import type {
  RoleQuery,
  CreateRolePayload,
  UpdateRolePermissionsPayload,
} from "@/services/tauri/roles-permissions";

export const useReduxRolesPermissions = () => {
  const dispatch = useAppDispatch();

  const roles = useAppSelector(selectRoles);
  const selectedRole = useAppSelector(selectSelectedRole);
  const permissions = useAppSelector(selectPermissions);
  const summary = useAppSelector(selectRoleSummary);
  const loading = useAppSelector(selectRolesPermissionsLoading);
  const error = useAppSelector(selectRolesPermissionsError);

  const getRoles = useCallback(
    async (params?: RoleQuery) => {
      try {
        return await dispatch(fetchRoles(params)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load roles"));
        throw err;
      }
    },
    [dispatch],
  );

  const getRole = useCallback(
    async (roleId: number) => {
      try {
        return await dispatch(fetchRoleById(roleId)).unwrap();
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to load role"));
        throw err;
      }
    },
    [dispatch],
  );

  const getPermissions = useCallback(async () => {
    try {
      return await dispatch(fetchPermissions()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load permissions"));
      throw err;
    }
  }, [dispatch]);

  const handleCreateRole = useCallback(
    async (payload: CreateRolePayload) => {
      try {
        const result = await dispatch(createRole(payload)).unwrap();
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to create role"));
        return null;
      }
    },
    [dispatch],
  );

  const handleDeleteRole = useCallback(
    async (roleId: number) => {
      try {
        await dispatch(deleteRoleThunk(roleId)).unwrap();
        return true;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to delete role"));
        throw err;
      }
    },
    [dispatch],
  );

  const updatePermissions = useCallback(
    async (roleId: number, payload: UpdateRolePermissionsPayload) => {
      try {
        const result = await dispatch(
          saveRolePermissions({ roleId, payload }),
        ).unwrap();
        toast.success("Permissions updated successfully");
        return result;
      } catch (err) {
        toast.error(getErrorMessage(err, "Failed to update permissions"));
        return null;
      }
    },
    [dispatch],
  );

  const getSummary = useCallback(async () => {
    try {
      return await dispatch(fetchRoleSummary()).unwrap();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to load role summary"));
      throw err;
    }
  }, [dispatch]);

  const refreshRolesPermissions = useCallback(async (params?: RoleQuery) => {
    return await Promise.all([
      dispatch(fetchRoles(params)).unwrap(),
      dispatch(fetchPermissions()).unwrap(),
      dispatch(fetchRoleSummary()).unwrap(),
    ]);
  }, [dispatch]);

  const clearRole = useCallback(() => {
    dispatch(clearSelectedRole());
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearRolesPermissionsError());
  }, [dispatch]);

  return {
    roles,
    selectedRole,
    permissions,
    summary,
    loading,
    error,
    getRoles,
    getRole,
    getPermissions,
    createRole: handleCreateRole,
    deleteRole: handleDeleteRole,
    updatePermissions,
    getSummary,
    refreshRolesPermissions,
    clearRole,
    clearError,
  };
};
