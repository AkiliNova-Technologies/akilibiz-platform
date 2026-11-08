import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getErrorMessage } from "@/utils/error-message";
import { tauriAuthService, type CurrentUser } from "@/services/tauri/auth";
import {
  reconcileOperationalAlertsOnceForSession,
  resetOperationalAlertSession,
} from "@/services/session-alert-reconciliation";

interface AuthState {
  user: CurrentUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  initialized: boolean;
}

interface LoginCredentials {
  username: string;
  password: string;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
  isAuthenticated: false,
  initialized: false,
};

export const login = createAsyncThunk<
  CurrentUser,
  LoginCredentials,
  { rejectValue: string }
>("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const user = await tauriAuthService.login(credentials);
    await reconcileOperationalAlertsOnceForSession(user);
    return user;
  } catch (error) {
    const message = getErrorMessage(
      error,
      "Login failed. Please check your credentials.",
    );
    return rejectWithValue(message);
  }
});

export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await tauriAuthService.logout();
      resetOperationalAlertSession();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error, "Logout failed"));
    }
  },
);

export const getCurrentUser = createAsyncThunk<
  CurrentUser,
  void,
  { rejectValue: string }
>("auth/getCurrentUser", async (_, { rejectWithValue }) => {
  try {
    const user = await tauriAuthService.getCurrentUser();
    await reconcileOperationalAlertsOnceForSession(user);
    return user;
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, "No active session"));
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
        state.initialized = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = action.payload || "Login failed";
        state.initialized = true;
      })

      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.initialized = true;
      })
      .addCase(logout.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Logout failed";
      })

      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
        state.initialized = true;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.initialized = true;
      });
  },
});

export const { clearError, clearCurrentUser } = authSlice.actions;

export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) =>
  state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectAuthInitialized = (state: { auth: AuthState }) =>
  state.auth.initialized;

export default authSlice.reducer;
