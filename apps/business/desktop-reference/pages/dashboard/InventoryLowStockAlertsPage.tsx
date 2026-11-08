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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  IconAlertTriangle,
  IconArrowUp,
  IconClipboardList,
  IconEye,
  IconPackage,
  IconTrendingDown,
} from "@tabler/icons-react";
import { toast } from "sonner";
import MetricCard from "@/components/metric-card";
import { useReduxInventory } from "@/hooks/useReduxInventory";
import type { LowStockAlert } from "@/services/tauri/inventory";

// ============================================================================
// TYPES
// ============================================================================

type StockAlertStatus = "Low Stock" | "Out of Stock" | "Critical";

interface LowStockRow extends TableData {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  category: string;
  current_stock: number;
  min_stock: number;
  shortage: number;
  stock_unit: string;
  cost_price: number;
  status: StockAlertStatus;
  last_updated: string;
}

interface RestockFormData {
  quantity: string;
  reason: string;
  notes: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status: StockAlertStatus) {
  if (status === "Out of Stock") {
    return <Badge variant="destructive">Out of Stock</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
}

function mapAlertToRow(item: LowStockAlert): LowStockRow {
  return {
    id: item.product_id,
    product_id: item.product_id,
    product_name: item.product_name,
    sku: item.sku,
    category: item.category,
    current_stock: item.current_stock,
    min_stock: item.min_stock,
    shortage: item.shortage,
    stock_unit: item.stock_unit || "pcs",
    cost_price: item.cost_price,
    status: item.status,
    last_updated: item.last_updated || "",
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InventoryLowStockAlertsPage() {
  const {
    lowStockAlerts,
    summary,
    loading,
    error,
    getSummary,
    getLowStock,
    refreshInventory,
    adjust,
    clearError,
  } = useReduxInventory();

  const [selectedItem, setSelectedItem] = React.useState<LowStockRow | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  const [restockOpen, setRestockOpen] = React.useState(false);
  const [restockItem, setRestockItem] = React.useState<LowStockRow | null>(null);
  const [restockForm, setRestockForm] = React.useState<RestockFormData>({
    quantity: "",
    reason: "Low stock replenishment",
    notes: "",
  });

  React.useEffect(() => {
    void Promise.all([getSummary(), getLowStock()]);
  }, [getSummary, getLowStock]);

  React.useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  React.useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const lowStockItems = React.useMemo<LowStockRow[]>(() => {
    return lowStockAlerts.map(mapAlertToRow);
  }, [lowStockAlerts]);

  const stats = React.useMemo(() => {
    const lowStockCount =
      summary?.low_stock_count ??
      lowStockItems.filter((i) => i.status === "Low Stock").length;

    const outOfStockCount =
      summary?.out_of_stock_count ??
      lowStockItems.filter((i) => i.status === "Out of Stock").length;

    const criticalCount = lowStockItems.filter((i) => i.status === "Critical").length;

    const valueAtRisk =
      summary?.value_at_risk ??
      lowStockItems.reduce((sum, item) => sum + item.shortage * item.cost_price, 0);

    return {
      lowStockCount,
      outOfStockCount,
      criticalCount,
      valueAtRisk,
    };
  }, [summary, lowStockItems]);

  const openRestockDialog = (item: LowStockRow) => {
    setRestockItem(item);
    // Pre-fill quantity with the shortage amount
    setRestockForm({
      quantity: String(item.shortage),
      reason: "Low stock replenishment",
      notes: `Restocking ${item.product_name} to meet minimum stock level`,
    });
    setRestockOpen(true);
  };

  const handleRestockInputChange = (field: keyof RestockFormData, value: string) => {
    setRestockForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!restockItem) {
      toast.error("No product selected for restocking");
      return;
    }

    const quantity = Number(restockForm.quantity);
    if (!quantity || quantity <= 0) {
      toast.error("Enter a valid quantity to restock");
      return;
    }

    if (!restockForm.reason.trim()) {
      toast.error("Provide a reason for restocking");
      return;
    }

    const success = await adjust(restockItem.product_id, {
      quantity,
      adjustment_type: "stock_in",
      reason: restockForm.reason.trim(),
      notes: restockForm.notes.trim() || undefined,
    });

    if (success) {
      toast.success(`Successfully restocked ${restockItem.product_name}`);
      setRestockOpen(false);
      setRestockItem(null);
      // Refresh the low stock alerts
      await Promise.all([getLowStock(), getSummary()]);
    }
  };

  const lowStockFields: TableField<LowStockRow>[] = [
    {
      key: "product_name",
      header: "Product",
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "sku",
      header: "SKU",
      align: "center",
      cell: (value) => <span className="font-mono text-sm">{String(value)}</span>,
    },
    {
      key: "category",
      header: "Category",
      align: "center",
      cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
    {
      key: "current_stock",
      header: "Current Stock",
      align: "center",
      enableSorting: true,
      cell: (value, row) => (
        <Badge variant={Number(value) === 0 ? "destructive" : "outline"}>
          {Number(value)} {row.stock_unit}
        </Badge>
      ),
    },
    {
      key: "min_stock",
      header: "Min Stock",
      align: "center",
      enableSorting: true,
      cell: (value, row) => (
        <span className="text-sm text-muted-foreground">
          {Number(value)} {row.stock_unit}
        </span>
      ),
    },
    {
      key: "shortage",
      header: "Shortage",
      align: "center",
      enableSorting: true,
      cell: (value, row) => (
        <span className="font-medium">
          {Number(value)} {row.stock_unit}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) => getStatusBadge(value as StockAlertStatus),
    },
    {
      key: "last_updated",
      header: "Last Updated",
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(String(value))}
        </span>
      ),
    },
  ];

  const lowStockActions: TableAction<LowStockRow>[] = [
    {
      type: "view",
      label: "View details",
      onClick: (row) => {
        setSelectedItem(row);
        setDetailsOpen(true);
      },
    },
    {
      type: "custom",
      label: "Restock",
      icon: <IconArrowUp className="size-4" />,
      onClick: (row) => {
        openRestockDialog(row);
      },
    },
  ];

  const handleRefresh = async () => {
    await Promise.all([refreshInventory(), getLowStock(), getSummary()]);
    toast.success("Low stock alerts refreshed");
  };

  return (
    <>
      <SiteHeader label="Low Stock Alerts" />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Restocking Priorities
            </h2>
            <p className="text-sm text-muted-foreground">
              Identify low, critical, and out-of-stock items requiring immediate replenishment.
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="Low Stock Items"
              value={String(stats.lowStockCount)}
              description="Products below safe stock threshold"
              icon={<IconPackage className="size-5" />}
            />

            <MetricCard
              title="Out of Stock"
              value={String(stats.outOfStockCount)}
              description="Products currently unavailable for sale"
              icon={<IconTrendingDown className="size-5" />}
            />

            <MetricCard
              title="Critical Alerts"
              value={String(stats.criticalCount)}
              description="Products close to total depletion"
              icon={<IconAlertTriangle className="size-5" />}
            />

            <MetricCard
              title="Value at Risk"
              value={formatCurrency(stats.valueAtRisk)}
              description="Estimated cost value needed to cover shortages"
              icon={<IconClipboardList className="size-5" />}
            />
          </section>

          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<LowStockRow>
                title="Low Stock Alert List"
                description="Review at-risk products and take replenishment action"
                data={lowStockItems}
                fields={lowStockFields}
                actions={lowStockActions}
                enableGlobalSearch
                searchPlaceholder="Search by product, SKU, or category..."
                pageSize={10}
                onRowClick={(row) => {
                  setSelectedItem(row);
                  setDetailsOpen(true);
                }}
                emptyMessage="No low stock alerts at the moment."
                onRefresh={handleRefresh}
                refreshing={loading}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Stock Alert Details</DialogTitle>
            <DialogDescription>
              Review the stock shortage and replenishment priority for this item.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Product</span>
                    <span className="text-right font-medium">
                      {selectedItem.product_name}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">SKU</span>
                    <span className="font-mono">{selectedItem.sku}</span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Category</span>
                    <Badge variant="outline">{selectedItem.category}</Badge>
                  </div>

                  <Separator />

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Current Stock</span>
                    <span className="font-medium">
                      {selectedItem.current_stock} {selectedItem.stock_unit}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Minimum Stock</span>
                    <span className="font-medium">
                      {selectedItem.min_stock} {selectedItem.stock_unit}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Shortage</span>
                    <span className="font-medium">
                      {selectedItem.shortage} {selectedItem.stock_unit}
                    </span>
                  </div>

                  <Separator />

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Status</span>
                    {getStatusBadge(selectedItem.status)}
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Last Updated</span>
                    <span className="text-right font-medium">
                      {formatDateTime(selectedItem.last_updated)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      Estimated Restock Cost
                    </span>
                    <span className="text-right font-medium">
                      {formatCurrency(selectedItem.shortage * selectedItem.cost_price)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setDetailsOpen(false);
                    openRestockDialog(selectedItem);
                  }}
                >
                  <IconEye className="mr-2 size-4" />
                  View Item
                </Button>

                <Button
                  className="flex-1"
                  onClick={() => {
                    setDetailsOpen(false);
                    openRestockDialog(selectedItem);
                  }}
                >
                  <IconArrowUp className="mr-2 size-4" />
                  Restock
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={restockOpen} onOpenChange={setRestockOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Restock Product</DialogTitle>
            <DialogDescription>
              Add stock to this product to resolve the low stock alert.
            </DialogDescription>
          </DialogHeader>

          {restockItem && (
            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <Card>
                <CardContent className="space-y-3 px-4">
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Product</span>
                    <span className="text-right font-medium">
                      {restockItem.product_name}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">SKU</span>
                    <span className="font-mono">{restockItem.sku}</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Current Stock</span>
                    <Badge variant={restockItem.current_stock === 0 ? "destructive" : "outline"}>
                      {restockItem.current_stock} {restockItem.stock_unit}
                    </Badge>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Minimum Stock</span>
                    <span className="font-medium">
                      {restockItem.min_stock} {restockItem.stock_unit}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">Shortage</span>
                    <span className="font-medium text-amber-600">
                      {restockItem.shortage} {restockItem.stock_unit}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <FieldLabel required htmlFor="restock-quantity">Restock Quantity</FieldLabel>
                <Input
                  id="restock-quantity"
                  type="number"
                  min="0"
                  step="0.01"
                  value={restockForm.quantity}
                  onChange={(e) => handleRestockInputChange("quantity", e.target.value)}
                  placeholder={`Enter quantity in ${restockItem.stock_unit}`}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Suggested quantity: {restockItem.shortage} {restockItem.stock_unit}
                </p>
              </div>

              <div className="space-y-2">
                <FieldLabel required htmlFor="restock-reason">Reason</FieldLabel>
                <Input
                  id="restock-reason"
                  value={restockForm.reason}
                  onChange={(e) => handleRestockInputChange("reason", e.target.value)}
                  placeholder="Reason for restocking"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="restock-notes">Notes</Label>
                <Textarea
                  id="restock-notes"
                  rows={3}
                  value={restockForm.notes}
                  onChange={(e) => handleRestockInputChange("notes", e.target.value)}
                  placeholder="Optional additional notes"
                />
              </div>

              {restockForm.quantity && Number(restockForm.quantity) > 0 && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Preview</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Current Stock</span>
                      <span className="font-medium">
                        {restockItem.current_stock} {restockItem.stock_unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Adding</span>
                      <span className="font-medium text-green-600">
                        +{Number(restockForm.quantity)} {restockItem.stock_unit}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between border-t pt-2">
                      <span>New Stock Level</span>
                      <span className="font-semibold">
                        {restockItem.current_stock + Number(restockForm.quantity)}{" "}
                        {restockItem.stock_unit}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setRestockOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  <IconArrowUp className="mr-2 size-4" />
                  Confirm Restock
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
