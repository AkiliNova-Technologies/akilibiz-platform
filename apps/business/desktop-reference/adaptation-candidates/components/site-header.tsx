import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sun, Moon } from "lucide-react";
import { type ReactNode } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useReduxAuth } from "@/hooks/useReduxAuth";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useI18n } from "@/hooks/useI18n";

interface SiteHeaderProps {
  rightActions?: ReactNode;
  label?: string;
}

export function SiteHeader({ rightActions, label }: SiteHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useReduxAuth();
  const { t } = useI18n();

  const pageTitle = t("nav.dashboard");

  const getInitials = (): string => {
    if (user?.full_name) {
      const names = user.full_name.split(" ");
      if (names.length === 1) return names[0].charAt(0).toUpperCase();
      return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }
    return "U";
  };


  return (
    <header className="sticky top-0 z-50 flex min-h-18 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear dark:bg-[#323232] group-has-data-[collapsible=icon]/sidebar-wrapper:h-18">
      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 px-4 lg:px-6">
        {/* Left side - Page title and sidebar trigger */}
        <div className="flex min-w-0 items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="min-w-0 truncate text-2xl font-medium">{label ? label : pageTitle}</h1>

        </div>

        {/* Right side - Notifications, theme, custom actions, and user avatar */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* Custom right actions */}
          {rightActions && (
            <>
              {rightActions}
              <Separator orientation="vertical" className="h-6 mx-1" />
            </>
          )}

          <NotificationBell />


          {/* Theme toggle button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 relative"
            onClick={toggleTheme}
            aria-label={t("common.switchToMode", {
              mode: theme === "light" ? t("common.dark") : t("common.light"),
            })}
          >
            <Sun
              className={`h-6 w-6 transition-all duration-300 ${
                theme === "light" ? "scale-100 rotate-0" : "scale-0 -rotate-90"
              }`}
            />
            <Moon
              className={`h-6 w-6 absolute transition-all duration-300 ${
                theme === "dark" ? "scale-100 rotate-0" : "scale-0 rotate-90"
              }`}
            />
          </Button>

          {/* User avatar with name */}
          <div className="flex items-center gap-2 ml-2">
            
            <Avatar className="h-12 w-12 border-2 ">
             
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials()}
                </AvatarFallback>
              
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
