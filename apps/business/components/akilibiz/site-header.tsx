"use client";

import { type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { type AccountDisplay } from "@/components/akilibiz/account-menu";
import { NotificationBell } from "@/components/akilibiz/notifications/NotificationBell";
import { PosClearSaleHeaderAction } from "@/components/akilibiz/pos/pos-header-actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { type Theme, useTheme } from "@/hooks/use-theme";
import { findDesktopRoute } from "@/lib/desktop-navigation";

export function SiteHeader({ account, theme, rightActions }: {
  account: AccountDisplay;
  theme: Theme;
  rightActions?: ReactNode;
}) {
  const { toggleTheme } = useTheme();
  const pathname = usePathname();
  // Desktop headers show Dashboard at the top of Overview, not Overview.
  const routeTitle = findDesktopRoute(pathname)?.item.label ?? "Dashboard";
  const title = pathname === "/dashboard" ? "Dashboard" : pathname === "/dashboard/account" ? "My Account" : routeTitle;

  return (
    <header className="sticky top-0 z-50 flex min-h-14 shrink-0 items-center gap-2 border-b bg-background py-2 transition-[width,height] ease-linear dark:bg-[#323232] group-has-data-[collapsible=icon]/sidebar-wrapper:min-h-14">
      <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 px-3 sm:px-4 lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          <h1 className="min-w-0 truncate text-lg font-medium sm:text-xl lg:text-2xl">{title}</h1>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1 sm:gap-2">
          {pathname === "/dashboard/pos/new-sale" && <PosClearSaleHeaderAction />}
          {rightActions ? (
            <>
              {rightActions}
              <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />
            </>
          ) : null}
          <NotificationBell />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative size-9 shrink-0 sm:size-10"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            <Sun className={`size-6 transition-all duration-300 ${theme === "light" ? "scale-100 rotate-0" : "scale-0 -rotate-90"}`} />
            <Moon className={`absolute size-6 transition-all duration-300 ${theme === "dark" ? "scale-100 rotate-0" : "scale-0 rotate-90"}`} />
          </Button>
          <div className="hidden items-center gap-2 sm:ml-1 sm:flex">
            <Avatar className="size-9 border sm:size-10">
              <AvatarFallback className="bg-primary/10 text-primary">{account.initials}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  );
}
