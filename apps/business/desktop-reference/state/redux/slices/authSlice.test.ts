import { configureStore } from "@reduxjs/toolkit";
import { beforeEach, describe, expect, it, vi } from "vitest";
import authReducer, { getCurrentUser, login } from "@/redux/slices/authSlice";
import { tauriAuthService, type CurrentUser } from "@/services/tauri/auth";
import { reconcileOperationalAlertsOnceForSession } from "@/services/session-alert-reconciliation";

vi.mock("@/services/tauri/auth", () => ({
  tauriAuthService: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

vi.mock("@/services/session-alert-reconciliation", () => ({
  reconcileOperationalAlertsOnceForSession: vi.fn(),
  resetOperationalAlertSession: vi.fn(),
}));

const currentUser: CurrentUser = {
  user_id: 1,
  staff_id: 2,
  username: "operator",
  email: null,
  full_name: "Operator",
  role_id: 1,
  role_name: "Manager",
  permissions: ["inventory.view"],
};

describe("authentication alert bootstrap", () => {
  const reconcile = vi.mocked(reconcileOperationalAlertsOnceForSession);

  beforeEach(() => {
    vi.mocked(tauriAuthService.login).mockReset();
    vi.mocked(tauriAuthService.getCurrentUser).mockReset();
    reconcile.mockReset();
  });

  it("reconciles before completing a successful login", async () => {
    vi.mocked(tauriAuthService.login).mockResolvedValue(currentUser);
    reconcile.mockResolvedValue();
    const store = configureStore({ reducer: { auth: authReducer } });

    await store.dispatch(login({ username: "operator", password: "secret" })).unwrap();

    expect(reconcile).toHaveBeenCalledWith(currentUser);
    expect(store.getState().auth.user).toEqual(currentUser);
  });

  it("reconciles a restored session before exposing it to the application", async () => {
    vi.mocked(tauriAuthService.getCurrentUser).mockResolvedValue(currentUser);
    reconcile.mockResolvedValue();
    const store = configureStore({ reducer: { auth: authReducer } });

    await store.dispatch(getCurrentUser()).unwrap();

    expect(reconcile).toHaveBeenCalledWith(currentUser);
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });
});
