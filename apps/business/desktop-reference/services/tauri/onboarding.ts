import { invoke } from "@tauri-apps/api/core";

export interface OnboardingStatus {
  show_onboarding: boolean;
  current_step: number;
  completed: boolean;
}

export interface CreateSuperUserPayload {
  username: string;
  password: string;
  email?: string | null;
  full_name: string;
}

export interface SetupBusinessProfilePayload {
  business_name: string;
  trading_name?: string | null;
  owner_name?: string | null;
  email?: string | null;
  phone?: string | null;
  tin?: string | null;
  registration_number?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  currency: string;
  timezone: string;
}

export const tauriOnboardingService = {
  async getOnboardingStatus(): Promise<OnboardingStatus> {
    return await invoke<OnboardingStatus>("get_onboarding_status");
  },

  async createSuperUser(payload: CreateSuperUserPayload): Promise<number> {
    return await invoke<number>("create_super_user", { payload });
  },

  async setupBusinessProfile(payload: SetupBusinessProfilePayload): Promise<void> {
    return await invoke("setup_business_profile", { payload });
  },

  async completeOnboarding(): Promise<void> {
    return await invoke("complete_onboarding");
  },
};