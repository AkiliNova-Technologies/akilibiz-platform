"use client";

import { useCallback, useMemo, useState } from "react";

export interface Permission { code: string; label: string; module: string; description?: string; }
export interface StaffAccessRole { id: number; role_name: string; description?: string | null; users_count: number; access_scope: string; permissions: string[]; status: "Active" | "Inactive"; is_system: boolean; }
export interface CreateRolePayload { role_name: string; description?: string | null; is_active: boolean; }

export const staffPermissions: Permission[] = [
  { code: "sales.view", label: "View sales", module: "sales", description: "Review sales and receipts." }, { code: "sales.create", label: "Create sales", module: "sales", description: "Record new sales." }, { code: "inventory.view", label: "View inventory", module: "inventory", description: "Review stock levels." }, { code: "inventory.adjust", label: "Adjust inventory", module: "inventory", description: "Record stock adjustments." }, { code: "finance.view", label: "View finance", module: "finance", description: "Review financial records." }, { code: "finance.manage", label: "Manage finance", module: "finance", description: "Record finance entries." }, { code: "staff.view", label: "View staff", module: "staff", description: "Review staff profiles." }, { code: "staff.manage", label: "Manage staff", module: "staff", description: "Manage staff roles and access." }];
const allCodes = staffPermissions.map((permission) => permission.code);
const seed: StaffAccessRole[] = [{ id: 1, role_name: "Admin", description: "Full business access", users_count: 1, access_scope: "All modules", permissions: allCodes, status: "Active", is_system: true }, { id: 2, role_name: "Manager", description: "Operational management access", users_count: 0, access_scope: "Operations", permissions: ["sales.view", "sales.create", "inventory.view", "inventory.adjust", "finance.view", "staff.view"], status: "Active", is_system: true }, { id: 3, role_name: "Cashier", description: "Point-of-sale access", users_count: 1, access_scope: "Sales", permissions: ["sales.view", "sales.create", "inventory.view"], status: "Active", is_system: true }];

export function useStaffRolesData() {
  const [roles, setRoles] = useState<StaffAccessRole[]>(seed);
  const summary = useMemo(() => ({ total_roles: roles.length, active_roles: roles.filter((role) => role.status === "Active").length, total_assigned_users: roles.reduce((total, role) => total + role.users_count, 0), average_permissions: roles.length ? Math.round(roles.reduce((total, role) => total + role.permissions.length, 0) / roles.length) : 0 }), [roles]);
  const getRole = useCallback(async (id: number) => roles.find((role) => role.id === id) ?? null, [roles]);
  const createRole = useCallback(async (payload: CreateRolePayload) => { if (roles.some((role) => role.role_name.toLowerCase() === payload.role_name.toLowerCase())) return null; const role: StaffAccessRole = { id: Date.now(), role_name: payload.role_name, description: payload.description ?? null, users_count: 0, access_scope: "Custom", permissions: [], status: payload.is_active ? "Active" : "Inactive", is_system: false }; setRoles((items) => [role, ...items]); return role; }, [roles]);
  const updatePermissions = useCallback(async (id: number, permission_codes: string[]) => { let updated: StaffAccessRole | null = null; setRoles((items) => items.map((role) => { if (role.id !== id) return role; updated = { ...role, permissions: permission_codes }; return updated; })); return updated; }, []);
  const deleteRole = useCallback(async (id: number) => { const role = roles.find((item) => item.id === id); if (!role || role.is_system) return false; setRoles((items) => items.filter((item) => item.id !== id)); return true; }, [roles]);
  return { roles, permissions: staffPermissions, summary, loading: false, getRole, createRole, updatePermissions, deleteRole, refreshRolesPermissions: async () => roles };
}
