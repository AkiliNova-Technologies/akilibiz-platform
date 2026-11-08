import type { CurrentUser } from "@/services/tauri/auth";
import { tauriNotificationsService } from "@/services/tauri/notifications";

let reconciledStaffId: number | null = null;

export function canReconcileOperationalAlerts(user: CurrentUser): boolean {
  return user.permissions.includes("inventory.view") || user.permissions.includes("reports.view");
}

export async function reconcileOperationalAlertsOnceForSession(
  user: CurrentUser,
): Promise<void> {
  if (!canReconcileOperationalAlerts(user) || reconciledStaffId === user.staff_id) {
    return;
  }

  reconciledStaffId = user.staff_id;
  try {
    await tauriNotificationsService.reconcileOperationalAlerts();
  } catch {
    // Reconciliation is best-effort after authentication; it must not block the session.
  }
}

export function resetOperationalAlertSession(): void {
  reconciledStaffId = null;
}
