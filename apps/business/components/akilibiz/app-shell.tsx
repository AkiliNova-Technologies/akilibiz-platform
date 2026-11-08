"use client";

import { AppSidebar } from "@/components/akilibiz/app-sidebar";
import { type AccountDisplay } from "@/components/akilibiz/account-menu";
import { SiteHeader } from "@/components/akilibiz/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useTheme } from "@/hooks/use-theme";

export function AppShell({
  account,
  children,
}: {
  account: AccountDisplay;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();

  return (
    <SidebarProvider className="bg-background dark:bg-[#121212]">
      <AppSidebar account={account} />
      <SidebarInset className="min-h-svh dark:bg-[#121212]">
        <SiteHeader
          account={account}
          theme={theme}
        />
        <div className="mx-auto w-full max-w-8xl py-6 px-4 lg:px-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
