import { invoke } from "@tauri-apps/api/core";

export interface CurrentUser {
  user_id: number;
  staff_id: number;
  username: string;
  email: string | null;
  full_name: string;
  role_id: number;
  role_name: string;
  permissions: string[];
}

export interface LoginPayload {
  username: string;
  password: string;
}

export const tauriAuthService = {
  async login(payload: LoginPayload): Promise<CurrentUser> {
    return await invoke<CurrentUser>("login", { payload });
  },

  async logout(): Promise<void> {
    return await invoke("logout");
  },

  async getCurrentUser(): Promise<CurrentUser> {
    return await invoke<CurrentUser>("get_current_user");
  },
};
