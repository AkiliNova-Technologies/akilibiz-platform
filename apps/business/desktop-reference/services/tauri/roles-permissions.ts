import { invoke } from "@tauri-apps/api/core";

export interface RoleQuery {
  skip?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}

export interface Permission {
  id: number;
  code: string;
  label: string;
  module: string;
  description?: string | null;
}

export interface RoleResponse {
  id: number;
  role_name: string;
  description?: string | null;
  users_count: number;
  access_scope: string;
  permissions_count: number;
  status: "Active" | "Inactive";
  permissions: string[];
  created_at: string;
  updated_at: string;
}

export interface RoleDetailResponse {
  id: number;
  role_name: string;
  description?: string | null;
  users_count: number;
  access_scope: string;
  permissions_count: number;
  status: "Active" | "Inactive";
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

export interface CreateRolePayload {
  role_name: string;
  description?: string | null;
  is_active?: boolean;
}

export interface UpdateRolePayload {
  role_name?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface UpdateRolePermissionsPayload {
  permission_codes: string[];
}

export interface RoleSummary {
  total_roles: number;
  active_roles: number;
  total_assigned_users: number;
  average_permissions: number;
}

function normalizeQuery(query: RoleQuery = {}): RoleQuery {
  return {
    skip: query.skip ?? 0,
    limit: query.limit ?? 100,
    search: query.search?.trim() || undefined,
    is_active: query.is_active,
  };
}

export const tauriRolesPermissionsService = {
  async getRoles(query: RoleQuery = {}): Promise<RoleResponse[]> {
    return await invoke<RoleResponse[]>("get_roles", {
      params: normalizeQuery(query),
    });
  },

  async getRole(roleId: number): Promise<RoleDetailResponse> {
    return await invoke<RoleDetailResponse>("get_role", { roleId });
  },

  async getPermissions(): Promise<Permission[]> {
    return await invoke<Permission[]>("get_permissions");
  },

  async createRole(payload: CreateRolePayload): Promise<RoleDetailResponse> {
    return await invoke<RoleDetailResponse>("create_role", { payload });
  },

  async updateRole(roleId: number, payload: UpdateRolePayload): Promise<RoleDetailResponse> {
    return await invoke<RoleDetailResponse>("update_role", { roleId, payload });
  },

  async deleteRole(roleId: number): Promise<void> {
    return await invoke<void>("delete_role", { roleId });
  },

  async updateRolePermissions(
    roleId: number,
    payload: UpdateRolePermissionsPayload,
  ): Promise<RoleDetailResponse> {
    return await invoke<RoleDetailResponse>("update_role_permissions", {
      roleId,
      payload,
    });
  },

  async getRoleSummary(): Promise<RoleSummary> {
    return await invoke<RoleSummary>("get_role_summary");
  },
};