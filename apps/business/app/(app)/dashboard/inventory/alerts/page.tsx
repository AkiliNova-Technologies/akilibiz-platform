"use client";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUp,
  ClipboardList,
  Eye,
  Package,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import {
  type LowStockAlert,
  useInventoryData,
} from "@/components/akilibiz/inventory/inventory-data";
import { formatProductCurrency } from "@/components/akilibiz/products/products-data";
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
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
type Row = LowStockAlert & TableData;
const badge = (status: Row["status"]) => (
  <Badge variant={status === "Out of Stock" ? "destructive" : "outline"}>
    {status}
  </Badge>
);
export default function InventoryLowStockAlertsPage() {
  const {
    overview,
    summary,
    loading,
    getSummary,
    getLowStock,
    refreshInventory,
    adjust,
  } = useInventoryData();
  const [selected, setSelected] = useState<Row | null>(null),
    [details, setDetails] = useState(false),
    [restock, setRestock] = useState<Row | null>(null);
  const [form, setForm] = useState({
    quantity: "",
    reason: "Low stock replenishment",
    notes: "",
  });
  useEffect(() => {
    void Promise.all([getSummary(), getLowStock()]);
  }, [getSummary, getLowStock]);
  const rows = useMemo<Row[]>(
    () =>
      overview
        .filter((item) => item.is_low_stock || item.is_out_of_stock)
        .map((item) => ({
          id: item.product_id,
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          category: item.category_name,
          current_stock: item.quantity_on_hand,
          min_stock: item.min_stock_level,
          shortage: Math.max(0, item.min_stock_level - item.quantity_on_hand),
          stock_unit: item.stock_unit,
          cost_price: item.cost_price,
          status: item.is_out_of_stock
            ? "Out of Stock"
            : item.quantity_on_hand <= Math.max(1, item.min_stock_level / 2)
              ? "Critical"
              : "Low Stock",
          last_updated: item.last_stock_update ?? item.updated_at,
        })),
    [overview],
  );
  const fields: TableField<Row>[] = [
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
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
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
      cell: (value, row) => `${value} ${row.stock_unit}`,
    },
    {
      key: "shortage",
      header: "Shortage",
      align: "center",
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
      cell: (value) => badge(value as Row["status"]),
    },
    {
      key: "last_updated",
      header: "Last Updated",
      align: "center",
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {new Date(String(value)).toLocaleString("en-UG")}
        </span>
      ),
    },
  ];
  const restockItem = (row: Row) => {
    setRestock(row);
    setForm({
      quantity: String(row.shortage),
      reason: "Low stock replenishment",
      notes: `Restocking ${row.product_name} to meet minimum stock level`,
    });
  };
  const actions: TableAction<Row>[] = [
    {
      type: "view",
      label: "View details",
      onClick: (row) => {
        setSelected(row);
        setDetails(true);
      },
    },
    {
      type: "custom",
      label: "Restock",
      icon: <ArrowUp className="size-4" />,
      onClick: restockItem,
    },
  ];
  const risk = rows.reduce(
    (sum, row) => sum + row.shortage * row.cost_price,
    0,
  );
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Restocking Priorities
            </h2>
            <p className="text-sm text-muted-foreground">
              Identify low, critical, and out-of-stock items requiring immediate
              replenishment.
            </p>
          </div>
          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="Low Stock Items"
              value={String(summary.low_stock_count)}
              description="Products below safe stock threshold"
              icon={<Package className="size-5" />}
            />
            <MetricCard
              title="Out of Stock"
              value={String(summary.out_of_stock_count)}
              description="Products currently unavailable for sale"
              icon={<TrendingDown className="size-5" />}
            />
            <MetricCard
              title="Critical Alerts"
              value={String(
                rows.filter((row) => row.status === "Critical").length,
              )}
              description="Products close to total depletion"
              icon={<AlertTriangle className="size-5" />}
            />
            <MetricCard
              title="Value at Risk"
              value={formatProductCurrency(risk)}
              description="Estimated cost value needed to cover shortages"
              icon={<ClipboardList className="size-5" />}
            />
          </section>
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable
                title="Low Stock Alert List"
                description="Review at-risk products and take replenishment action"
                data={rows}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder="Search by product, SKU, or category..."
                pageSize={10}
                onRowClick={(row) => {
                  setSelected(row);
                  setDetails(true);
                }}
                emptyMessage="No low stock alerts at the moment."
                onRefresh={async () => {
                  await refreshInventory();
                  toast.success("Low stock alerts refreshed");
                }}
                refreshing={loading}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={details} onOpenChange={setDetails}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Stock Alert Details</DialogTitle>
            <DialogDescription>
              Review the stock shortage and replenishment priority for this
              item.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <Card>
              <CardContent className="space-y-3 p-4">
                {[
                  ["Product", selected.product_name],
                  ["SKU", selected.sku],
                  [
                    "Current Stock",
                    `${selected.current_stock} ${selected.stock_unit}`,
                  ],
                  [
                    "Minimum Stock",
                    `${selected.min_stock} ${selected.stock_unit}`,
                  ],
                  ["Shortage", `${selected.shortage} ${selected.stock_unit}`],
                  [
                    "Last Updated",
                    new Date(selected.last_updated || "").toLocaleString(
                      "en-UG",
                    ),
                  ],
                  [
                    "Estimated Restock Cost",
                    formatProductCurrency(
                      selected.shortage * selected.cost_price,
                    ),
                  ],
                ].map(([label, value]) => (
                  <div className="flex justify-between gap-4" key={label}>
                    <span className="text-sm text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-right font-medium">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {badge(selected.status)}
                </div>
                <Separator />
                <Button
                  className="w-full"
                  onClick={() => {
                    setDetails(false);
                    restockItem(selected);
                  }}
                >
                  <ArrowUp className="mr-2 size-4" />
                  Restock
                </Button>
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(restock)}
        onOpenChange={(open) => !open && setRestock(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Restock Product</DialogTitle>
            <DialogDescription>
              Add stock to this product to resolve the low stock alert.
            </DialogDescription>
          </DialogHeader>
          {restock && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  {[
                    ["Product", restock.product_name],
                    ["SKU", restock.sku],
                    [
                      "Current Stock",
                      `${restock.current_stock} ${restock.stock_unit}`,
                    ],
                    [
                      "Minimum Stock",
                      `${restock.min_stock} ${restock.stock_unit}`,
                    ],
                    ["Shortage", `${restock.shortage} ${restock.stock_unit}`],
                  ].map(([label, value]) => (
                    <div className="flex justify-between" key={label}>
                      <span className="text-sm text-muted-foreground">
                        {label}
                      </span>
                      <span>{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <div className="space-y-2">
                <FieldLabel required>Restock Quantity</FieldLabel>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, quantity: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Suggested quantity: {restock.shortage} {restock.stock_unit}
                </p>
              </div>
              <div className="space-y-2">
                <FieldLabel required>Reason</FieldLabel>
                <Input
                  value={form.reason}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, reason: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  rows={3}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((old) => ({ ...old, notes: e.target.value }))
                  }
                />
              </div>
              {form.quantity && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Preview</p>
                  <p className="mt-2 font-semibold">
                    {restock.current_stock} + {Number(form.quantity)} ={" "}
                    {restock.current_stock + Number(form.quantity)}{" "}
                    {restock.stock_unit}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setRestock(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  disabled={loading}
                  onClick={async () => {
                    const quantity = Number(form.quantity);
                    if (!quantity || quantity <= 0) {
                      toast.error("Enter a valid quantity to restock");
                      return;
                    }
                    if (!form.reason.trim()) {
                      toast.error("Provide a reason for restocking");
                      return;
                    }
                    if (
                      await adjust(restock.product_id, {
                        quantity,
                        adjustment_type: "stock_in",
                        reason: form.reason.trim(),
                        notes: form.notes.trim() || undefined,
                      })
                    ) {
                      toast.success(
                        `Successfully restocked ${restock.product_name}`,
                      );
                      setRestock(null);
                    }
                  }}
                >
                  <ArrowUp className="mr-2 size-4" />
                  Confirm Restock
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
