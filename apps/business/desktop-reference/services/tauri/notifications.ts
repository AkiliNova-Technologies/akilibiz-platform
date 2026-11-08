import { invoke } from "@tauri-apps/api/core";
import type { AppNotification } from "@/types/notifications";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";

export const tauriNotificationsService = {
  getNotifications(unreadOnly = false) { return invoke<AppNotification[]>("get_notifications", { query: { unread_only: unreadOnly, limit: 30 } }); },
  getUnreadCount() { return invoke<number>("get_unread_notification_count"); },
  markRead(notificationId: string) { return invoke("mark_notification_read", { payload: { notification_id: notificationId } }); },
  markAllRead() { return invoke("mark_all_notifications_read"); },
  dismiss(notificationId: string) { return invoke("dismiss_notification", { payload: { notification_id: notificationId } }); },
  reconcileOperationalAlerts() { return invoke<{ active_alert_count: number }>("reconcile_operational_alerts"); },
  markDesktopDelivered(alertId: string) { return invoke("mark_operational_alert_desktop_delivered", { payload: { alert_id: alertId } }); },
  async sendTestDesktopNotification() {
    let granted = await isPermissionGranted();
    if (!granted) granted = (await requestPermission()) === "granted";
    if (!granted) throw new Error("Desktop notification permission was not granted");
    sendNotification({ title: "AkiliBiz", body: "Notifications are working correctly." });
  },
};
