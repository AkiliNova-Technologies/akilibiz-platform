import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/utils/error-message";
import { tauriOnboardingService, type OnboardingStatus } from "@/services/tauri/onboarding";

interface OnboardingState {
  showOnboarding: boolean;
  currentStep: number;
  completed: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: OnboardingState = {
  showOnboarding: false,
  currentStep: 0,
  completed: false,
  loading: false,
  error: null,
};

export const checkOnboardingStatus = createAsyncThunk<
  OnboardingStatus,
  void,
  { rejectValue: string }
>("onboarding/checkStatus", async (_, { rejectWithValue }) => {
  try {
    return await tauriOnboardingService.getOnboardingStatus();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to check onboarding status"));
  }
});

export const createSuperUser = createAsyncThunk<
  { userId: number; nextStep: number },
  { username: string; password: string; email?: string | null; full_name: string },
  { rejectValue: string }
>("onboarding/createSuperUser", async (payload, { rejectWithValue }) => {
  try {
    const userId = await tauriOnboardingService.createSuperUser({
      username: payload.username,
      password: payload.password,
      email: payload.email || null,
      full_name: payload.full_name,
    });
    return { userId, nextStep: 2 };
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to create admin account"));
  }
});

export const setupBusinessProfile = createAsyncThunk<
  number,
  {
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
  },
  { rejectValue: string }
>("onboarding/setupBusinessProfile", async (payload, { rejectWithValue }) => {
  try {
    await tauriOnboardingService.setupBusinessProfile(payload);
    return 3; // next step
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to setup business profile"));
  }
});

export const completeOnboarding = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>("onboarding/complete", async (_, { rejectWithValue }) => {
  try {
    await tauriOnboardingService.completeOnboarding();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "Failed to complete onboarding"));
  }
});

const onboardingSlice = createSlice({
  name: "onboarding",
  initialState,
  reducers: {
    setStep: (state, action) => {
      state.currentStep = action.payload;
    },
    resetOnboarding: (state) => {
      state.showOnboarding = false;
      state.currentStep = 0;
      state.completed = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkOnboardingStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkOnboardingStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.showOnboarding = action.payload.show_onboarding;
        state.currentStep = action.payload.current_step;
        state.completed = action.payload.completed;
      })
      .addCase(checkOnboardingStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to check onboarding status";
      })
      
      .addCase(createSuperUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSuperUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentStep = action.payload.nextStep;
      })
      .addCase(createSuperUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to create admin account";
      })
      
      .addCase(setupBusinessProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(setupBusinessProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.currentStep = action.payload;
      })
      .addCase(setupBusinessProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to save business profile";
      })
      
      .addCase(completeOnboarding.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(completeOnboarding.fulfilled, (state) => {
        state.loading = false;
        state.showOnboarding = false;
        state.completed = true;
        state.currentStep = 4;
      })
      .addCase(completeOnboarding.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to complete onboarding";
      });
  },
});

export const { setStep, resetOnboarding } = onboardingSlice.actions;
export const selectOnboarding = (state: { onboarding: OnboardingState }) => state.onboarding;
export default onboardingSlice.reducer;
