"use client";

import { type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";

import { type AccountDisplay } from "@/components/akilibiz/account-menu";
import { NotificationBell } from "@/components/akilibiz/notifications/NotificationBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { type Theme, useTheme } from "@/hooks/use-theme";
import { findDesktopRoute } from "@/lib/desktop-navigation";

export function SiteHeader({
  account,
  theme,
  rightActions,
}: {
  account: AccountDisplay;
  theme: Theme;
  rightActions?: ReactNode;
}) {
  const { toggleTheme } = useTheme();
  const pathname = usePathname();
  const title = findDesktopRoute(pathname)?.item.label ?? "Dashboard";

  return (
    <header className="sticky top-0 z-50 flex min-h-18 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear dark:bg-[#323232] group-has-data-[collapsible=icon]/sidebar-wrapper:h-18">
      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 px-4 lg:px-6 text-primary">
        <div className="flex min-w-0 items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            className="mx-2 data-[orientation=vertical]:h-4"
            orientation="vertical"
          />
          <h1 className="min-w-0 truncate text-2xl font-medium ">{title}</h1>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {rightActions ? (
            <>
              {rightActions}
              <Separator className="mx-1 h-6" orientation="vertical" />
            </>
          ) : null}
          <NotificationBell />

          <Button
            aria-label={
              theme === "dark"
                ? "Use light workspace appearance"
                : "Use dark workspace appearance"
            }
            className="relative h-10 w-10"
            onClick={toggleTheme}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Sun
              className={`h-6 w-6 transition-all duration-300 ${
                theme === "dark" ? "scale-0 -rotate-90" : "scale-100 rotate-0"
              }`}
            />
            <Moon
              className={`absolute h-6 w-6 transition-all duration-300 ${
                theme === "dark" ? "scale-100 rotate-0" : "scale-0 rotate-90"
              }`}
            />
          </Button>
          <div className="ml-2 flex items-center gap-2">
            <Avatar className="h-12 w-12 border-2">
              <AvatarFallback className="bg-primary/10 text-primary">
                {account.initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
