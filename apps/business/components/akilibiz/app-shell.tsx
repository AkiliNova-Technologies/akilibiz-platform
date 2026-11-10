"use client";

import { AppSidebar } from "@/components/akilibiz/app-sidebar";
import { type AccountDisplay } from "@/components/akilibiz/account-menu";
import { SiteHeader } from "@/components/akilibiz/site-header";
import { PosHeaderProvider } from "@/components/akilibiz/pos/pos-header-actions";
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
    <PosHeaderProvider>
    <SidebarProvider className="bg-background">
      <AppSidebar account={account} />
      <SidebarInset className="min-h-svh min-w-0 max-w-full bg-background">
        <SiteHeader
          account={account}
          theme={theme}
        />
        <div className="w-full min-w-0 px-3 pb-6 pt-5 sm:px-4 lg:px-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
    </PosHeaderProvider>
  );
}
