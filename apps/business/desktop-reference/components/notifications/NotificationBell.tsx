import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  X,
  AlertCircle,
  AlertTriangle,
  Info,
  Check,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useReduxNotifications } from "@/hooks/useReduxNotifications";
import { tauriNotificationsService } from "@/services/tauri/notifications";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import type { LucideIcon } from "lucide-react";
import { useReduxAuth } from "@/hooks/useReduxAuth";
import { canReconcileOperationalAlerts } from "@/services/session-alert-reconciliation";
import { toast } from "sonner";

type Severity = "CRITICAL" | "WARNING" | "INFO" | string;

const SEVERITY_CONFIG: Record<string, { icon: LucideIcon; className: string }> =
  {
    CRITICAL: { icon: AlertCircle, className: "text-primary" },
    WARNING: { icon: AlertTriangle, className: "text-primary" },
    INFO: { icon: Info, className: "text-primary" },
  };

function SeverityIcon({ severity }: { severity: Severity }) {
  const config = SEVERITY_CONFIG[severity] ?? SEVERITY_CONFIG.INFO;
  const Icon = config.icon;
  return (
    <Icon
      className={`size-4 shrink-0 ${config.className}`}
      aria-label={`${severity.toLowerCase()} severity`}
    />
  );
}

export function NotificationBell() {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    refresh,
    markRead,
    markAllRead,
    dismiss,
    loading,
  } = useReduxNotifications();
  const { user } = useReduxAuth();
  const canRefreshAlerts = user ? canReconcileOperationalAlerts(user) : false;
  const handleRefreshAlerts = async () => {
    try {
      await tauriNotificationsService.reconcileOperationalAlerts();
      await refresh();
    } catch {
      toast.error("Unable to refresh alerts.");
    }
  };
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const cutoff = Date.now() - 120_000;
    notifications
      .filter(
        (item) =>
          !item.desktop_delivered_at && Date.parse(item.created_at) >= cutoff,
      )
      .forEach((item) => {
        void (async () => {
          try {
            let granted = await isPermissionGranted();
            if (!granted) granted = (await requestPermission()) === "granted";
            if (!granted) return;
            sendNotification({ title: item.title, body: item.message });
            await tauriNotificationsService.markDesktopDelivered(item.id);
          } catch {
            /* Delivery is deliberately best-effort. */
          }
        })();
      });
  }, [notifications]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-10 rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Notifications">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -right-1 -top-1 min-w-5 justify-center rounded-full px-1 text-[10px]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col border-l bg-background dark:bg-[#121212] p-0 shadow-2xl sm:max-w-lg">
        <SheetHeader className="flex-row items-center justify-between space-y-0 border-b bg-muted/20 dark:bg-[#323232] px-5 py-4">
          <div>
            <SheetTitle className="text-lg">Notifications</SheetTitle>
            <SheetDescription>
              {unreadCount
                ? `${unreadCount} requiring attention`
                : "You're all caught up"}
            </SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            {canRefreshAlerts && (
              <Button
                variant="default"
                size="sm"
                className="rounded-full"
                aria-label="Refresh alerts"
                onClick={() => void handleRefreshAlerts()}>
                <RefreshCcw className="size-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mr-5"
              disabled={!unreadCount}
              onClick={() => void markAllRead()}>
              <Check className="size-4" />
              Mark all
            </Button>
          </div>
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
            notifications.map((item) => (
              <div
                key={item.id}
                className={`border-b px-5 py-4 transition-colors last:border-0 hover:bg-[#323232]/80 ${item.is_read ? "" : "border-l-2 border-l-primary bg-primary/[0.035]"}`}>
                <div className="flex gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <SeverityIcon severity={item.severity} />
                  </span>
                  <button
                    className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => {
                      void markRead(item.id);
                      if (
                        item.action_type === "NAVIGATE" &&
                        item.action_target
                      ) {
                        const target =
                          item.action_target === "/inventory/low-stock"
                            ? "/dashboard/inventory/alerts"
                            : item.action_target;
                        if (target.startsWith("/dashboard/")) navigate(target);
                      }
                    }}>
                    <p className="font-medium leading-5 text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
                      {item.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() => void dismiss(item.id)}
                    aria-label="Dismiss notification">
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
