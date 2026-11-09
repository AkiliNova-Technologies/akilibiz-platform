"use client";

import { useCallback, useState } from "react";

export interface Permission { code: string; label: string; module: string; description?: string; }
export interface StaffAccessRole { id: number; role_name: string; description?: string | null; users_count: number; access_scope: string; permissions: string[]; status: "Active" | "Inactive"; is_system: boolean; }
export interface CreateRolePayload { role_name: string; description?: string | null; is_active: boolean; }

export const staffPermissions: Permission[] = [
  { code: "sales.view", label: "View sales", module: "sales", description: "Review sales and receipts." }, { code: "sales.create", label: "Create sales", module: "sales", description: "Record new sales." }, { code: "inventory.view", label: "View inventory", module: "inventory", description: "Review stock levels." }, { code: "inventory.adjust", label: "Adjust inventory", module: "inventory", description: "Record stock adjustments." }, { code: "finance.view", label: "View finance", module: "finance", description: "Review financial records." }, { code: "finance.manage", label: "Manage finance", module: "finance", description: "Record finance entries." }, { code: "staff.view", label: "View staff", module: "staff", description: "Review staff profiles." }, { code: "staff.manage", label: "Manage staff", module: "staff", description: "Manage staff roles and access." }];

export function useStaffRolesData() {
  // The hosted permission-role registry has not been connected.
  const [roles] = useState<StaffAccessRole[]>([]);
  const [summary] = useState<{
    total_roles: number; active_roles: number; total_assigned_users: number;
    average_permissions: number;
  } | null>(null);
  const unavailable = (): never => {
    throw new Error("Role changes are unavailable until hosted permission management is connected.");
  };
  const getRole = useCallback(async (id: number) => roles.find((role) => role.id === id) ?? null, [roles]);
  const createRole = useCallback(async (_payload: CreateRolePayload): Promise<never> => unavailable(), []);
  const updatePermissions = useCallback(async (_id: number, _codes: string[]): Promise<never> => unavailable(), []);
  const deleteRole = useCallback(async (_id: number): Promise<never> => unavailable(), []);
  const refreshRolesPermissions = useCallback(async () => roles, [roles]);
  return { roles, permissions: staffPermissions, summary, loading: false, getRole,
    createRole, updatePermissions, deleteRole, refreshRolesPermissions };
}
