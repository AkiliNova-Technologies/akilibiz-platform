import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";

export default function AdminDashboardLayout() {
  return (
    <div className="min-h-screen w-full bg-[#F4F5F9] dark:bg-[#121212] mx-auto">
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="sidebar" />
        <SidebarInset className="min-w-0">
          <div className="@container/main flex min-w-0 flex-1 flex-col gap-2">
            <div className="min-h-screen flex flex-col gap-4 md:gap-6 top-0 relative bg-[#F4F5F9] dark:bg-[#121212]">
              <Outlet />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
