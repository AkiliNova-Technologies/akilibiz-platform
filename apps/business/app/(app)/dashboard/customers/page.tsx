"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Download,
  Mail,
  MapPin,
  Plus,
  ReceiptText,
  ShoppingBag,
  Star,
  Upload,
  UserPlus,
  Users,
  WalletCards,
  Banknote,
} from "lucide-react";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CustomerSheet } from "@/components/akilibiz/customers/customer-sheet";
import {
  CustomerExportDialog,
  CustomerImportDialog,
} from "@/components/akilibiz/customers/customer-transfer-dialogs";
import {
  type CustomerPurchaseHistoryRow,
  type CustomerResponse,
  formatCurrency,
  t,
  useCustomersData,
} from "@/components/akilibiz/customers/customers-data";

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
interface PurchaseRow extends TableData {
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
const date = (value?: string | null) =>
  value && !Number.isNaN(new Date(value).getTime())
    ? new Date(value).toLocaleDateString("en-UG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";
const paymentBadge = (method: string) => (
  <Badge variant="outline">
    {method === "mobile_money"
      ? "Mobile Money"
      : method[0]?.toUpperCase() + method.slice(1)}
  </Badge>
);
const statusBadge = (status: string) => (
  <Badge variant={status === "cancelled" ? "destructive" : "outline"}>
    {status[0]?.toUpperCase() + status.slice(1)}
  </Badge>
);

export default function CustomersPage() {
  const {
    customers,
    summary,
    loading,
    getCustomers,
    getCustomerSummary,
    getPurchaseHistory,
  } = useCustomersData();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerResponse | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<CustomerPurchaseHistoryRow[]>([]);
  const [selectedHistoryRow, setSelectedHistoryRow] =
    useState<PurchaseRow | null>(null);
  const [historyDetailsOpen, setHistoryDetailsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  useEffect(() => {
    void Promise.all([getCustomers(), getCustomerSummary()]);
  }, [getCustomers, getCustomerSummary]);
  const rows = useMemo<CustomerRow[]>(
    () =>
      customers.map((customer) => ({
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
      })),
    [customers],
  );
  const historyRows = useMemo<PurchaseRow[]>(
    () =>
      history.map((item) => ({
        id: item.sale_id,
        ...item,
        phone: item.phone || "—",
      })),
    [history],
  );
  const totalCustomers = summary?.total_customers ?? rows.length;
  const active =
    summary?.active_customers ??
    rows.filter((item) => item.status === "Active").length;
  const newThisMonth = summary?.new_customers_this_month ?? 0;
  const loyalty =
    summary?.loyalty_customers ??
    rows.filter((item) => item.loyalty_points > 0).length;
  const credit =
    summary?.credit_customers ??
    rows.filter((item) => item.credit_balance > 0).length;
  const outstanding =
    summary?.total_credit_outstanding ??
    rows.reduce((sum, item) => sum + item.credit_balance, 0);
  const average =
    summary?.average_customer_value ??
    rows.reduce((sum, item) => sum + item.total_spent, 0) /
      Math.max(rows.length, 1);
  const completeHistory = historyRows.filter(
    (item) => item.status === "completed",
  );
  const totalHistorySpent = completeHistory.reduce(
    (sum, item) => sum + item.total_amount,
    0,
  );
  const viewHistory = async (row: CustomerRow) => {
    setSelectedCustomer(row.customer);
    setHistory(await getPurchaseHistory(row.id));
    setHistoryOpen(true);
  };
  const fields: TableField<CustomerRow>[] = [
    { key: "name", header: t("customers.name"), enableSorting: true },
    { key: "email", header: t("customers.email"), align: "center" },
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
        <span className="font-semibold">{formatCurrency(Number(value))}</span>
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
      cell: (value) =>
        Number(value) > 0 ? (
          <span className="font-medium">{formatCurrency(Number(value))}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "last_visit",
      header: t("customers.lastVisit"),
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {date(String(value))}
        </span>
      ),
    },
    {
      key: "status",
      header: t("sales.status"),
      align: "center",
      cell: (value) => (
        <Badge variant={value === "Active" ? "outline" : "secondary"}>
          {String(value)}
        </Badge>
      ),
    },
  ];
  const historyFields: TableField<PurchaseRow>[] = [
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
          {date(String(value))}
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
      cell: (value) => paymentBadge(String(value)),
    },
    { key: "cashier", header: t("customers.cashier"), align: "center" },
    {
      key: "status",
      header: t("sales.status"),
      align: "center",
      cell: (value) => statusBadge(String(value)),
    },
  ];
  const actions: TableAction<CustomerRow>[] = [
    {
      type: "view",
      label: t("customers.viewProfile"),
      onClick: (row) => {
        setSelectedCustomer(row.customer);
        setViewOpen(true);
      },
    },
    {
      type: "edit",
      label: t("customers.edit"),
      onClick: (row) => {
        setSelectedCustomer(row.customer);
        setIsEdit(true);
        setSheetOpen(true);
      },
    },
    {
      type: "custom",
      label: t("customers.history"),
      icon: <ShoppingBag className="size-4" />,
      onClick: viewHistory,
    },
  ];
  const historyActions: TableAction<PurchaseRow>[] = [
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
      icon: <ReceiptText className="size-4" />,
      onClick: (row) => {
        setSelectedHistoryRow(row);
        setHistoryDetailsOpen(true);
      },
    },
  ];
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6">
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
              description={`${active} active customers`}
              icon={<Users className="size-5" />}
            />
            <MetricCard
              title={t("customers.newThisMonth")}
              value={String(newThisMonth)}
              description={t("customers.recentlyAcquired")}
              icon={<UserPlus className="size-5" />}
            />
            <MetricCard
              title={t("customers.loyaltyMembers")}
              value={String(loyalty)}
              description={t("customers.rewardEngagement")}
              icon={<Star className="size-5" />}
            />
            <MetricCard
              title={t("customers.averageValue")}
              value={formatCurrency(average)}
              description={t("customers.averageValueDescription")}
              icon={<Banknote className="size-5" />}
            />
          </section>
          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-2">
            <MetricCard
              title={t("customers.credit")}
              value={String(credit)}
              description="Customers currently holding unpaid balances"
              icon={<WalletCards className="size-5" />}
            />
            <MetricCard
              title={t("customers.outstandingCredit")}
              value={formatCurrency(outstanding)}
              description={t("customers.unpaidBalances")}
              icon={<Banknote className="size-5" />}
            />
          </section>
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable
                title={t("customers.directory")}
                description={t("customers.directoryDescription")}
                data={rows}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder={t("customers.search")}
                pageSize={10}
                onRowClick={(row) => {
                  setSelectedCustomer(row.customer);
                  setViewOpen(true);
                }}
                emptyMessage={
                  loading ? t("customers.loading") : t("customers.empty")
                }
                toolbarActions={
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setImportOpen(true)}>
                      <Upload className="mr-2 size-4" />
                      {t("customers.import")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setExportOpen(true)}>
                      <Download className="mr-2 size-4" />
                      {t("customers.export")}
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedCustomer(null);
                        setIsEdit(false);
                        setSheetOpen(true);
                      }}>
                      <Plus className="mr-2 size-4" />
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
      <CustomerImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={getCustomers}
      />
      <CustomerExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        customers={customers}
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
                    <Mail className="size-4 text-muted-foreground" />
                    {selectedCustomer.email || t("customers.noEmail")}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <WalletCards className="size-4 text-muted-foreground" />
                    {selectedCustomer.phone || t("customers.noPhone")}
                  </div>
                  <div className="flex items-start gap-2 text-sm md:col-span-2">
                    <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                    {selectedCustomer.address || t("customers.noAddress")}
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    [
                      t("customers.purchases"),
                      selectedCustomer.total_purchases,
                    ],
                    [
                      t("customers.totalSpent"),
                      formatCurrency(selectedCustomer.total_spent),
                    ],
                    [t("customers.points"), selectedCustomer.loyalty_points],
                    [
                      t("customers.creditLimit"),
                      formatCurrency(selectedCustomer.credit_limit),
                    ],
                    [
                      t("customers.openingBalance"),
                      formatCurrency(selectedCustomer.opening_balance),
                    ],
                    [
                      t("customers.outstandingBalance"),
                      formatCurrency(selectedCustomer.outstanding_balance),
                    ],
                    [
                      t("customers.lastVisit"),
                      date(selectedCustomer.last_visit),
                    ],
                  ].map(([label, value]) => (
                    <div
                      className="flex justify-between text-sm"
                      key={String(label)}>
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
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
                    onClick={() =>
                      selectedCustomer &&
                      void (async () => {
                        setViewOpen(false);
                        setHistory(
                          await getPurchaseHistory(selectedCustomer.id),
                        );
                        setHistoryOpen(true);
                      })()
                    }>
                    <ShoppingBag className="mr-2 size-4" />
                    {t("customers.history")}
                  </Button>
                </div>
              </CardContent>
            </Card>
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
                value={String(historyRows.length)}
                description={t("customers.transactionsDescription")}
                icon={<ShoppingBag className="size-5" />}
              />
              <MetricCard
                title={t("customers.totalRevenue")}
                value={formatCurrency(totalHistorySpent)}
                description={t("customers.totalRevenueDescription")}
                icon={<Banknote className="size-5" />}
              />
              <MetricCard
                title={t("customers.averagePurchaseValue")}
                value={formatCurrency(
                  totalHistorySpent / Math.max(historyRows.length, 1),
                )}
                description={t("customers.averagePurchaseDescription")}
                icon={<CalendarDays className="size-5" />}
              />
            </section>
            <Card>
              <CardContent className="px-6 pb-6">
                <DataTable
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
            <Card>
              <CardContent className="space-y-3 px-4 py-4">
                {[
                  [t("pos.customer"), selectedHistoryRow.customer_name],
                  [t("customers.phone"), selectedHistoryRow.phone],
                  [t("sales.invoice"), selectedHistoryRow.invoice_number],
                  [
                    t("customers.purchaseDate"),
                    date(selectedHistoryRow.purchase_date),
                  ],
                  [t("customers.items"), selectedHistoryRow.items_count],
                  [t("customers.cashier"), selectedHistoryRow.cashier],
                ].map(([label, value]) => (
                  <div className="flex justify-between" key={String(label)}>
                    <span className="text-sm text-muted-foreground">
                      {label}
                    </span>
                    <span className="font-medium">{value}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("sales.paymentMethod")}
                  </span>
                  {paymentBadge(selectedHistoryRow.payment_method)}
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t("sales.status")}
                  </span>
                  {statusBadge(selectedHistoryRow.status)}
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
                <Button variant="outline" className="w-full">
                  <ReceiptText className="mr-2 size-4" />
                  View Receipt
                </Button>
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
