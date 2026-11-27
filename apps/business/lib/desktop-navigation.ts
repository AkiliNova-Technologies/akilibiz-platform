import type { TranslationKey } from "@/lib/i18n";

// Labels use the desktop translation keys (desktop src/components/app-sidebar.tsx).
// "label" is the English fallback for the two items the desktop also shows untranslated.
export type NavigationItem = { href: string; label: string; labelKey?: TranslationKey; reference: string };
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
  labelKey?: TranslationKey;
};

export const desktopNavigation: NavigationGroup[] = [
  {
    icon: "dashboard",
    label: "Dashboard", labelKey: "nav.dashboard",
    items: [
      { href: "/dashboard", label: "Overview", labelKey: "nav.overview", reference: "DashboardPage" },
      {
        href: "/dashboard/analytics",
        label: "Business Insights", labelKey: "nav.businessInsights",
        reference: "AnalyticsPage",
      },
    ],
  },
  {
    icon: "pos",
    label: "POS", labelKey: "nav.pos",
    items: [
      {
        href: "/dashboard/pos/new-sale",
        label: "New Sale", labelKey: "nav.newSale",
        reference: "POSPage",
      },
      {
        href: "/dashboard/pos/credit",
        label: "Credit Orders", labelKey: "nav.creditOrders",
        reference: "CreditOrdersPage",
      },
      {
        href: "/dashboard/pos/history",
        label: "Sales History", labelKey: "nav.salesHistory",
        reference: "SalesHistoryPage",
      },
    ],
  },
  {
    icon: "customers",
    label: "Customers", labelKey: "nav.customers",
    items: [
      {
        href: "/dashboard/customers",
        label: "All Customers", labelKey: "nav.allCustomers",
        reference: "CustomersPage",
      },
      {
        href: "/dashboard/customers/credit",
        label: "Credit Management", labelKey: "nav.creditManagement",
        reference: "CustomerCreditManagementPage",
      },
      {
        href: "/dashboard/customers/history",
        label: "Purchase History", labelKey: "nav.purchaseHistory",
        reference: "CustomerPurchaseHistoryPage",
      },
    ],
  },
  {
    icon: "products",
    label: "Products", labelKey: "nav.products",
    items: [
      {
        href: "/dashboard/products",
        label: "All Products", labelKey: "nav.allProducts",
        reference: "ProductsPage",
      },
      {
        href: "/dashboard/products/categories",
        label: "Categories", labelKey: "nav.categories",
        reference: "ProductCategoriesPage",
      },
    ],
  },
  {
    icon: "inventory",
    label: "Inventory", labelKey: "nav.inventory",
    items: [
      {
        href: "/dashboard/inventory",
        label: "Stock Overview", labelKey: "nav.stockOverview",
        reference: "InventoryPage",
      },
      {
        href: "/dashboard/inventory/adjustment",
        label: "Stock Adjustment", labelKey: "nav.stockAdjustment",
        reference: "InventoryStockAdjustmentPage",
      },
      {
        href: "/dashboard/inventory/alerts",
        label: "Low Stock Alerts", labelKey: "nav.lowStockAlerts",
        reference: "InventoryLowStockAlertsPage",
      },
      {
        href: "/dashboard/inventory/history",
        label: "Stock History", labelKey: "nav.stockHistory",
        reference: "InventoryStockHistoryPage",
      },
    ],
  },
  {
    icon: "suppliers",
    label: "Suppliers", labelKey: "nav.suppliers",
    items: [
      {
        href: "/dashboard/suppliers",
        label: "All Suppliers", labelKey: "nav.allSuppliers",
        reference: "SuppliersPage",
      },
      {
        href: "/dashboard/suppliers/orders",
        label: "Purchase Orders", labelKey: "nav.purchaseOrders",
        reference: "SupplierPurchaseOrdersPage",
      },
      {
        href: "/dashboard/suppliers/payments",
        label: "Supplier Payments", labelKey: "nav.supplierPayments",
        reference: "SupplierPaymentsPage",
      },
    ],
  },
  {
    icon: "finance",
    label: "Finance", labelKey: "nav.finance",
    items: [
      {
        href: "/dashboard/finance",
        label: "Overview", labelKey: "nav.overview",
        reference: "FinanceOverviewPage",
      },
      {
        href: "/dashboard/finance/income",
        label: "Income", labelKey: "nav.income",
        reference: "FinanceIncomePage",
      },
      {
        href: "/dashboard/finance/expenses",
        label: "Expenses", labelKey: "nav.expenses",
        reference: "FinanceExpensesPage",
      },
      {
        href: "/dashboard/finance/cashflow",
        label: "Cash Flow", labelKey: "nav.cashFlow",
        reference: "FinanceCashFlowPage",
      },
      {
        href: "/dashboard/finance/ledger",
        label: "Ledger", labelKey: "nav.ledger",
        reference: "FinanceLedgerPage",
      },
      {
        href: "/dashboard/finance/tax",
        label: "Tax Management",
        reference: "FinanceTaxPage",
      },
    ],
  },
  {
    icon: "reports",
    label: "Reports", labelKey: "nav.reports",
    items: [
      {
        href: "/dashboard/reports",
        label: "Reports Overview", labelKey: "nav.reportsOverview",
        reference: "ReportsOverviewPage",
      },
      {
        href: "/dashboard/reports/sales",
        label: "Sales Reports", labelKey: "nav.salesReports",
        reference: "ReportsSalesPage",
      },
      {
        href: "/dashboard/reports/purchasing",
        label: "Purchasing Reports", labelKey: "nav.purchasingReports",
        reference: "ReportsPurchasingPage",
      },
      {
        href: "/dashboard/reports/inventory",
        label: "Inventory Reports", labelKey: "nav.inventoryReports",
        reference: "ReportsInventoryPage",
      },
      {
        href: "/dashboard/reports/financial",
        label: "Financial Reports", labelKey: "nav.financialReports",
        reference: "ReportsFinancialPage",
      },
    ],
  },
  {
    icon: "staff",
    label: "Staff", labelKey: "nav.staff",
    items: [
      { href: "/dashboard/staff", label: "All Staff", labelKey: "nav.allStaff", reference: "StaffPage" },
      {
        href: "/dashboard/staff/roles",
        label: "Roles & Permissions", labelKey: "nav.rolesPermissions",
        reference: "StaffRolesPermissionsPage",
      },
      {
        href: "/dashboard/staff/logs",
        label: "Activity Logs", labelKey: "nav.activityLogs",
        reference: "StaffActivityLogsPage",
      },
    ],
  },
  {
    icon: "settings",
    label: "Settings", labelKey: "nav.settings",
    items: [
      {
        href: "/dashboard/settings",
        label: "Settings Overview", labelKey: "nav.settingsOverview",
        reference: "SettingsOverviewPage",
      },
      {
        href: "/dashboard/settings/business",
        label: "Business Profile", labelKey: "nav.businessProfile",
        reference: "SettingsBusinessProfilePage",
      },
      {
        href: "/dashboard/settings/merchant-wallets",
        label: "Merchant Wallets",
        reference: "SettingsMerchantWalletsPage",
      },
      {
        href: "/dashboard/settings/receipt",
        label: "Receipt Settings", labelKey: "nav.receiptSettings",
        reference: "SettingsReceiptPage",
      },
      {
        href: "/dashboard/settings/tax",
        label: "Tax Configuration", labelKey: "nav.taxConfiguration",
        reference: "SettingsTaxConfigurationPage",
      },
      {
        href: "/dashboard/settings/backup",
        label: "Backup & Restore", labelKey: "nav.backupRestore",
        reference: "SettingsBackupRestorePage",
      },
      {
        href: "/dashboard/settings/accounting-periods",
        label: "Accounting Periods", labelKey: "nav.accountingPeriods",
        reference: "SettingsAccountingPeriodsPage",
      },
      {
        href: "/dashboard/settings/language",
        label: "Language", labelKey: "nav.language",
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

/**
 * Header title of each desktop page (the `label` its <SiteHeader> receives in
 * desktop src/app/dashboard/<Page>.tsx). It can differ from the menu label,
 * e.g. the New Sale menu item opens "Point of Sale". A literal `label` is used
 * where the desktop also shows untranslated text.
 */
export const desktopPageHeaders: Record<string, { key: TranslationKey } | { label: string }> = {
  AccountPage: { key: "account.profile" },
  AnalyticsPage: { key: "nav.businessInsights" },
  CreditOrdersPage: { key: "creditOrders.title" },
  CustomerCreditManagementPage: { key: "creditUi.title" },
  CustomerPurchaseHistoryPage: { key: "purchaseUi.title" },
  CustomersPage: { key: "customers.title" },
  DashboardPage: { key: "dashboard.title" },
  FinanceCashFlowPage: { key: "finance.cashflow.title" },
  FinanceExpensesPage: { label: "Expenses" },
  FinanceIncomePage: { key: "finance.income" },
  FinanceLedgerPage: { key: "finance.ledger.title" },
  FinanceOverviewPage: { key: "nav.finance" },
  FinanceTaxPage: { label: "Tax Management" },
  InventoryLowStockAlertsPage: { key: "stockAlerts.title" },
  InventoryPage: { key: "inventory.title" },
  InventoryStockAdjustmentPage: { key: "inventory.adjustment" },
  InventoryStockHistoryPage: { key: "inventory.history" },
  POSPage: { key: "pos.title" },
  ProductCategoriesPage: { key: "categories.tableTitle" },
  ProductsPage: { key: "products.management" },
  ReportsFinancialPage: { key: "nav.financialReports" },
  ReportsInventoryPage: { key: "nav.inventoryReports" },
  ReportsOverviewPage: { key: "reports.overview" },
  ReportsPurchasingPage: { key: "nav.purchasingReports" },
  ReportsSalesPage: { key: "nav.salesReports" },
  SalesHistoryPage: { key: "sales.history" },
  SettingsAccountingPeriodsPage: { key: "settings.periods.title" },
  SettingsBackupRestorePage: { label: "Backup, Restore & Sync" },
  SettingsBusinessProfilePage: { key: "nav.businessProfile" },
  SettingsLanguagePage: { key: "settings.language.title" },
  SettingsMerchantWalletsPage: { key: "wallets.title" },
  SettingsOverviewPage: { key: "nav.settingsOverview" },
  SettingsReceiptPage: { key: "nav.receiptSettings" },
  SettingsTaxConfigurationPage: { key: "taxSettings.title" },
  StaffActivityLogsPage: { key: "nav.activityLogs" },
  StaffPage: { key: "staff.management" },
  StaffRolesPermissionsPage: { key: "roles.title" },
  SupplierPaymentsPage: { label: "Supplier Payments" },
  SupplierPurchaseOrdersPage: { label: "Purchase Orders" },
  SuppliersPage: { key: "suppliers.title" },
};
