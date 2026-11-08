import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  canReconcileOperationalAlerts,
  reconcileOperationalAlertsOnceForSession,
  resetOperationalAlertSession,
} from "@/services/session-alert-reconciliation";
import { tauriNotificationsService } from "@/services/tauri/notifications";
import type { CurrentUser } from "@/services/tauri/auth";

vi.mock("@/services/tauri/notifications", () => ({
  tauriNotificationsService: {
    reconcileOperationalAlerts: vi.fn(),
  },
}));

const user = (permissions: string[]): CurrentUser => ({
  user_id: 1,
  staff_id: 7,
  username: "alerts",
  email: null,
  full_name: "Alert User",
  role_id: 1,
  role_name: "Staff",
  permissions,
});

describe("session operational-alert reconciliation", () => {
  const reconcile = vi.mocked(tauriNotificationsService.reconcileOperationalAlerts);

  beforeEach(() => {
    resetOperationalAlertSession();
    reconcile.mockReset();
  });

  it("runs once for an authenticated user with alert-view permission", async () => {
    reconcile.mockResolvedValue({ active_alert_count: 1 });
    const permittedUser = user(["inventory.view"]);

    await reconcileOperationalAlertsOnceForSession(permittedUser);
    await reconcileOperationalAlertsOnceForSession(permittedUser);

    expect(reconcile).toHaveBeenCalledTimes(1);
  });

  it("does not invoke reconciliation for users without an authorized alert view", async () => {
    expect(canReconcileOperationalAlerts(user([]))).toBe(false);
    await reconcileOperationalAlertsOnceForSession(user([]));
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("keeps authentication bootstrap non-blocking when reconciliation fails", async () => {
    reconcile.mockRejectedValue(new Error("internal database detail"));

    await expect(
      reconcileOperationalAlertsOnceForSession(user(["reports.view"])),
    ).resolves.toBeUndefined();
    expect(reconcile).toHaveBeenCalledTimes(1);
  });
});
