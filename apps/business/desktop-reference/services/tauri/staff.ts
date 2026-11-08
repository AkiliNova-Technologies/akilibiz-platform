import { invoke } from "@tauri-apps/api/core";

export interface StaffMember {
  id: number;
  user_id: number;
  username: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  role_id: number;
  role_name: string;
  job_title: string | null;
  branch_name: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffPayload {
  username: string;
  email?: string | null;
  password: string;
  full_name: string;
  phone?: string | null;
  role_id: number;
  job_title?: string | null;
  branch_name?: string | null;
  notes?: string | null;
}

export interface UpdateStaffPayload {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role_id?: number;
  job_title?: string | null;
  branch_name?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface StaffRole {
  id: number;
  name: string;
  description?: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export const tauriStaffService = {
  async getStaff(): Promise<StaffMember[]> {
    return await invoke<StaffMember[]>("get_staff");
  },

  async getStaffMember(staffId: number): Promise<StaffMember> {
    return await invoke<StaffMember>("get_staff_member", { staffId });
  },

  async createStaff(payload: CreateStaffPayload): Promise<StaffMember> {
    return await invoke<StaffMember>("create_staff", { payload });
  },

  async updateStaff(
    staffId: number,
    payload: UpdateStaffPayload,
  ): Promise<StaffMember> {
    return await invoke<StaffMember>("update_staff", { staffId, payload });
  },

  async getStaffRoles(): Promise<StaffRole[]> {
    return await invoke<StaffRole[]>("get_staff_roles");
  },
};