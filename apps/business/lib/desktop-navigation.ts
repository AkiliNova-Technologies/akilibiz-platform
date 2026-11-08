export type NavigationItem = { href: string; label: string; reference: string };
export type NavigationGroup = {
  icon:
    | "dashboard"
    | "pos"
    | "customers"
    | "products"
    | "inventory"
    | "suppliers"
    | "finance"
    | "reports"
    | "staff"
    | "settings";
  items: NavigationItem[];
  label: string;
};

export const desktopNavigation: NavigationGroup[] = [
  {
    icon: "dashboard",
    label: "Dashboard",
    items: [
      { href: "/dashboard", label: "Overview", reference: "DashboardPage" },
      {
        href: "/dashboard/analytics",
        label: "Business Insights",
        reference: "AnalyticsPage",
      },
    ],
  },
  {
    icon: "pos",
    label: "POS",
    items: [
      {
        href: "/dashboard/pos/new-sale",
        label: "New Sale",
        reference: "POSPage",
      },
      {
        href: "/dashboard/pos/credit",
        label: "Credit Orders",
        reference: "CreditOrdersPage",
      },
      {
        href: "/dashboard/pos/history",
        label: "Sales History",
        reference: "SalesHistoryPage",
      },
    ],
  },
  {
    icon: "customers",
    label: "Customers",
    items: [
      {
        href: "/dashboard/customers",
        label: "All Customers",
        reference: "CustomersPage",
      },
      {
        href: "/dashboard/customers/credit",
        label: "Credit Management",
        reference: "CustomerCreditManagementPage",
      },
      {
        href: "/dashboard/customers/history",
        label: "Purchase History",
        reference: "CustomerPurchaseHistoryPage",
      },
    ],
  },
  {
    icon: "products",
    label: "Products",
    items: [
      {
        href: "/dashboard/products",
        label: "All Products",
        reference: "ProductsPage",
      },
      {
        href: "/dashboard/products/categories",
        label: "Categories",
        reference: "ProductCategoriesPage",
      },
    ],
  },
  {
    icon: "inventory",
    label: "Inventory",
    items: [
      {
        href: "/dashboard/inventory",
        label: "Stock Overview",
        reference: "InventoryPage",
      },
      {
        href: "/dashboard/inventory/adjustment",
        label: "Stock Adjustment",
        reference: "InventoryStockAdjustmentPage",
      },
      {
        href: "/dashboard/inventory/alerts",
        label: "Low Stock Alerts",
        reference: "InventoryLowStockAlertsPage",
      },
      {
        href: "/dashboard/inventory/history",
        label: "Stock History",
        reference: "InventoryStockHistoryPage",
      },
    ],
  },
  {
    icon: "suppliers",
    label: "Suppliers",
    items: [
      {
        href: "/dashboard/suppliers",
        label: "All Suppliers",
        reference: "SuppliersPage",
      },
      {
        href: "/dashboard/suppliers/orders",
        label: "Purchase Orders",
        reference: "SupplierPurchaseOrdersPage",
      },
      {
        href: "/dashboard/suppliers/payments",
        label: "Supplier Payments",
        reference: "SupplierPaymentsPage",
      },
    ],
  },
  {
    icon: "finance",
    label: "Finance",
    items: [
      {
        href: "/dashboard/finance",
        label: "Overview",
        reference: "FinanceOverviewPage",
      },
      {
        href: "/dashboard/finance/income",
        label: "Income",
        reference: "FinanceIncomePage",
      },
      {
        href: "/dashboard/finance/expenses",
        label: "Expenses",
        reference: "FinanceExpensesPage",
      },
      {
        href: "/dashboard/finance/cashflow",
        label: "Cash Flow",
        reference: "FinanceCashFlowPage",
      },
      {
        href: "/dashboard/finance/ledger",
        label: "Ledger",
        reference: "FinanceLedgerPage",
      },
    ],
  },
  {
    icon: "reports",
    label: "Reports",
    items: [
      {
        href: "/dashboard/reports",
        label: "Reports Overview",
        reference: "ReportsOverviewPage",
      },
      {
        href: "/dashboard/reports/sales",
        label: "Sales Reports",
        reference: "ReportsSalesPage",
      },
      {
        href: "/dashboard/reports/purchasing",
        label: "Purchasing Reports",
        reference: "ReportsPurchasingPage",
      },
      {
        href: "/dashboard/reports/inventory",
        label: "Inventory Reports",
        reference: "ReportsInventoryPage",
      },
      {
        href: "/dashboard/reports/financial",
        label: "Financial Reports",
        reference: "ReportsFinancialPage",
      },
    ],
  },
  {
    icon: "staff",
    label: "Staff",
    items: [
      { href: "/dashboard/staff", label: "All Staff", reference: "StaffPage" },
      {
        href: "/dashboard/staff/roles",
        label: "Roles & Permissions",
        reference: "StaffRolesPermissionsPage",
      },
      {
        href: "/dashboard/staff/logs",
        label: "Activity Logs",
        reference: "StaffActivityLogsPage",
      },
    ],
  },
  {
    icon: "settings",
    label: "Settings",
    items: [
      {
        href: "/dashboard/settings",
        label: "Settings Overview",
        reference: "SettingsOverviewPage",
      },
      {
        href: "/dashboard/settings/business",
        label: "Business Profile",
        reference: "SettingsBusinessProfilePage",
      },
      {
        href: "/dashboard/settings/receipt",
        label: "Receipt Settings",
        reference: "SettingsReceiptPage",
      },
      {
        href: "/dashboard/settings/tax",
        label: "Tax Configuration",
        reference: "SettingsTaxConfigurationPage",
      },
      {
        href: "/dashboard/settings/backup",
        label: "Backup & Restore",
        reference: "SettingsBackupRestorePage",
      },
      {
        href: "/dashboard/settings/accounting-periods",
        label: "Accounting Periods",
        reference: "SettingsAccountingPeriodsPage",
      },
      {
        href: "/dashboard/settings/language",
        label: "Language",
        reference: "SettingsLanguagePage",
      },
    ],
  },
];

export function findDesktopRoute(pathname: string) {
  for (const group of desktopNavigation) {
    const item = group.items.find((candidate) => candidate.href === pathname);
    if (item) return { group, item };
  }
  return null;
}
