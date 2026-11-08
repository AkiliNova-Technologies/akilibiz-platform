import * as React from "react";
import {
  IconCash,
  IconDashboard,
  IconPackage,
  IconClipboardList,
  IconUsers,
  IconChartBar,
  IconUserCircle,
  IconSettings,
  IconTruck,
  IconReportMoney,
  type Icon,
} from "@tabler/icons-react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { usePermissions } from "@/hooks/usePermissions";
import { useI18n } from "@/hooks/useI18n";
import type { TranslationKey } from "@/i18n";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavigationItem = {
  titleKey: TranslationKey;
  url: string;
  icon: Icon;
  permission: string;
  items?: Array<{
    titleKey?: TranslationKey;
    title?: string;
    url: string;
    permission?: string;
  }>;
};

const data: { navMain: NavigationItem[] } = {
  navMain: [
    {
      titleKey: "nav.dashboard",
      url: "/dashboard",
      icon: IconDashboard,
      permission: "dashboard.view",
      items: [
        {
          titleKey: "nav.overview",
          url: "/dashboard",
          permission: "reports.view",
        },
        {
          titleKey: "nav.businessInsights",
          url: "/dashboard/analytics",
          permission: "reports.view",
        },
      ],
    },
    {
      titleKey: "nav.pos",
      url: "/dashboard/pos",
      icon: IconCash,
      permission: "pos.create_sale",
      items: [
        { titleKey: "nav.newSale", url: "/dashboard/pos/new-sale" },
        { titleKey: "nav.creditOrders", url: "/dashboard/pos/credit" },
        { titleKey: "nav.salesHistory", url: "/dashboard/pos/history" },
      ],
    },
    {
      titleKey: "nav.customers",
      url: "/dashboard/customers",
      icon: IconUsers,
      permission: "customers.view",
      items: [
        { titleKey: "nav.allCustomers", url: "/dashboard/customers" },
        { titleKey: "nav.creditManagement", url: "/dashboard/customers/credit" },
        { titleKey: "nav.purchaseHistory", url: "/dashboard/customers/history" },
      ],
    },
    {
      titleKey: "nav.products",
      url: "/dashboard/products",
      icon: IconPackage,
      permission: "products.manage",
      items: [
        { titleKey: "nav.allProducts", url: "/dashboard/products" },
        { titleKey: "nav.categories", url: "/dashboard/products/categories" },
      ],
    },
    {
      titleKey: "nav.inventory",
      url: "/dashboard/inventory",
      icon: IconClipboardList,
      permission: "inventory.adjust",
      items: [
        { titleKey: "nav.stockOverview", url: "/dashboard/inventory" },
        { titleKey: "nav.stockAdjustment", url: "/dashboard/inventory/adjustment" },
        { titleKey: "nav.lowStockAlerts", url: "/dashboard/inventory/alerts" },
        { titleKey: "nav.stockHistory", url: "/dashboard/inventory/history" },
      ],
    },
    {
      titleKey: "nav.suppliers",
      url: "/dashboard/suppliers",
      icon: IconTruck,
      permission: "suppliers.view",
      items: [
        { titleKey: "nav.allSuppliers", url: "/dashboard/suppliers" },
        { titleKey: "nav.purchaseOrders", url: "/dashboard/suppliers/orders" },
        { titleKey: "nav.supplierPayments", url: "/dashboard/suppliers/payments" },
      ],
    },
    {
      titleKey: "nav.finance",
      url: "/dashboard/finance",
      icon: IconReportMoney,
      permission: "finance.view",
      items: [
        { titleKey: "nav.overview", url: "/dashboard/finance" },
        { titleKey: "nav.income", url: "/dashboard/finance/income" },
        { titleKey: "nav.expenses", url: "/dashboard/finance/expenses" },
        { titleKey: "nav.cashFlow", url: "/dashboard/finance/cashflow" },
        { titleKey: "nav.ledger", url: "/dashboard/finance/ledger" },
      ],
    },
    {
      titleKey: "nav.reports",
      url: "/dashboard/reports",
      icon: IconChartBar,
      permission: "reports.view",
      items: [
        { titleKey: "nav.reportsOverview", url: "/dashboard/reports" },
        { titleKey: "nav.salesReports", url: "/dashboard/reports/sales" },
        { titleKey: "nav.purchasingReports", url: "/dashboard/reports/purchasing" },
        { titleKey: "nav.inventoryReports", url: "/dashboard/reports/inventory" },
        { titleKey: "nav.financialReports", url: "/dashboard/reports/financial" },
      ],
    },
    {
      titleKey: "nav.staff",
      url: "/dashboard/staff",
      icon: IconUserCircle,
      permission: "staff.manage",
      items: [
        { titleKey: "nav.allStaff", url: "/dashboard/staff" },
        { titleKey: "nav.rolesPermissions", url: "/dashboard/staff/roles" },
        { titleKey: "nav.activityLogs", url: "/dashboard/staff/logs" },
      ],
    },
    {
      titleKey: "nav.settings",
      url: "/dashboard/settings",
      icon: IconSettings,
      permission: "settings.manage",
      items: [
        { titleKey: "nav.settingsOverview", url: "/dashboard/settings" },
        { titleKey: "nav.businessProfile", url: "/dashboard/settings/business" },
        { titleKey: "nav.receiptSettings", url: "/dashboard/settings/receipt" },
        { titleKey: "nav.taxConfiguration", url: "/dashboard/settings/tax" },
        { titleKey: "nav.backupRestore", url: "/dashboard/settings/backup" },
        { title: "Accounting Periods", url: "/dashboard/settings/accounting-periods", permission: "finance.view" },
      ],
    },
  ],
};

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { can } = usePermissions();
  const { t } = useI18n();

  const navigation = data.navMain.map(({ titleKey, items, ...item }) => ({
    ...item,
    title: t(titleKey),
    items: [
      ...(items ?? []),
      ...(item.url === "/dashboard/settings"
        ? [{ titleKey: "nav.language" as const, url: "/dashboard/settings/language" }]
        : []),
    ].map(({ titleKey: subTitleKey, ...subItem }) => ({
      ...subItem,
      title: subTitleKey ? t(subTitleKey) : (subItem as { title?: string }).title ?? "",
    })),
  }));
  const filteredNavMain = navigation
    .filter((item) => can(item.permission))
    .map((item) => ({
      ...item,
      items: item.items?.filter((subItem) => {
        const permission = (subItem as { permission?: string }).permission;
        return !permission || can(permission);
      }),
    }));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <img src="/icon.png" alt="AkiliBiz Logo" className="size-6 rounded-full" />
                <span className="text-base font-semibold">AkiliBiz</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={filteredNavMain} />
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
