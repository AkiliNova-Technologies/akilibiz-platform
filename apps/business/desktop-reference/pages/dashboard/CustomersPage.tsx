import { useEffect, useMemo, useState } from "react";
import {
  DataTable,
  type TableField,
  type TableAction,
  type TableData,
} from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  IconUsers,
  IconUserPlus,
  IconStar,
  IconShoppingBag,
  IconWallet,
  IconCash,
  IconPlus,
  IconMail,
  IconPhone,
  IconMapPin,
  IconReceipt,
  IconCalendarStats,
  IconUpload,
  IconDownload,
} from "@tabler/icons-react";
import MetricCard from "@/components/metric-card";
import { useReduxCustomers } from "@/hooks/useReduxCustomers";
import type {
  CustomerResponse,
  CustomerPurchaseHistoryRow,
} from "@/services/tauri/customers";
import { CustomerSheet } from "@/components/customer-sheet";
import { ImportDialog } from "@/components/ImportDialog";
import { ExportDialog } from "@/components/ExportDialog";
import { useI18n } from "@/hooks/useI18n";
import {
  formatCurrency as formatDisplayCurrency,
  formatDate as formatDisplayDate,
} from "@/i18n";

const formatCurrency = formatDisplayCurrency;

interface CustomerRow extends TableData {
  id: number;
  name: string;
  email: string;
  phone: string;
  total_purchases: number;
  total_spent: number;
  loyalty_points: number;
  loyalty_tier: "Standard" | "Silver" | "Gold" | "Platinum";
  last_visit: string;
  status: "Active" | "Inactive";
  credit_balance: number;
  customer: CustomerResponse;
}

interface PurchaseHistoryTableRow extends TableData {
  sale_id: number;
  customer_name: string;
  phone: string;
  invoice_number: string;
  purchase_date: string;
  items_count: number;
  total_amount: number;
  payment_method: "cash" | "card" | "mobile_money" | "split";
  cashier: string;
  status: "completed" | "refunded" | "cancelled";
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return formatDisplayDate(date);
}

function getPaymentBadge(method: string) {
  switch (method) {
    case "cash":
      return <Badge variant="outline">Cash</Badge>;
    case "card":
      return <Badge variant="outline">Card</Badge>;
    case "mobile_money":
      return <Badge variant="outline">Mobile Money</Badge>;
    case "split":
      return <Badge variant="outline">Split</Badge>;
    default:
      return <Badge variant="outline">{method}</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return <Badge variant="outline">Completed</Badge>;
    case "refunded":
      return <Badge variant="outline">Refunded</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function CustomersPage() {
  const { t } = useI18n();
  const {
    customers,
    summary,
    purchaseHistory,
    loading,
    getCustomers,
    getCustomerSummary,
    getPurchaseHistory,
  } = useReduxCustomers();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerResponse | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedHistoryRow, setSelectedHistoryRow] =
    useState<PurchaseHistoryTableRow | null>(null);
  const [historyDetailsOpen, setHistoryDetailsOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  useEffect(() => {
    void Promise.all([getCustomers(), getCustomerSummary()]);
  }, [getCustomers, getCustomerSummary]);

  const customerRows = useMemo<CustomerRow[]>(() => {
    return customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email || "—",
      phone: customer.phone || "—",
      total_purchases: customer.total_purchases,
      total_spent: customer.total_spent,
      loyalty_points: customer.loyalty_points,
      loyalty_tier: customer.loyalty_tier,
      last_visit: customer.last_visit || "",
      status: customer.is_active ? "Active" : "Inactive",
      credit_balance: customer.outstanding_balance || 0,
      customer,
    }));
  }, [customers]);

  const historyRows = useMemo<PurchaseHistoryTableRow[]>(() => {
    return purchaseHistory.map((item: CustomerPurchaseHistoryRow) => ({
      id: item.sale_id,
      sale_id: item.sale_id,
      customer_name: item.customer_name,
      phone: item.phone || "—",
      invoice_number: item.invoice_number,
      purchase_date: item.purchase_date,
      items_count: item.items_count,
      total_amount: item.total_amount,
      payment_method: item.payment_method,
      cashier: item.cashier,
      status: item.status,
    }));
  }, [purchaseHistory]);

  const totalCustomers = summary?.total_customers ?? customerRows.length;
  const activeCustomers =
    summary?.active_customers ??
    customerRows.filter((c) => c.status === "Active").length;
  const newCustomersThisMonth = summary?.new_customers_this_month ?? 0;
  const loyaltyCustomers =
    summary?.loyalty_customers ??
    customerRows.filter((c) => c.loyalty_points > 0).length;
  const creditCustomers =
    summary?.credit_customers ??
    customerRows.filter((c) => c.credit_balance > 0).length;
  const totalCreditOutstanding =
    summary?.total_credit_outstanding ??
    customerRows.reduce((sum, c) => sum + c.credit_balance, 0);
  const avgLifetimeValue =
    summary?.average_customer_value ??
    (customerRows.length > 0
      ? customerRows.reduce((sum, c) => sum + c.total_spent, 0) /
        customerRows.length
      : 0);

  const historyTotalPurchases = historyRows.length;
  const historyTotalSpent = historyRows
    .filter((row) => row.status === "completed")
    .reduce((sum, row) => sum + row.total_amount, 0);
  const historyAvgPurchaseValue =
    historyRows.length > 0 ? historyTotalSpent / historyRows.length : 0;

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsEdit(false);
    setSheetOpen(true);
  };

  const handleEditCustomer = (row: CustomerRow) => {
    setSelectedCustomer(row.customer);
    setIsEdit(true);
    setSheetOpen(true);
  };

  const handleViewCustomer = (row: CustomerRow) => {
    setSelectedCustomer(row.customer);
    setViewOpen(true);
  };

  const handleViewHistory = async (row: CustomerRow) => {
    setSelectedCustomer(row.customer);
    await getPurchaseHistory(row.id);
    setHistoryOpen(true);
  };

  const customerFields: TableField<CustomerRow>[] = [
    {
      key: "name",
      header: t("customers.name"),
      enableSorting: true,
    },
    {
      key: "email",
      header: t("customers.email"),
      align: "center",
    },
    {
      key: "phone",
      header: t("customers.phone"),
      align: "center",
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "total_purchases",
      header: t("customers.purchases"),
      align: "center",
      enableSorting: true,
      cell: (value) => <Badge variant="outline">{Number(value)}</Badge>,
    },
    {
      key: "total_spent",
      header: t("customers.totalSpent"),
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-semibold">
          {formatDisplayCurrency(Number(value))}
        </span>
      ),
    },
    {
      key: "loyalty_points",
      header: t("customers.points"),
      align: "center",
      enableSorting: true,
      cell: (value) => <span className="font-mono">{Number(value)}</span>,
    },
    {
      key: "loyalty_tier",
      header: t("customers.tier"),
      align: "center",
      cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
    {
      key: "credit_balance",
      header: t("customers.creditBalance"),
      align: "right",
      enableSorting: true,
      cell: (value) => {
        const credit = Number(value || 0);
        return credit > 0 ? (
          <span className="font-medium">{formatDisplayCurrency(credit)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      key: "last_visit",
      header: t("customers.lastVisit"),
      align: "center",
      enableSorting: true,
      cell: (value) => {
        if (!value) {
          return <span className="text-sm text-muted-foreground">—</span>;
        }

        const date = new Date(String(value));
        return (
          <span className="text-sm text-muted-foreground">
            {date.toLocaleDateString("en-UG", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        );
      },
    },
    {
      key: "status",
      header: t("sales.status"),
      align: "center",
      cell: (value) => (
        <Badge variant={String(value) === "Active" ? "outline" : "secondary"}>
          {String(value)}
        </Badge>
      ),
    },
  ];

  const historyFields: TableField<PurchaseHistoryTableRow>[] = [
    {
      key: "invoice_number",
      header: t("sales.invoice"),
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "purchase_date",
      header: t("customers.purchaseDate"),
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(String(value))}
        </span>
      ),
    },
    {
      key: "items_count",
      header: t("customers.items"),
      align: "center",
      enableSorting: true,
      cell: (value) => <Badge variant="outline">{Number(value)}</Badge>,
    },
    {
      key: "total_amount",
      header: t("customers.totalAmount"),
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-semibold">{formatCurrency(Number(value))}</span>
      ),
    },
    {
      key: "payment_method",
      header: t("customers.payment"),
      align: "center",
      cell: (value) => getPaymentBadge(String(value)),
    },
    {
      key: "cashier",
      header: t("customers.cashier"),
      align: "center",
    },
    {
      key: "status",
      header: t("sales.status"),
      align: "center",
      cell: (value) => getStatusBadge(String(value)),
    },
  ];

  const customerActions: TableAction<CustomerRow>[] = [
    {
      type: "view",
      label: t("customers.viewProfile"),
      onClick: handleViewCustomer,
    },
    {
      type: "edit",
      label: t("customers.edit"),
      onClick: handleEditCustomer,
    },
    {
      type: "custom",
      label: t("customers.history"),
      icon: <IconShoppingBag className="size-4" />,
      onClick: handleViewHistory,
    },
  ];

  const historyActions: TableAction<PurchaseHistoryTableRow>[] = [
    {
      type: "view",
      label: t("customers.viewPurchase"),
      onClick: (row) => {
        setSelectedHistoryRow(row);
        setHistoryDetailsOpen(true);
      },
    },
    {
      type: "custom",
      label: t("customers.viewReceipt"),
      icon: <IconReceipt className="size-4" />,
      onClick: (row) => {
        console.log("View receipt:", row.sale_id);
      },
    },
  ];

  return (
    <>
      <SiteHeader label={t("customers.title")} />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("customers.directory")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("customers.description")}
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title={t("customers.total")}
              value={String(totalCustomers)}
              description={`${activeCustomers} active customers`}
              icon={<IconUsers className="size-5" />}
            />

            <MetricCard
              title={t("customers.newThisMonth")}
              value={String(newCustomersThisMonth)}
              description={t("customers.recentlyAcquired")}
              icon={<IconUserPlus className="size-5" />}
            />

            <MetricCard
              title={t("customers.loyaltyMembers")}
              value={String(loyaltyCustomers)}
              description={t("customers.rewardEngagement")}
              icon={<IconStar className="size-5" />}
            />

            <MetricCard
              title={t("customers.averageValue")}
              value={formatCurrency(avgLifetimeValue)}
              description={t("customers.averageValueDescription")}
              icon={<IconCash className="size-5" />}
            />
          </section>

          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-2">
            <MetricCard
              title={t("customers.credit")}
              value={String(creditCustomers)}
              description="Customers currently holding unpaid balances"
              icon={<IconWallet className="size-5" />}
            />

            <MetricCard
              title={t("customers.outstandingCredit")}
              value={formatCurrency(totalCreditOutstanding)}
              description={t("customers.unpaidBalances")}
              icon={<IconCash className="size-5" />}
            />
          </section>

          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<CustomerRow>
                title={t("customers.directory")}
                description={t("customers.directoryDescription")}
                data={customerRows}
                fields={customerFields}
                actions={customerActions}
                enableGlobalSearch
                searchPlaceholder={t("customers.search")}
                pageSize={10}
                onRowClick={handleViewCustomer}
                emptyMessage={
                  loading ? t("customers.loading") : t("customers.empty")
                }
                toolbarActions={
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setImportDialogOpen(true)}>
                      <IconUpload className="mr-2 size-4" />
                      {t("customers.import")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setExportDialogOpen(true)}>
                      <IconDownload className="mr-2 size-4" />
                      {t("customers.export")}
                    </Button>
                    <Button onClick={handleAddCustomer}>
                      <IconPlus className="mr-2 size-4" />
                      {t("customers.add")}
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <CustomerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        isEdit={isEdit}
        initialData={selectedCustomer}
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        importType="customers"
        onImportComplete={getCustomers}
      />
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        exportType="customers"
      />

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("customers.profile")}</DialogTitle>
            <DialogDescription>
              {t("customers.profileDescription")}
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {selectedCustomer.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {selectedCustomer.customer_type}
                        </Badge>
                        <Badge
                          variant={
                            selectedCustomer.is_active ? "outline" : "secondary"
                          }>
                          {selectedCustomer.is_active
                            ? t("common.active")
                            : t("common.inactive")}
                        </Badge>
                        <Badge variant="outline">
                          {selectedCustomer.loyalty_tier}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {t("customers.customerId")}: {selectedCustomer.id}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="flex items-center gap-2 text-sm">
                      <IconMail className="size-4 text-muted-foreground" />
                      <span>
                        {selectedCustomer.email || t("customers.noEmail")}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <IconPhone className="size-4 text-muted-foreground" />
                      <span>
                        {selectedCustomer.phone || t("customers.noPhone")}
                      </span>
                    </div>

                    <div className="flex items-start gap-2 text-sm md:col-span-2">
                      <IconMapPin className="mt-0.5 size-4 text-muted-foreground" />
                      <span>
                        {selectedCustomer.address || t("customers.noAddress")}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("customers.purchases")}
                      </span>
                      <span className="font-medium">
                        {selectedCustomer.total_purchases}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("customers.totalSpent")}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(selectedCustomer.total_spent)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("customers.points")}
                      </span>
                      <span className="font-medium">
                        {selectedCustomer.loyalty_points}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("customers.creditLimit")}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(selectedCustomer.credit_limit)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("customers.openingBalance")}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(selectedCustomer.opening_balance)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t("customers.outstandingBalance")}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(selectedCustomer.outstanding_balance)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm md:col-span-2">
                      <span className="text-muted-foreground">
                        {t("customers.lastVisit")}
                      </span>
                      <span className="font-medium">
                        {formatDate(selectedCustomer.last_visit)}
                      </span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setViewOpen(false);
                        setIsEdit(true);
                        setSheetOpen(true);
                      }}>
                      {t("customers.edit")}
                    </Button>

                    <Button
                      className="flex-1"
                      onClick={async () => {
                        setViewOpen(false);
                        if (!selectedCustomer) return;
                        await getPurchaseHistory(selectedCustomer.id);
                        setHistoryOpen(true);
                      }}>
                      <IconShoppingBag className="mr-2 size-4" />
                      {t("customers.history")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer?.name || t("pos.customer")}{" "}
              {t("customers.history")}
            </DialogTitle>
            <DialogDescription>
              {t("customers.purchaseHistoryDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard
                title={t("customers.purchases")}
                value={String(historyTotalPurchases)}
                description={t("customers.transactionsDescription")}
                icon={<IconShoppingBag className="size-5" />}
              />

              <MetricCard
                title={t("customers.totalRevenue")}
                value={formatCurrency(historyTotalSpent)}
                description={t("customers.totalRevenueDescription")}
                icon={<IconCash className="size-5" />}
              />

              <MetricCard
                title={t("customers.averagePurchaseValue")}
                value={formatCurrency(historyAvgPurchaseValue)}
                description={t("customers.averagePurchaseDescription")}
                icon={<IconCalendarStats className="size-5" />}
              />
            </section>

            <Card>
              <CardContent className="px-6 pb-6">
                <DataTable<PurchaseHistoryTableRow>
                  title={t("customers.transactions")}
                  description={t("customers.transactionsDescription")}
                  data={historyRows}
                  fields={historyFields}
                  actions={historyActions}
                  enableGlobalSearch
                  searchPlaceholder={t("customers.searchPurchases")}
                  pageSize={8}
                  onRowClick={(row) => {
                    setSelectedHistoryRow(row);
                    setHistoryDetailsOpen(true);
                  }}
                  emptyMessage={
                    loading
                      ? t("customers.loadingHistory")
                      : t("customers.emptyHistory")
                  }
                />
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyDetailsOpen} onOpenChange={setHistoryDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("customers.purchaseDetails")}</DialogTitle>
            <DialogDescription>
              {t("customers.purchaseDetailsDescription")}
            </DialogDescription>
          </DialogHeader>

          {selectedHistoryRow && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 px-4 py-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("pos.customer")}
                    </span>
                    <span className="font-medium">
                      {selectedHistoryRow.customer_name}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("customers.phone")}
                    </span>
                    <span className="font-medium">
                      {selectedHistoryRow.phone}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("sales.invoice")}
                    </span>
                    <span className="font-medium">
                      {selectedHistoryRow.invoice_number}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("customers.purchaseDate")}
                    </span>
                    <span className="font-medium">
                      {formatDate(selectedHistoryRow.purchase_date)}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("customers.items")}
                    </span>
                    <span className="font-medium">
                      {selectedHistoryRow.items_count}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("sales.paymentMethod")}
                    </span>
                    {getPaymentBadge(selectedHistoryRow.payment_method)}
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("customers.cashier")}
                    </span>
                    <span className="font-medium">
                      {selectedHistoryRow.cashier}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("sales.status")}
                    </span>
                    {getStatusBadge(selectedHistoryRow.status)}
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <span className="font-semibold">
                      {t("customers.totalAmount")}
                    </span>
                    <span className="text-lg font-bold">
                      {formatCurrency(selectedHistoryRow.total_amount)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <IconReceipt className="mr-2 size-4" />
                  View Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
