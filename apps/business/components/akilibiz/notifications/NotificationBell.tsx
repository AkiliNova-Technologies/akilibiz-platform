"use client";

import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  useWebNotifications,
  type WebNotification,
} from "./use-web-notifications";

const severityConfig: Record<
  WebNotification["severity"],
  { icon: LucideIcon; className: string }
> = {
  CRITICAL: { icon: AlertCircle, className: "text-primary" },
  WARNING: { icon: AlertTriangle, className: "text-primary" },
  INFO: { icon: Info, className: "text-primary" },
};

function SeverityIcon({ severity }: { severity: WebNotification["severity"] }) {
  const { icon: Icon, className } = severityConfig[severity];

  return (
    <Icon
      aria-label={`${severity.toLowerCase()} severity`}
      className={`size-4 shrink-0 ${className}`}
    />
  );
}

export function NotificationBell() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    dismiss,
  } = useWebNotifications();

  function handleNotification(notification: WebNotification) {
    markRead(notification.id);

    if (
      notification.action_type !== "NAVIGATE" ||
      !notification.action_target
    ) {
      return;
    }

    const target =
      notification.action_target === "/inventory/low-stock"
        ? "/dashboard/inventory/alerts"
        : notification.action_target;

    if (target.startsWith("/dashboard/")) {
      router.push(target);
    }
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          aria-label="Notifications"
          className="relative size-10 rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          size="icon"
          variant="ghost"
        >
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <Badge className="absolute -right-1 -top-1 min-w-5 justify-center rounded-full px-1 text-[10px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent
        className="flex w-full flex-col border-l bg-background p-0 shadow-2xl dark:bg-[#121212] sm:max-w-lg"
        side="right"
      >
        <SheetHeader className="flex-row items-center justify-between space-y-0 border-b bg-muted/20 px-5 py-4 dark:bg-[#323232]">
          <div>
            <SheetTitle className="text-lg">Notifications</SheetTitle>
            <SheetDescription>
              {unreadCount
                ? `${unreadCount} requiring attention`
                : "You’re all caught up"}
            </SheetDescription>
          </div>
          <Button
            className="mr-5"
            disabled={!unreadCount}
            onClick={markAllRead}
            size="sm"
            variant="outline"
          >
            <Check className="size-4" />
            Mark all
          </Button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto bg-background dark:bg-[#121212]">
          {loading ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Loading alerts…
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No active notifications.
            </p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border-b px-5 py-4 transition-colors last:border-0 hover:bg-[#323232]/80 ${notification.is_read ? "" : "border-l-2 border-l-primary bg-primary/[0.035]"}`}
              >
                <div className="flex gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <SeverityIcon severity={notification.severity} />
                  </span>
                  <button
                    className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => handleNotification(notification)}
                    type="button"
                  >
                    <p className="font-medium leading-5 text-foreground">
                      {notification.title}
                    </p>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </button>
                  <Button
                    aria-label="Dismiss notification"
                    className="size-7 shrink-0"
                    onClick={() => dismiss(notification.id)}
                    size="icon"
                    variant="ghost"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
