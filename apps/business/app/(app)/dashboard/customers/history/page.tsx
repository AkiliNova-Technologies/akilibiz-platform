"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  ReceiptText,
  ShoppingBag,
  Users,
} from "lucide-react";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { SalePrintPreviewDialog } from "@/components/akilibiz/documents/SalePrintPreviewDialog";
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
import {
  type SaleDetail,
  type SaleListResponse,
  formatSalesCurrency as formatCurrency,
} from "@/components/akilibiz/sales-history/sales-history-data";
import { useCustomerPurchaseHistoryData } from "@/components/akilibiz/customers/purchase-history-data";

import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
interface PurchaseRow extends TableData {
  id: number;
  customer_name: string;
  phone_number: string;
  invoice_number: string;
  purchase_date: string;
  items_count: number;
  total_amount: number;
  payment_method: string;
  cashier: string;
  status: string;
}
const date = (value?: string) =>
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
const mapSale = (sale: SaleListResponse): PurchaseRow => ({
  id: sale.id,
  customer_name: sale.customer_name || "Walk-in Customer",
  phone_number: sale.customer_phone || "—",
  invoice_number: sale.sale_number,
  purchase_date: sale.created_at,
  items_count: sale.items_count,
  total_amount: sale.total_amount,
  payment_method: sale.payment_method,
  cashier: sale.cashier_name,
  status: sale.status,
});

export default function CustomerPurchaseHistoryPage() {
  const { t } = useI18n();
  const { sales, loading, getSales, getSale } =
    useCustomerPurchaseHistoryData();
  const [selected, setSelected] = useState<PurchaseRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [receiptId, setReceiptId] = useState<number | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  useEffect(() => {
    void getSales();
  }, [getSales]);
  const rows = useMemo(() => sales.map(mapSale), [sales]);
  const openDetails = async (row: PurchaseRow) => {
    setSelected(row);
    setDetail(null);
    setDetailsError(null);
    setDetailsLoading(true);
    setDetailsOpen(true);
    try {
      setDetail(await getSale(row.id));
    } catch {
      setDetailsError(
        "Purchase details could not be loaded. Please try again.",
      );
    } finally {
      setDetailsLoading(false);
    }
  };
  const receipt = (id: number) => {
    setReceiptId(id);
    setReceiptOpen(true);
  };
  const revenue = rows
    .filter((row) => row.status === "completed")
    .reduce((total, row) => total + row.total_amount, 0);
  const fields: TableField<PurchaseRow>[] = [
    {
      key: "customer_name",
      header: t("pos.customer"),
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "phone_number",
      header: t("sales.phone"),
      align: "center",
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
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
    { key: "cashier", header: t("customers.cashier"), align: "center", enableSorting: true },
    {
      key: "status",
      header: t("reports.status"),
      align: "center",
      cell: (value) => statusBadge(String(value)),
    },
  ];
  const actions: TableAction<PurchaseRow>[] = [
    {
      type: "view",
      label: t("customers.viewPurchase"),
      onClick: (row) => void openDetails(row),
    },
    {
      type: "custom",
      label: t("customers.viewReceipt"),
      icon: <ReceiptText className="size-4" />,
      onClick: (row) => receipt(row.id),
    },
  ];
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("customers.history")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("customers.purchaseHistoryDescription")}
            </p>
          </div>
          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title={t("suppliers.totalPurchases")}
              value={String(rows.length)}
              description={t("purchaseUi.recorded")}
              icon={<ShoppingBag className="size-5" />}
            />
            <MetricCard
              title={t("customers.totalRevenue")}
              value={formatCurrency(revenue)}
              description={t("purchaseUi.completedRevenue")}
              icon={<Banknote className="size-5" />}
            />
            <MetricCard
              title={t("purchaseUi.activeBuyers")}
              value={String(new Set(rows.map((row) => row.customer_name)).size)}
              description={t("purchaseUi.uniqueBuyers")}
              icon={<Users className="size-5" />}
            />
            <MetricCard
              title={t("customers.averagePurchaseValue")}
              value={formatCurrency(revenue / Math.max(rows.length, 1))}
              description={t("purchaseUi.averageDescription")}
              icon={<CalendarDays className="size-5" />}
            />
          </section>
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable
                title={t("customers.transactions")}
                description={t("purchaseUi.tableDescription")}
                data={rows}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder={t("purchaseUi.search")}
                pageSize={10}
                onRowClick={(row) => void openDetails(row)}
                emptyMessage={
                  loading
                    ? t("customers.loadingHistory")
                    : t("customers.emptyHistory")
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[90vh] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("customers.purchaseDetails")}</DialogTitle>
            <DialogDescription>
              {t("customers.purchaseDetailsDescription")}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 px-4">
                  {[
                    ["Customer", selected.customer_name],
                    ["Phone", selected.phone_number],
                    ["Invoice", selected.invoice_number],
                    ["Purchase Date", date(selected.purchase_date)],
                    ["Items", selected.items_count],
                    ["Cashier", selected.cashier],
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
                    {paymentBadge(selected.payment_method)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("reports.status")}
                    </span>
                    {statusBadge(selected.status)}
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-semibold">{t("customers.totalAmount")}</span>
                    <span className="text-lg font-bold">
                      {formatCurrency(selected.total_amount)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 font-semibold">{t("purchaseUi.purchasedItems")}</h3>
                  {detailsLoading && (
                    <p className="text-sm text-muted-foreground">
                      {t("purchaseUi.loadingItems")}
                    </p>
                  )}
                  {detailsError && (
                    <p role="alert" className="text-sm text-destructive">
                      {detailsError}
                    </p>
                  )}
                  {detail && detail.items.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t("purchaseUi.noItems")}
                    </p>
                  )}
                  {detail && detail.items.length > 0 && (
                    <div className="space-y-3">
                      {detail.items.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-b pb-3 last:border-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {item.product_name || t("purchaseUi.productUnavailable")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.sku || t("purchaseUi.noSku")}
                              {item.discount_amount && item.discount_amount > 0
                                ? ` · Discount ${formatCurrency(item.discount_amount)}`
                                : ""}
                            </p>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            Qty {item.quantity}
                          </span>
                          <div className="text-right text-sm">
                            <p>{formatCurrency(item.line_total)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(item.unit_price)} {t("purchaseUi.each")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => receipt(selected.id)}>
                  View Receipt
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => void openDetails(selected)}
                  disabled={detailsLoading}>
                  {t("purchaseUi.fullDetails")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <SalePrintPreviewDialog
        saleId={receiptId}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        context={{ mode: "reprint" }}
      />
    </>
  );
}
