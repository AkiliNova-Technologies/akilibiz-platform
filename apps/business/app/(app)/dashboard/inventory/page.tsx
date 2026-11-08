"use client";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Box,
  Edit3,
  Minus,
  Package,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
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
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  type AdjustmentType,
  type InventoryOverviewItem,
  useInventoryData,
} from "@/components/akilibiz/inventory/inventory-data";
import { formatProductCurrency } from "@/components/akilibiz/products/products-data";
type Row = {
  id: number;
  product_name: string;
  sku: string;
  category: string;
  current_stock: number;
  min_stock: number;
  max_stock: number;
  stock_unit: string;
  cost_price: number;
  selling_price: number;
  last_restock: string;
  status: "In Stock" | "Low Stock" | "Out of Stock" | "Overstocked";
  product: InventoryOverviewItem;
} & TableData;
const status = (item: InventoryOverviewItem): Row["status"] =>
  item.is_out_of_stock || item.quantity_on_hand === 0
    ? "Out of Stock"
    : item.is_low_stock
      ? "Low Stock"
      : item.is_overstocked
        ? "Overstocked"
        : "In Stock";
const options: [AdjustmentType, string, "in" | "out" | "neutral"][] = [
  ["stock_in", "Stock In", "in"],
  ["stock_out", "Stock Out", "out"],
  ["damaged", "Damaged", "out"],
  ["lost", "Lost / Missing", "out"],
  ["return_in", "Customer Return", "in"],
  ["correction", "Inventory Correction", "neutral"],
  ["opening_balance", "Opening Balance", "in"],
];
export default function InventoryPage() {
  const {
    overview,
    summary,
    error,
    loading,
    getOverview,
    getSummary,
    getLowStock,
    getLogs,
    refreshInventory,
    adjust,
  } = useInventoryData();
  const [view, setView] = useState(false),
    [sheet, setSheet] = useState(false),
    [selected, setSelected] = useState<InventoryOverviewItem | null>(null),
    [logs, setLogs] = useState<Awaited<ReturnType<typeof getLogs>>>([]);
  const [data, setData] = useState({
    adjustment_qty: "",
    adjustment_reason: "",
    adjustment_type: "stock_in" as AdjustmentType,
    notes: "",
  });
  useEffect(() => {
    void Promise.all([getOverview(), getSummary(), getLowStock()]);
  }, [getOverview, getSummary, getLowStock]);
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);
  const rows = useMemo<Row[]>(
    () =>
      overview.map((item) => ({
        id: item.product_id,
        product_name: item.product_name,
        sku: item.sku,
        category: item.category_name || "Uncategorized",
        current_stock: item.quantity_on_hand,
        min_stock: item.min_stock_level,
        max_stock: item.max_stock_level,
        stock_unit: item.stock_unit || "pcs",
        cost_price: item.cost_price,
        selling_price: item.selling_price,
        last_restock: item.last_stock_update || item.updated_at,
        status: status(item),
        product: item,
      })),
    [overview],
  );
  const openView = async (item: InventoryOverviewItem) => {
    setSelected(item);
    setLogs(await getLogs(item.product_id));
    setView(true);
  };
  const openEdit = (item: InventoryOverviewItem) => {
    setSelected(item);
    setData({
      adjustment_qty: "",
      adjustment_reason: "",
      adjustment_type: "stock_in",
      notes: "",
    });
    setSheet(true);
  };
  const meta = options.find((option) => option[0] === data.adjustment_type);
  const projected = selected
    ? meta?.[2] === "in"
      ? selected.quantity_on_hand + Number(data.adjustment_qty || 0)
      : meta?.[2] === "out"
        ? Math.max(
            0,
            selected.quantity_on_hand - Number(data.adjustment_qty || 0),
          )
        : selected.quantity_on_hand
    : 0;
  const fields: TableField<Row>[] = [
    { key: "product_name", header: "Product", enableSorting: true },
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
        <Badge
          variant={
            Number(value) === 0
              ? "destructive"
              : Number(value) <= row.min_stock
                ? "secondary"
                : "outline"
          }>
          {Number(value)} {row.stock_unit}
        </Badge>
      ),
    },
    {
      key: "min_stock",
      header: "Min Stock",
      align: "center",
      cell: (value) => (
        <span className="text-sm text-muted-foreground">{Number(value)}</span>
      ),
    },
    {
      key: "max_stock",
      header: "Max Stock",
      align: "center",
      cell: (value) => (
        <span className="text-sm text-muted-foreground">{Number(value)}</span>
      ),
    },
    {
      key: "last_restock",
      header: "Last Updated",
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {new Date(String(value)).toLocaleDateString("en-UG")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) => (
        <Badge
          variant={
            value === "Out of Stock"
              ? "destructive"
              : value === "Low Stock"
                ? "secondary"
                : "outline"
          }>
          {String(value)}
        </Badge>
      ),
    },
  ];
  const actions: TableAction<Row>[] = [
    {
      type: "view",
      label: "View history",
      onClick: (row) => void openView(row.product),
    },
    {
      type: "edit",
      label: "Adjust stock",
      onClick: (row) => openEdit(row.product),
    },
  ];
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Inventory Control
            </h2>
            <p className="text-sm text-muted-foreground">
              Monitor stock levels, adjust quantities, and track inventory
              health across the business.
            </p>
          </div>
          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="Inventory Items"
              value={String(summary.inventory_items)}
              description={`${summary.category_count} categories tracked`}
              icon={<Package className="size-5" />}
            />
            <MetricCard
              title="Low Stock"
              value={String(summary.low_stock_count)}
              description="Products below minimum threshold"
              icon={<AlertTriangle className="size-5" />}
            />
            <MetricCard
              title="Out of Stock"
              value={String(summary.out_of_stock_count)}
              description="Unavailable products affecting sales"
              icon={<TrendingDown className="size-5" />}
            />
            <MetricCard
              title="Inventory Cost Value"
              value={formatProductCurrency(summary.inventory_cost_value)}
              description="Immutable cost evidence; unreconciled stock is unavailable"
              icon={<TrendingUp className="size-5" />}
            />
          </section>
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable
                title="Inventory Overview"
                description="Track stock quantities, thresholds, and category-level stock position"
                data={rows}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder="Search by product name or SKU..."
                pageSize={10}
                onRowClick={(row) => void openView(row.product)}
                emptyMessage={
                  loading
                    ? "Loading inventory..."
                    : "No inventory records found."
                }
                toolbarActions={
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await refreshInventory();
                      toast.success("Inventory refreshed");
                    }}>
                    <RefreshCw className="mr-2 size-4" />
                    Refresh
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={view} onOpenChange={setView}>
        <DialogContent className="max-h-[90vh] w-full max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              Review product inventory, pricing, and stock history.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-6 py-2">
              <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-semibold">
                      {selected.product_name}
                    </h3>
                    <Badge
                      variant={selected.is_active ? "outline" : "destructive"}>
                      {selected.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {selected.is_low_stock && (
                      <Badge
                        variant="outline"
                        className="border-amber-500/60 text-amber-700">
                        Low Stock
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    SKU:{" "}
                    <span className="font-mono text-foreground">
                      {selected.sku}
                    </span>
                  </p>
                </div>
                <Badge variant="outline" className="w-fit">
                  {selected.category_name}
                </Badge>
              </div>
              <div className="grid gap-8 lg:grid-cols-2">
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <h4 className="font-semibold">Pricing</h4>
                    {[
                      [
                        "Cost Price",
                        formatProductCurrency(selected.cost_price),
                      ],
                      [
                        "Selling Price",
                        formatProductCurrency(selected.selling_price),
                      ],
                      [
                        "Profit Per Unit",
                        formatProductCurrency(
                          selected.selling_price - selected.cost_price,
                        ),
                      ],
                    ].map(([label, value]) => (
                      <div className="flex justify-between" key={label}>
                        <span className="text-muted-foreground">{label}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <h4 className="font-semibold">Stock Position</h4>
                    {[
                      ["Current Stock", selected.quantity_on_hand],
                      [
                        "Stock Value",
                        selected.inventory_cost_value === null
                          ? "Unavailable"
                          : formatProductCurrency(
                              selected.inventory_cost_value,
                            ),
                      ],
                      ["Minimum Stock", selected.min_stock_level],
                      ["Maximum Stock", selected.max_stock_level],
                    ].map(([label, value]) => (
                      <div className="flex justify-between" key={label}>
                        <span className="text-muted-foreground">{label}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={
                          selected.is_low_stock
                            ? "h-full bg-amber-500"
                            : "h-full bg-primary"
                        }
                        style={{
                          width: `${Math.min(100, (selected.quantity_on_hand / Math.max(selected.max_stock_level, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardContent className="p-4">
                  <h4 className="mb-3 font-semibold">Stock History</h4>
                  {logs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No inventory adjustments recorded.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <div
                          className="flex justify-between border-b pb-2 text-sm"
                          key={log.id}>
                          <span>
                            {new Date(log.date).toLocaleDateString()} ·{" "}
                            {log.adjustment_type.replaceAll("_", " ")} ·{" "}
                            {log.reason}
                          </span>
                          <span className="font-medium">
                            {log.quantity} → {log.balance_after}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Sheet open={sheet} onOpenChange={setSheet}>
        <SheetContent className="w-full overflow-y-auto bg-white p-6 dark:bg-[#323232] sm:max-w-xl">
          <SheetHeader className="text-left">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Edit3 className="size-5 text-primary" />
              </div>
              <div>
                <SheetTitle>Adjust Stock</SheetTitle>
                <SheetDescription>
                  Update inventory quantity using the inventory service.
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-6">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="font-semibold">{selected.product_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selected.sku} · {selected.category_name}
                </p>
              </div>
              <Separator />
              <div className="grid grid-cols-3 gap-4">
                {[
                  ["Current Stock", selected.quantity_on_hand],
                  ["Min Stock", selected.min_stock_level],
                  ["Max Stock", selected.max_stock_level],
                ].map(([label, value]) => (
                  <div className="space-y-2" key={label}>
                    <Label>{label}</Label>
                    <Input value={String(value)} disabled />
                  </div>
                ))}
              </div>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Box className="size-4" />
                  <h3 className="font-semibold">Adjust Quantity</h3>
                </div>
                <div className="space-y-2">
                  <FieldLabel required>Adjustment Quantity</FieldLabel>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setData((old) => ({
                          ...old,
                          adjustment_qty: String(
                            Math.max(0, Number(old.adjustment_qty || 0) - 1),
                          ),
                        }))
                      }>
                      <Minus className="size-4" />
                    </Button>
                    <Input
                      type="number"
                      min="0"
                      value={data.adjustment_qty}
                      onChange={(e) =>
                        setData((old) => ({
                          ...old,
                          adjustment_qty: e.target.value,
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setData((old) => ({
                          ...old,
                          adjustment_qty: String(
                            Number(old.adjustment_qty || 0) + 1,
                          ),
                        }))
                      }>
                      <Plus className="size-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Quantity is always positive. Increase or decrease is
                    determined by adjustment type.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Adjustment Type</Label>
                  <Select
                    value={data.adjustment_type}
                    onValueChange={(value: AdjustmentType) =>
                      setData((old) => ({ ...old, adjustment_type: value }))
                    }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input
                    value={data.adjustment_reason}
                    onChange={(e) =>
                      setData((old) => ({
                        ...old,
                        adjustment_reason: e.target.value,
                      }))
                    }
                    placeholder="Reason for adjustment"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    value={data.notes}
                    onChange={(e) =>
                      setData((old) => ({ ...old, notes: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
                {data.adjustment_qty && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-sm font-medium">Projected Stock Level</p>
                    <p className="text-2xl font-bold">
                      {projected} {selected.stock_unit}
                    </p>
                    <p className="text-xs">
                      Current: {selected.quantity_on_hand} → New: {projected}
                    </p>
                  </div>
                )}
              </div>
              <SheetFooter>
                <Button variant="outline" onClick={() => setSheet(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    const quantity = parseInt(data.adjustment_qty || "0", 10);
                    if (!quantity || quantity <= 0) {
                      toast.error("Enter a valid adjustment quantity");
                      return;
                    }
                    const success = await adjust(selected.product_id, {
                      quantity,
                      adjustment_type: data.adjustment_type,
                      reason:
                        data.adjustment_reason.trim() || "Inventory adjustment",
                      notes: data.notes.trim() || undefined,
                    });
                    if (success) {
                      toast.success("Stock adjusted");
                      setSheet(false);
                    }
                  }}>
                  Save Changes
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
