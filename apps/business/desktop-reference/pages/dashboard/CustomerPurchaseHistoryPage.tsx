import * as React from "react";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
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
  IconCash,
  IconReceipt,
  IconShoppingBag,
  IconUsers,
  IconCalendarStats,
} from "@tabler/icons-react";
import MetricCard from "@/components/metric-card";
import { useReduxSales } from "@/hooks/useReduxSales";
import { SalePrintPreviewDialog } from "@/components/documents/SalePrintPreviewDialog";
import type {
  SaleDetailResponse,
  SaleListResponse,
} from "@/services/tauri/sales";

interface CustomerPurchaseHistoryRow extends TableData {
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

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

function mapSaleToRow(sale: SaleListResponse): CustomerPurchaseHistoryRow {
  return {
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
  };
}

export default function CustomerPurchaseHistoryPage() {
  const { sales, loading, getSales, getSale } = useReduxSales();

  const [selectedPurchase, setSelectedPurchase] =
    React.useState<CustomerPurchaseHistoryRow | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [purchaseDetail, setPurchaseDetail] =
    React.useState<SaleDetailResponse | null>(null);
  const [detailsLoading, setDetailsLoading] = React.useState(false);
  const [detailsError, setDetailsError] = React.useState<string | null>(null);
  const [receiptSaleId, setReceiptSaleId] = React.useState<number | null>(null);
  const [receiptOpen, setReceiptOpen] = React.useState(false);

  React.useEffect(() => {
    void getSales();
  }, [getSales]);

  const rows = React.useMemo<CustomerPurchaseHistoryRow[]>(() => {
    return sales.map(mapSaleToRow);
  }, [sales]);

  const openDetails = async (row: CustomerPurchaseHistoryRow) => {
    setSelectedPurchase(row);
    setPurchaseDetail(null);
    setDetailsError(null);
    setDetailsLoading(true);
    setDetailsOpen(true);
    try {
      setPurchaseDetail(await getSale(row.id));
    } catch {
      setDetailsError(
        "Purchase details could not be loaded. Please try again.",
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const openReceipt = (saleId: number) => {
    setReceiptSaleId(saleId);
    setReceiptOpen(true);
  };

  const totalPurchases = rows.length;

  const totalRevenue = rows
    .filter((row) => row.status === "completed")
    .reduce((sum, row) => sum + row.total_amount, 0);

  const uniqueCustomers = new Set(rows.map((row) => row.customer_name)).size;

  const avgPurchaseValue =
    totalPurchases > 0 ? totalRevenue / totalPurchases : 0;

  const tableFields: TableField<CustomerPurchaseHistoryRow>[] = [
    {
      key: "customer_name",
      header: "Customer",
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "phone_number",
      header: "Phone",
      align: "center",
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "invoice_number",
      header: "Invoice",
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "purchase_date",
      header: "Purchase Date",
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
      header: "Items",
      align: "center",
      enableSorting: true,
      cell: (value) => <Badge variant="outline">{Number(value)}</Badge>,
    },
    {
      key: "total_amount",
      header: "Total Amount",
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-semibold">{formatCurrency(Number(value))}</span>
      ),
    },
    {
      key: "payment_method",
      header: "Payment",
      align: "center",
      cell: (value) => getPaymentBadge(String(value)),
    },
    {
      key: "cashier",
      header: "Cashier",
      align: "center",
      enableSorting: true,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) => getStatusBadge(String(value)),
    },
  ];

  const tableActions: TableAction<CustomerPurchaseHistoryRow>[] = [
    {
      type: "view",
      label: "View purchase",
      onClick: (row) => {
        void openDetails(row);
      },
    },
    {
      type: "custom",
      label: "View receipt",
      icon: <IconReceipt className="size-4" />,
      onClick: (row) => {
        openReceipt(row.id);
      },
    },
  ];

  return (
    <>
      <SiteHeader label="Customer Purchase History" />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Purchase History
            </h2>
            <p className="text-sm text-muted-foreground">
              Review customer buying activity, transaction value, and purchase
              frequency.
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="Total Purchases"
              value={String(totalPurchases)}
              description="Recorded customer transactions"
              icon={<IconShoppingBag className="size-5" />}
            />

            <MetricCard
              title="Total Revenue"
              value={formatCurrency(totalRevenue)}
              description="Revenue from completed customer purchases"
              icon={<IconCash className="size-5" />}
            />

            <MetricCard
              title="Active Buying Customers"
              value={String(uniqueCustomers)}
              description="Unique customers with purchase records"
              icon={<IconUsers className="size-5" />}
            />

            <MetricCard
              title="Average Purchase Value"
              value={formatCurrency(avgPurchaseValue)}
              description="Average value per purchase record"
              icon={<IconCalendarStats className="size-5" />}
            />
          </section>

          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<CustomerPurchaseHistoryRow>
                title="Customer Transactions"
                description="Track individual purchases, revenue, and customer activity"
                data={rows}
                fields={tableFields}
                actions={tableActions}
                enableGlobalSearch
                searchPlaceholder="Search by customer, invoice, or cashier..."
                pageSize={10}
                onRowClick={(row) => {
                  void openDetails(row);
                }}
                emptyMessage={
                  loading
                    ? "Loading purchase history..."
                    : "No purchase history found."
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[90vh] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Purchase Details</DialogTitle>
            <DialogDescription>
              Review customer transaction details and purchase summary.
            </DialogDescription>
          </DialogHeader>

          {selectedPurchase && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 px-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Customer
                    </span>
                    <span className="font-medium">
                      {selectedPurchase.customer_name}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Phone</span>
                    <span className="font-medium">
                      {selectedPurchase.phone_number}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Invoice
                    </span>
                    <span className="font-medium">
                      {selectedPurchase.invoice_number}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Purchase Date
                    </span>
                    <span className="font-medium">
                      {formatDate(selectedPurchase.purchase_date)}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Items</span>
                    <span className="font-medium">
                      {selectedPurchase.items_count}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Payment Method
                    </span>
                    {getPaymentBadge(selectedPurchase.payment_method)}
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Cashier
                    </span>
                    <span className="font-medium">
                      {selectedPurchase.cashier}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    {getStatusBadge(selectedPurchase.status)}
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <span className="font-semibold">Total Amount</span>
                    <span className="text-lg font-bold">
                      {formatCurrency(selectedPurchase.total_amount)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="mb-3 font-semibold">Purchased items</h3>
                  {detailsLoading && (
                    <p className="text-sm text-muted-foreground">
                      Loading purchased items…
                    </p>
                  )}
                  {detailsError && (
                    <p role="alert" className="text-sm text-destructive">
                      {detailsError}
                    </p>
                  )}
                  {purchaseDetail && purchaseDetail.items.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      This sale has no persisted item lines.
                    </p>
                  )}
                  {purchaseDetail && purchaseDetail.items.length > 0 && (
                    <div className="space-y-3">
                      {purchaseDetail.items.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 border-b pb-3 last:border-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {item.product_name || "Product unavailable"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.sku || "No SKU"}
                              {item.discount_amount > 0
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
                              {formatCurrency(item.unit_price)} each
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
                  onClick={() => openReceipt(selectedPurchase.id)}>

                  View Receipt
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => void openDetails(selectedPurchase)}
                  disabled={detailsLoading}>

                  Full Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <SalePrintPreviewDialog
        saleId={receiptSaleId}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        context={{ mode: "reprint" }}
      />
    </>
  );
}
