"use client";

import { useCallback, useMemo, useState } from "react";

export type WebNotification = {
  id: string;
  title: string;
  message: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  is_read: boolean;
  created_at: string;
  action_type?: "NAVIGATE";
  action_target?: string;
};

const temporaryNotifications: WebNotification[] = [
  {
    id: "temporary-low-stock-alert",
    title: "Low stock alert",
    message: "Some products are below their reorder level.",
    severity: "WARNING",
    is_read: false,
    created_at: "2026-09-18T08:00:00.000Z",
    action_type: "NAVIGATE",
    action_target: "/inventory/low-stock",
  },
];

/**
 * Temporary client-only adapter until web notifications have a data source.
 * Its unread total is always derived from the local notification state.
 */
export function useWebNotifications() {
  const [notifications, setNotifications] = useState<WebNotification[]>(
    temporaryNotifications,
  );
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  const markRead = useCallback((id: string) => {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === id
          ? { ...notification, is_read: true }
          : notification,
      ),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, is_read: true })),
    );
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== id),
    );
  }, []);

  return {
    notifications,
    unreadCount,
    loading: false,
    markRead,
    markAllRead,
    dismiss,
  };
}
