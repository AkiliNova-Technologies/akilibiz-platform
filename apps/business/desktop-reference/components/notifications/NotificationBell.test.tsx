import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { tauriNotificationsService } from "@/services/tauri/notifications";

const { refresh, toastError } = vi.hoisted(() => ({
  refresh: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/hooks/useReduxNotifications", () => ({
  useReduxNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    loading: false,
    refresh,
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("@/hooks/useReduxAuth", () => ({
  useReduxAuth: () => ({
    user: { permissions: ["inventory.view"] },
  }),
}));

vi.mock("@/services/tauri/notifications", () => ({
  tauriNotificationsService: {
    reconcileOperationalAlerts: vi.fn(),
    markDesktopDelivered: vi.fn(),
  },
}));

vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: vi.fn(),
  requestPermission: vi.fn(),
  sendNotification: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { error: toastError } }));

describe("NotificationBell alert refresh", () => {
  const reconcile = vi.mocked(tauriNotificationsService.reconcileOperationalAlerts);

  beforeEach(() => {
    refresh.mockReset();
    refresh.mockResolvedValue(undefined);
    reconcile.mockReset();
    toastError.mockReset();
  });

  it("reconciles and refreshes the displayed Bell alerts on manual refresh", async () => {
    reconcile.mockResolvedValue({ active_alert_count: 1 });
    render(<MemoryRouter><NotificationBell /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    fireEvent.click(await screen.findByRole("button", { name: "Refresh alerts" }));

    await waitFor(() => expect(reconcile).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
  });

  it("shows a safe failure message without attempting to refresh results", async () => {
    reconcile.mockRejectedValue(new Error("database path /private/akilibiz.db"));
    render(<MemoryRouter><NotificationBell /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    fireEvent.click(await screen.findByRole("button", { name: "Refresh alerts" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Unable to refresh alerts."));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(toastError.mock.calls[0][0]).not.toContain("private");
  });
});
