import { useCallback } from "react";
import { getErrorMessage } from "@/utils/error-message";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  login,
  logout,
  getCurrentUser,
  selectUser,
  selectIsAuthenticated,
  selectAuthLoading,
  selectAuthError,
  selectAuthInitialized,
  clearError,
} from "@/redux/slices/authSlice";
import { toast } from "sonner";

export const useReduxAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const loading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const initialized = useAppSelector(selectAuthInitialized);

  const signIn = useCallback(
    async (username: string, password: string) => {
      try {
        const result = await dispatch(login({ username, password })).unwrap();
        toast.success("Login successful");
        return result;
      } catch (err) {
        const message = getErrorMessage(err, "Login failed");
        toast.error(message);
        throw err;
      }
    },
    [dispatch],
  );

  const signOut = useCallback(async () => {
    try {
      await dispatch(logout()).unwrap();
      toast.success("Logged out successfully");
      navigate("/");
    } catch (err) {
      toast.error(getErrorMessage(err, "Logout failed"));
    }
  }, [dispatch, navigate]);

  const checkAuth = useCallback(async () => {
    try {
      await dispatch(getCurrentUser()).unwrap();
      return true;
    } catch {
      return false;
    }
  }, [dispatch]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    initialized,
    signIn,
    signOut,
    checkAuth,
    clearAuthError,
  };
};
