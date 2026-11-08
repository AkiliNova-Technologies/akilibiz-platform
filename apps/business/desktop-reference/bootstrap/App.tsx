import { Route, Routes, useNavigate, Navigate } from "react-router-dom";
import DashboardLayout from "@/layout/DashboardLayout";
import AuthLayout from "@/layout/AuthLayout";
import { Toaster } from "@/components/ui/sonner";

import DashboardPage from "@/app/dashboard/DashboardPage";
import POSPage from "@/app/dashboard/POSPage";
import SalesHistoryPage from "@/app/dashboard/SalesHistoryPage";
import CreditOrdersPage from "@/app/dashboard/CreditOrdersPage";
import ProductsPage from "@/app/dashboard/ProductsPage";
import ProductCategoriesPage from "@/app/dashboard/ProductCategoriesPage";
import InventoryPage from "@/app/dashboard/InventoryPage";
import InventoryStockAdjustmentPage from "@/app/dashboard/InventoryStockAdjustmentPage";
import InventoryLowStockAlertsPage from "@/app/dashboard/InventoryLowStockAlertsPage";
import InventoryStockHistoryPage from "@/app/dashboard/InventoryStockHistoryPage";
import CustomersPage from "@/app/dashboard/CustomersPage";
import CustomerCreditManagementPage from "./app/dashboard/CustomerCreditManagementPage";
import CustomerPurchaseHistoryPage from "@/app/dashboard/CustomerPurchaseHistoryPage";
import SuppliersPage from "@/app/dashboard/SuppliersPage";
import SupplierPurchaseOrdersPage from "@/app/dashboard/SupplierPurchaseOrdersPage";
import SupplierPaymentsPage from "@/app/dashboard/SupplierPaymentsPage";
import FinanceOverviewPage from "@/app/dashboard/FinanceOverviewPage";
import FinanceExpensesPage from "@/app/dashboard/FinanceExpensesPage";
import FinanceIncomePage from "@/app/dashboard/FinanceIncomePage";
import StaffPage from "@/app/dashboard/StaffPage";
import AccountProfilePage from "@/app/dashboard/AccountPage";
import LoginPage from "@/app/auth/LoginPage";

import "./index.css";
import FinanceCashFlowPage from "./app/dashboard/FinanceCashFlowPage";
import FinanceLedgerPage from "./app/dashboard/FinanceLedgerPage";
import ReportsOverviewPage from "./app/dashboard/ReportsOverviewPage";
import ReportsSalesPage from "./app/dashboard/ReportsSalesPage";
import ReportsInventoryPage from "./app/dashboard/ReportsInventoryPage";
import ReportsFinancialPage from "./app/dashboard/ReportsFinancialPage";
import ReportsPurchasingPage from "./app/dashboard/ReportsPurchasingPage";
import StaffRolesPermissionsPage from "./app/dashboard/StaffRolesPermissionsPage";
import StaffActivityLogsPage from "./app/dashboard/StaffActivityLogsPage";
import SettingsOverviewPage from "./app/dashboard/SettingsOverviewPage";
import SettingsBusinessProfilePage from "./app/dashboard/SettingsBusinessProfilePage";
import SettingsReceiptPage from "./app/dashboard/SettingsReceiptPage";
import SettingsTaxConfigurationPage from "./app/dashboard/SettingsTaxConfigurationPage";
import SettingsBackupRestorePage from "./app/dashboard/SettingsBackupRestorePage";
import SettingsLanguagePage from "./app/dashboard/SettingsLanguagePage";
import AnalyticsPage from "./app/dashboard/AnalyticsPage";
import SettingsAccountingPeriodsPage from "./app/dashboard/SettingsAccountingPeriodsPage";

import { useEffect, useState } from "react";
import { useReduxAuth } from "./hooks/useReduxAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ModuleGuard } from "./components/module-guard";

import { useReduxOnboarding } from "@/hooks/useReduxOnboarding";
import { useI18n } from "@/hooks/useI18n";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { UpdateDialog } from "@/components/system/update-dialog";

function App() {
  const { checkAuth } = useReduxAuth();
  const { t } = useI18n();
  const { showOnboarding, checkStatus } = useReduxOnboarding();
  const [appReady, setAppReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      await checkStatus();
      await checkAuth();
      setAppReady(true);
    };
    init();
  }, [checkAuth, checkStatus]);

  useEffect(() => {
    if (appReady && showOnboarding) {
      navigate("/onboarding", { replace: true });
    }
  }, [appReady, showOnboarding, navigate]);

  if (!appReady) {
    return (
      <div className="min-h-screen bg-[#F4F5F9] dark:bg-[#121212] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 size-16 rounded-2xl bg-white dark:bg-[#323232] shadow-sm border border-border/40 flex items-center justify-center">
            <img
              src="/icon.png"
              alt="AkiliBiz"
              className="size-10 object-cover rounded-xl"
            />
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">{t("app.preparingWorkspace")}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-0">
      <UpdateDialog />
      <Routes>
        <Route path="/onboarding" element={<OnboardingFlow />} />
        
        <Route path="/" element={<AuthLayout />}>
          <Route index element={<LoginPage />} />
        </Route>

        {/* Dashboard routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              <ModuleGuard permission="dashboard.view">
                <DashboardPage />
              </ModuleGuard>
            }
          />

          <Route
            path="pos/new-sale"
            element={
              <ModuleGuard permission="pos.create_sale">
                <POSPage />
              </ModuleGuard>
            }
          />
          <Route
            path="pos/credit"
            element={
              <ModuleGuard permission="pos.credit_sale">
                <CreditOrdersPage />
              </ModuleGuard>
            }
          />
          <Route
            path="pos/history"
            element={
              <ModuleGuard permission="pos.view_sales">
                <SalesHistoryPage />
              </ModuleGuard>
            }
          />

          <Route
            path="customers"
            element={
              <ModuleGuard permission="customers.view">
                <CustomersPage />
              </ModuleGuard>
            }
          />
          <Route
            path="customers/credit"
            element={
              <ModuleGuard permission="customers.view">
                <CustomerCreditManagementPage />
              </ModuleGuard>
            }
          />
          <Route
            path="customers/history"
            element={
              <ModuleGuard permission="customers.view">
                <CustomerPurchaseHistoryPage />
              </ModuleGuard>
            }
          />

          <Route
            path="products"
            element={
              <ModuleGuard permission="products.view">
                <ProductsPage />
              </ModuleGuard>
            }
          />
          <Route
            path="products/categories"
            element={
              <ModuleGuard permission="categories.view">
                <ProductCategoriesPage />
              </ModuleGuard>
            }
          />

          <Route
            path="inventory"
            element={
              <ModuleGuard permission="inventory.view">
                <InventoryPage />
              </ModuleGuard>
            }
          />
          <Route
            path="inventory/adjustment"
            element={
              <ModuleGuard permission="inventory.adjust">
                <InventoryStockAdjustmentPage />
              </ModuleGuard>
            }
          />
          <Route
            path="inventory/alerts"
            element={
              <ModuleGuard permission="inventory.view">
                <InventoryLowStockAlertsPage />
              </ModuleGuard>
            }
          />
          <Route
            path="inventory/history"
            element={
              <ModuleGuard permission="inventory.view">
                <InventoryStockHistoryPage />
              </ModuleGuard>
            }
          />

          <Route
            path="suppliers"
            element={
              <ModuleGuard permission="suppliers.view">
                <SuppliersPage />
              </ModuleGuard>
            }
          />
          <Route
            path="suppliers/orders"
            element={
              <ModuleGuard permission="purchase_orders.view">
                <SupplierPurchaseOrdersPage />
              </ModuleGuard>
            }
          />
          <Route
            path="suppliers/payments"
            element={
              <ModuleGuard permission="supplier_payments.view">
                <SupplierPaymentsPage />
              </ModuleGuard>
            }
          />

          <Route
            path="finance"
            element={
              <ModuleGuard permission="finance.view">
                <FinanceOverviewPage />
              </ModuleGuard>
            }
          />
          <Route
            path="finance/income"
            element={
              <ModuleGuard permission="finance.view">
                <FinanceIncomePage />
              </ModuleGuard>
            }
          />
          <Route
            path="finance/expenses"
            element={
              <ModuleGuard permission="finance.view">
                <FinanceExpensesPage />
              </ModuleGuard>
            }
          />
          <Route
            path="finance/cashflow"
            element={
              <ModuleGuard permission="finance.view">
                <FinanceCashFlowPage />
              </ModuleGuard>
            }
          />
          <Route
            path="finance/ledger"
            element={
              <ModuleGuard permission="finance.view">
                <FinanceLedgerPage />
              </ModuleGuard>
            }
          />

          <Route
            path="reports"
            element={
              <ModuleGuard permission="reports.view">
                <ReportsOverviewPage />
              </ModuleGuard>
            }
          />
          <Route
            path="analytics"
            element={
              <ModuleGuard permission="reports.view">
                <AnalyticsPage />
              </ModuleGuard>
            }
          />
          <Route
            path="reports/sales"
            element={
              <ModuleGuard permission="reports.view">
                <ReportsSalesPage />
              </ModuleGuard>
            }
          />
          <Route
            path="reports/inventory"
            element={
              <ModuleGuard permission="reports.view">
                <ReportsInventoryPage />
              </ModuleGuard>
            }
          />
          <Route
            path="reports/financial"
            element={
              <ModuleGuard permission="reports.view">
                <ReportsFinancialPage />
              </ModuleGuard>
            }
          />
          <Route
            path="reports/purchasing"
            element={
              <ModuleGuard permission="reports.view">
                <ReportsPurchasingPage />
              </ModuleGuard>
            }
          />

          <Route
            path="staff"
            element={
              <ModuleGuard permission="staff.view">
                <StaffPage />
              </ModuleGuard>
            }
          />
          <Route
            path="staff/roles"
            element={
              <ModuleGuard permission="roles.view">
                <StaffRolesPermissionsPage />
              </ModuleGuard>
            }
          />
          <Route
            path="staff/logs"
            element={
              <ModuleGuard permission="activity_logs.view">
                <StaffActivityLogsPage />
              </ModuleGuard>
            }
          />

          <Route
            path="settings"
            element={
              <ModuleGuard permission="settings.view">
                <SettingsOverviewPage />
              </ModuleGuard>
            }
          />
          <Route
            path="settings/business"
            element={
              <ModuleGuard permission="settings.view">
                <SettingsBusinessProfilePage />
              </ModuleGuard>
            }
          />
          <Route
            path="settings/receipt"
            element={
              <ModuleGuard permission="settings.view">
                <SettingsReceiptPage />
              </ModuleGuard>
            }
          />
          <Route
            path="settings/tax"
            element={
              <ModuleGuard permission="settings.view">
                <SettingsTaxConfigurationPage />
              </ModuleGuard>
            }
          />
          <Route
            path="settings/backup"
            element={
              <ModuleGuard permission="backup.create">
                <SettingsBackupRestorePage />
              </ModuleGuard>
            }
          />
          <Route path="settings/language" element={<ModuleGuard permission="settings.view"><SettingsLanguagePage /></ModuleGuard>} />
          <Route path="settings/accounting-periods" element={<ModuleGuard permission="finance.view"><SettingsAccountingPeriodsPage /></ModuleGuard>} />

          <Route
            path="account"
            element={
              <ModuleGuard permission="dashboard.view">
                <AccountProfilePage />
              </ModuleGuard>
            }
          />
        </Route>

        {/* Catch-all: redirect based on onboarding state */}
        <Route path="*" element={
          showOnboarding ? <Navigate to="/onboarding" replace /> : <Navigate to="/" replace />
        } />
      </Routes>

      <Toaster
        position="top-right"
        expand={false}
        duration={3000}
        visibleToasts={1}
        offset={16}
      />
    </main>
  );
}

export default App;
