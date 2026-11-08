import { useCallback } from "react";
import { getErrorMessage } from "@/utils/error-message";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  checkOnboardingStatus,
  createSuperUser,
  setupBusinessProfile,
  completeOnboarding,
  setStep,
  resetOnboarding,
  selectOnboarding,
} from "@/redux/slices/onboardingSlice";
import { toast } from "sonner";

export const useReduxOnboarding = () => {
  const dispatch = useAppDispatch();
  const { showOnboarding, currentStep, completed, loading, error } = useAppSelector(selectOnboarding);

  const checkStatus = useCallback(async () => {
    try {
      await dispatch(checkOnboardingStatus()).unwrap();
    } catch {
      // Error is already handled in the slice
    }
  }, [dispatch]);

  const handleCreateSuperUser = useCallback(async (data: {
    username: string;
    password: string;
    email?: string;
    full_name: string;
  }) => {
    try {
      await dispatch(createSuperUser(data)).unwrap();
      toast.success("Admin account created successfully");
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to create admin account"));
      return false;
    }
  }, [dispatch]);

  const handleSetupBusinessProfile = useCallback(async (data: {
    business_name: string;
    trading_name?: string;
    owner_name?: string;
    email?: string;
    phone?: string;
    tin?: string;
    registration_number?: string;
    address?: string;
    city?: string;
    country?: string;
    currency: string;
    timezone: string;
  }) => {
    try {
      await dispatch(setupBusinessProfile(data)).unwrap();
      toast.success("Business profile saved");
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save business profile"));
      return false;
    }
  }, [dispatch]);

  const handleCompleteOnboarding = useCallback(async () => {
    try {
      await dispatch(completeOnboarding()).unwrap();
      toast.success("Setup complete! Welcome to AkiliBiz!");
      return true;
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to complete onboarding"));
      return false;
    }
  }, [dispatch]);

  const goToStep = useCallback((step: number) => {
    dispatch(setStep(step));
  }, [dispatch]);

  const resetAll = useCallback(() => {
    dispatch(resetOnboarding());
  }, [dispatch]);

  return {
    showOnboarding,
    currentStep,
    completed,
    loading,
    error,
    checkStatus,
    createSuperUser: handleCreateSuperUser,
    setupBusinessProfile: handleSetupBusinessProfile,
    completeOnboarding: handleCompleteOnboarding,
    goToStep,
    resetOnboarding: resetAll,
  };
};
