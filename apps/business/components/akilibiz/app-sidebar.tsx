"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChartNoAxesCombined,
  ClipboardList,
  LayoutDashboard,
  Package,
  ReceiptText,
  Settings,
  Truck,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import images from "@/assets/images";
import { type AccountDisplay } from "@/components/akilibiz/account-menu";
import { NavMain, type NavItem } from "@/components/akilibiz/nav-main";
import { NavUser } from "@/components/akilibiz/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  type NavigationGroup,
} from "@/lib/desktop-navigation";
import { navigationForBusinessRole } from "@/lib/navigation-access";
import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
import type {BusinessMembership} from "@/lib/business-context";

const icons: Record<NavigationGroup["icon"], LucideIcon> = {
  dashboard: LayoutDashboard,
  pos: ReceiptText,
  customers: Users,
  products: Package,
  inventory: ClipboardList,
  suppliers: Truck,
  finance: WalletCards,
  reports: ChartNoAxesCombined,
  staff: Users,
  settings: Settings,
};

export function AppSidebar({
  account,businessRole,
}:{
  account:AccountDisplay;
  businessRole:BusinessMembership["role"]|null;
}){
  const {t}=useI18n();
  const navMain:NavItem[]=navigationForBusinessRole(businessRole).map(item=>({
    title:item.labelKey?t(item.labelKey):item.label,
    url:item.icon==="pos"?"/dashboard/pos":item.items[0].href,
    icon:icons[item.icon],
    items:item.items.map(subItem=>({
      title:subItem.labelKey?t(subItem.labelKey):subItem.label,
      url:subItem.href,
    })),
  }));
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/dashboard">
                <Image
                  src={images.logo}
                  alt="AkiliBiz"
                  width={24}
                  height={24}
                  className="size-6 rounded-sm"
                />
                <span className="text-base font-semibold">AkiliBiz</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser account={account} />
      </SidebarFooter>
    </Sidebar>
  );
}
