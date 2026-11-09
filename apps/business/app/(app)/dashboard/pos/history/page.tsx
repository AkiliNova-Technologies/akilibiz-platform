"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote as IconCash, CreditCard, Smartphone, Eye as IconEye, Printer, ReceiptText as IconReceipt, ReceiptText as IconReceiptTax, Ban } from "lucide-react";

import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import MetricCard from "@/components/akilibiz/metric-card";
import { SaleListResponse, SalePaymentMethod, SaleStatus, formatSalesCurrency as formatCurrency, t, useSalesHistoryData } from "@/components/akilibiz/sales-history/sales-history-data";
import { SalePrintPreviewDialog } from "@/components/akilibiz/documents/SalePrintPreviewDialog";
import { toast } from "sonner";


// ============================================================================
// TYPES
// ============================================================================

interface SaleHistoryRow extends TableData {
  id: number;
  invoiceNumber: string;
  customer: string;
  cashier: string;
  itemsCount: number;
  subtotal: number;
  discount: number;
  taxAmount: number;
  taxClassification: string | null;
  taxRate: number | null;
  total: number;
  paymentMethod: SalePaymentMethod;
  status: SaleStatus;
  createdAt: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

function getPaymentBadge(method: SalePaymentMethod) {
  switch (method) {
    case "cash":
      return (
        <Badge variant="outline" className="gap-1">
          <IconCash className="size-3.5" />
          Cash
        </Badge>
      );
    case "card":
      return (
        <Badge variant="outline" className="gap-1">
          <CreditCard className="size-3.5" />
          Card
        </Badge>
      );
    case "mobile_money":
      return (
        <Badge variant="outline" className="gap-1">
          <Smartphone className="size-3.5" />
          Mobile Money
        </Badge>
      );
    case "split":
      return <Badge variant="outline">Split</Badge>;
  }
}

function getStatusBadge(status: SaleStatus) {
  switch (status) {
    case "completed":
      return <Badge variant="outline">Completed</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "refunded":
      return <Badge variant="outline">Refunded</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
  }
}

function getTaxClassificationBadge(classification: string | null | undefined) {
  if (!classification || classification === "LEGACY_UNKNOWN") {
    return <Badge variant="secondary">Legacy</Badge>;
  }

  switch (classification) {
    case "STANDARD_RATED":
      return <Badge variant="outline">Standard Rated</Badge>;
    case "ZERO_RATED":
      return <Badge variant="outline">Zero Rated</Badge>;
    case "EXEMPT":
      return <Badge variant="outline">Exempt</Badge>;
    case "OUT_OF_SCOPE":
      return <Badge variant="outline">Out of Scope</Badge>;
    default:
      return <Badge variant="secondary">{classification}</Badge>;
  }
}

function mapSaleRow(sale: SaleListResponse): SaleHistoryRow {
  return {
    id: sale.id,
    invoiceNumber: sale.sale_number,
    customer: sale.customer_name || "Walk-in Customer",
    cashier: sale.cashier_name,
    itemsCount: sale.items_count,
    subtotal: sale.subtotal,
    discount: sale.discount_amount,
    taxAmount: sale.tax_amount,
    taxClassification: sale.tax_classification,
    taxRate: sale.tax_rate,
    total: sale.total_amount,
    paymentMethod: sale.payment_method,
    status: sale.status,
    createdAt: sale.created_at,
  };
}

// ============================================================================
// PAGE
// ============================================================================

export default function SalesHistoryPage() {
    const {
    sales,
    selectedSale,
    summary,
    loading,
    getSales,
    getSale,
    getSalesSummary,
    refreshSales,
    clearSale,
    cancelExistingSale,
    user,
    taxSettings,
    getTaxSettings,
  } = useSalesHistoryData();

  // Hosted transaction reads, receipts, and cancellation are not yet connected.
  const salesHistoryAvailable = false;

  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cashierFilter, setCashierFilter] = useState("all");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [receiptSaleId, setReceiptSaleId] = useState<number | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<SaleHistoryRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    void Promise.all([getSales(), getSalesSummary(), getTaxSettings()]);
  }, [getSales, getSalesSummary, getTaxSettings]);

  useEffect(() => {
    if (!detailsOpen) {
      clearSale();
    }
  }, [detailsOpen, clearSale]);

  const mappedSales = useMemo<SaleHistoryRow[]>(() => {
    return sales.map(mapSaleRow);
  }, [sales]);

  const cashiers = useMemo(() => {
    return Array.from(new Set(mappedSales.map((sale) => sale.cashier))).sort();
  }, [mappedSales]);

  const filteredSales = useMemo(() => {
    return mappedSales.filter((sale) => {
      const matchesPayment =
        paymentFilter === "all" || sale.paymentMethod === paymentFilter;

      const matchesStatus =
        statusFilter === "all" || sale.status === statusFilter;

      const matchesCashier =
        cashierFilter === "all" || sale.cashier === cashierFilter;

      return matchesPayment && matchesStatus && matchesCashier;
    });
  }, [mappedSales, paymentFilter, statusFilter, cashierFilter]);

  const stats = useMemo(() => {
    if (summary) {
      return {
        totalValue: summary.total_sales_value,
        transactionCount: summary.transaction_count,
        avgSale: summary.average_sale_value,
        refundedCount: summary.refunded_count,
        totalTax: sales
          .filter((s) => s.status === "completed")
          .reduce((sum, s) => sum + s.tax_amount, 0),
      };
    }

    if (!salesHistoryAvailable) return null;

    const completedSales = filteredSales.filter(
      (s) => s.status === "completed",
    );
    const refundedSales = filteredSales.filter((s) => s.status === "refunded");
    const totalValue = completedSales.reduce((sum, s) => sum + s.total, 0);
    const avgSale =
      completedSales.length > 0 ? totalValue / completedSales.length : 0;
    const totalTax = completedSales.reduce((sum, s) => sum + s.taxAmount, 0);

    return {
      totalValue,
      transactionCount: completedSales.length,
      avgSale,
      refundedCount: refundedSales.length,
      totalTax,
    };
  }, [summary, filteredSales, sales]);

  const handleViewSale = async (sale: SaleHistoryRow) => {
    if (!salesHistoryAvailable) return;
    const detail = await getSale(sale.id);
    if (detail) setDetailsOpen(true);
  };

  const handleRefresh = async () => {
    await refreshSales();
  };

  const handleReceipt = async (saleId: number) => {
    if (!salesHistoryAvailable || receiptLoading) return;
    setReceiptLoading(true);
    try {
      setReceiptSaleId(saleId);
      setPreviewOpen(true);
    } catch {
      toast.error(t("sales.receiptUnavailable"));
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleOpenCancellation = (sale: SaleHistoryRow) => {
    if (!salesHistoryAvailable) return;
    setCancelTarget(sale);
    setCancelReason("");
  };

  const handleCancelSale = async () => {
    if (!salesHistoryAvailable) return;
    if (!cancelTarget || !user?.staff_id) {
      toast.error(t("sales.staffRequired"));
      return;
    }
    if (!cancelReason.trim()) {
      toast.error(t("sales.reasonRequired"));
      return;
    }

    setCancelling(true);
    try {
      const sale = await cancelExistingSale(cancelTarget.id, { reason: cancelReason.trim() });
      if (sale) {
        toast.success(t("sales.cancelled", { number: sale.sale_number }));
        setCancelTarget(null);
        setDetailsOpen(false);
        await refreshSales();
      }
    } catch {
      toast.error("This sale cannot be cancelled yet.");
    } finally {
      setCancelling(false);
    }
  };

  const tableFields: TableField<SaleHistoryRow>[] = [
    {
      key: "invoiceNumber",
      header: t("sales.invoice"),
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "createdAt",
      header: t("sales.dateTime"),
      enableSorting: true,
      cell: (value) => (
        <span>{new Intl.DateTimeFormat("en-UG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(String(value)))}</span>
      ),
    },
    {
      key: "customer",
      header: t("pos.customer"),
      enableSorting: true,
    },
    {
      key: "cashier",
      header: t("sales.cashier"),
      enableSorting: true,
    },
    {
      key: "paymentMethod",
      header: t("sales.payment"),
      align: "center",
      cell: (value) => getPaymentBadge(value as SalePaymentMethod),
    },
    {
      key: "itemsCount",
      header: t("pos.items"),
      align: "center",
      enableSorting: true,
    },
    {
      key: "taxAmount",
      header: t("sales.tax"),
      align: "right",
      enableSorting: true,
      cell: (value, row) => {
        const tax = Number(value);
        if (tax > 0) {
          return (
            <span className="text-sm font-medium">
              {formatCurrency(tax)}
              {row.taxRate && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({row.taxRate}%)
                </span>
              )}
            </span>
          );
        }
        return <span className="text-sm text-muted-foreground">-</span>;
      },
    },
    {
      key: "total",
      header: t("pos.total"),
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-semibold">{formatCurrency(Number(value))}</span>
      ),
    },
    {
      key: "status",
      header: t("sales.status"),
      align: "center",
      cell: (value) => getStatusBadge(value as SaleStatus),
    },
  ];

  const tableActions: TableAction<SaleHistoryRow>[] = [
    {
      type: "view",
      label: t("sales.view"),
      onClick: handleViewSale,
      disabled: () => !salesHistoryAvailable,
    },
    {
      type: "custom",
      label: t("sales.printReceipt"),
      icon: <Printer className="size-4" />,
      onClick: (row) => void handleReceipt(row.id),
      disabled: () => !salesHistoryAvailable,
    },
    {
      type: "custom",
      label: t("sales.cancelSale"),
      icon: <Ban className="size-4" />,
      onClick: handleOpenCancellation,
      disabled: (row) => !salesHistoryAvailable || row.status !== "completed",
    },
  ];

  return (
    <>

      <div className="flex flex-1 flex-col gap-6 pb-4 md:pb-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("sales.records")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("sales.recordsDescription")}
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <MetricCard
            title={t("sales.totalSales")}
            value={stats ? formatCurrency(stats.totalValue) : "—"}
            description={t("sales.totalSalesDescription")}
            icon={<IconCash className="size-5" />}
          />

          <MetricCard
            title={t("sales.transactions")}
            value={stats ? String(stats.transactionCount) : "—"}
            description={t("sales.transactionsDescription")}
            icon={<IconReceipt className="size-5" />}
          />

          <MetricCard
            title={t("sales.vatCollected")}
            value={stats ? formatCurrency(stats.totalTax) : "—"}
            description={t("sales.vatCollectedDescription")}
            icon={<IconReceiptTax className="size-5" />}
          />

          <MetricCard
            title={t("sales.averageSale")}
            value={stats ? formatCurrency(stats.avgSale) : "—"}
            description={t("sales.averageSaleDescription")}
            icon={<IconCash className="size-5" />}
          />
        </section>

        <Card>
          <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("sales.paymentMethod")}</Label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("sales.allPaymentMethods")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("sales.allPaymentMethods")}</SelectItem>
                  <SelectItem value="cash">{t("pos.cash")}</SelectItem>
                  <SelectItem value="card">{t("pos.card")}</SelectItem>
                  <SelectItem value="mobile_money">{t("pos.mobileMoney")}</SelectItem>
                  <SelectItem value="split">{t("pos.split")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("sales.status")}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("sales.allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("sales.allStatuses")}</SelectItem>
                  <SelectItem value="completed">{t("sales.completed")}</SelectItem>
                  <SelectItem value="pending">{t("sales.pending")}</SelectItem>
                  <SelectItem value="refunded">{t("sales.refunded")}</SelectItem>
                  <SelectItem value="cancelled">{t("sales.cancelledStatus")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("sales.cashier")}</Label>
              <Select value={cashierFilter} onValueChange={setCashierFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("sales.allCashiers")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("sales.allCashiers")}</SelectItem>
                  {cashiers.map((cashier) => (
                    <SelectItem key={cashier} value={cashier}>
                      {cashier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="px-6 pb-6">
            <DataTable<SaleHistoryRow>
              title={t("sales.history")}
              description={t("sales.tableDescription")}
              data={filteredSales}
              fields={tableFields}
              actions={tableActions}
              enableGlobalSearch
              searchPlaceholder={t("sales.search")}
              pageSize={10}
              onRowClick={salesHistoryAvailable ? handleViewSale : undefined}
              emptyMessage={t("sales.empty")}
              onRefresh={handleRefresh}
              refreshing={loading}
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("sales.details")}</DialogTitle>
            <DialogDescription>
              {t("sales.detailsDescription")}
            </DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t("sales.invoice")}
                    </span>
                    <span className="font-medium">
                      {selectedSale.sale_number}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t("pos.customer")}
                    </span>
                    <span className="text-right font-medium">
                      {selectedSale.customer_name}
                    </span>
                  </div>

                  {selectedSale.customer_phone && (
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">
                        {t("sales.phone")}
                      </span>
                      <span className="font-medium">
                        {selectedSale.customer_phone}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t("sales.cashier")}
                    </span>
                    <span className="font-medium">
                      {selectedSale.cashier_name}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{t("sales.date")}</span>
                    <span className="text-right font-medium">
                      {format(
                        new Date(selectedSale.created_at),
                        "dd MMM yyyy, hh:mm a",
                      )}
                    </span>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t("pos.items")}</p>
                    <div className="space-y-2">
                      {selectedSale.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start justify-between gap-4 rounded-lg border p-3">
                          <div className="min-w-0">
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.sku} • {item.quantity} {item.stock_unit} ×{" "}
                              {formatCurrency(item.unit_price)}
                            </p>
                            {item.tax_classification && (
                              <div className="mt-1">
                                {getTaxClassificationBadge(
                                  item.tax_classification,
                                )}
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            <p className="font-medium">
                              {formatCurrency(item.line_total)}
                            </p>
                            {item.tax_amount > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {t("sales.tax")}: {formatCurrency(item.tax_amount)}
                                {item.tax_rate && ` (${item.tax_rate}%)`}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t("sales.itemsCount")}
                    </span>
                    <span className="font-medium">
                      {selectedSale.items_count}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t("sales.subtotal")}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(selectedSale.subtotal)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t("sales.discount")}
                    </span>
                    <span className="font-medium">
                      - {formatCurrency(selectedSale.discount_amount)}
                    </span>
                  </div>

                  {selectedSale.tax_amount > 0 && (
                    <>
                      <div className="flex justify-between gap-4">
                        <span className="text-sm text-muted-foreground">
                          Tax Classification
                        </span>
                        {getTaxClassificationBadge(
                          selectedSale.tax_classification,
                        )}
                      </div>

                      {selectedSale.tax_rate && (
                        <div className="flex justify-between gap-4">
                          <span className="text-sm text-muted-foreground">
                            Tax Rate
                          </span>
                          <span className="font-medium">
                            {selectedSale.tax_rate}%
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between gap-4">
                        <span className="text-sm text-muted-foreground">
                          Tax Amount
                        </span>
                        <span className="font-medium">
                          {formatCurrency(selectedSale.tax_amount)}
                        </span>
                      </div>

                      {selectedSale.tax_exclusive_amount && (
                        <div className="flex justify-between gap-4">
                          <span className="text-sm text-muted-foreground">
                            Tax Exclusive Amount
                          </span>
                          <span className="font-medium">
                            {formatCurrency(selectedSale.tax_exclusive_amount)}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t("sales.payment")}
                    </span>
                    {getPaymentBadge(selectedSale.payment_method)}
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t("sales.status")}
                    </span>
                    {getStatusBadge(selectedSale.status)}
                  </div>

                  <Separator />

                  <div className="flex justify-between gap-4">
                    <span className="font-semibold">{t("sales.total")}</span>
                    <span className="text-lg font-bold">
                      {formatCurrency(selectedSale.total_amount)}
                    </span>
                  </div>

                  {taxSettings?.vat_registered && (
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <div className="flex items-center gap-2">
                        <IconReceiptTax className="size-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {t("sales.vatNotice", { jurisdiction: taxSettings.jurisdiction })}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" disabled={!salesHistoryAvailable || receiptLoading} onClick={() => void handleReceipt(selectedSale.id)}>
                  <Printer className="mr-2 size-4" />
                  {t("sales.printReceipt")}
                </Button>

                <Button className="flex-1" disabled={!salesHistoryAvailable || receiptLoading} onClick={() => void handleReceipt(selectedSale.id)}>
                  <IconEye className="mr-2 size-4" />
                  {t("sales.fullReceipt")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <SalePrintPreviewDialog saleId={receiptSaleId} open={previewOpen} onOpenChange={setPreviewOpen} context={{ mode: "reprint" }} />
      <Dialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && !cancelling && setCancelTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("sales.cancelSale")}</DialogTitle>
            <DialogDescription>
              {t("sales.cancelDescription", { number: cancelTarget?.invoiceNumber ?? "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sale-cancel-reason">{t("sales.cancelReason")}</Label>
            <Textarea
              id="sale-cancel-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              disabled={cancelling}
              placeholder={t("sales.cancelReasonHint")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)} disabled={cancelling}>
              {t("sales.keepSale")}
            </Button>
            <Button variant="destructive" onClick={handleCancelSale} disabled={!salesHistoryAvailable || cancelling || !cancelReason.trim()}>
              {cancelling ? t("sales.cancelling") : t("sales.confirmCancellation")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
