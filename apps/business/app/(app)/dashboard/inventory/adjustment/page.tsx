"use client";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import {
  type AdjustmentType,
  type StockMovement,
  useInventoryData,
} from "@/components/akilibiz/inventory/inventory-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
type Row = StockMovement & TableData;
const labels: Record<AdjustmentType | "", string> = {
  "": "",
  stock_in: "Stock In",
  stock_out: "Stock Out",
  damaged: "Damaged",
  lost: "Lost / Missing",
  return_in: "Customer Return",
  correction: "Inventory Correction",
  opening_balance: "Opening Balance",
};
const timestamp = (value: string) =>
  new Date(value).toLocaleString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export default function InventoryStockAdjustmentPage() {
  const {
    overview,
    loading,
    getOverview,
    getSummary,
    getLowStock,
    refreshInventory,
    adjust,
  } = useInventoryData();
  const [movements, setMovements] = useState<Row[]>([]);
  const [detail, setDetail] = useState<Row | null>(null);
  const [form, setForm] = useState({
    product_id: "",
    adjustment_type: "" as AdjustmentType | "",
    quantity: "",
    opening_unit_cost_ugx: "",
    reason: "",
    notes: "",
  });
  useEffect(() => {
    void Promise.all([getOverview(), getSummary(), getLowStock()]);
  }, [getOverview, getSummary, getLowStock]);
  const product = overview.find(
    (item) => String(item.product_id) === form.product_id,
  );
  const change = useMemo(() => {
    const q = Math.abs(Number(form.quantity || 0));
    return ["stock_in", "return_in", "opening_balance"].includes(
      form.adjustment_type,
    )
      ? q
      : ["stock_out", "damaged", "lost"].includes(form.adjustment_type)
        ? -q
        : Number(form.quantity || 0);
  }, [form]);
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
      key: "movement_type",
      header: "Type",
      align: "center",
      cell: (value) => (
        <Badge
          variant={
            value === "damaged" || value === "lost" ? "destructive" : "outline"
          }>
          {labels[value as AdjustmentType]}
        </Badge>
      ),
    },
    {
      key: "quantity_change",
      header: "Quantity Change",
      align: "center",
      cell: (value, row) => (
        <span
          className={
            Number(value) < 0 ? "font-medium text-destructive" : "font-medium"
          }>
          {Number(value) > 0 ? "+" : ""}
          {Number(value)} {row.stock_unit}
        </span>
      ),
    },
    {
      key: "stock_before",
      header: "Before",
      align: "center",
      cell: (value, row) => `${value} ${row.stock_unit}`,
    },
    {
      key: "stock_after",
      header: "After",
      align: "center",
      cell: (value, row) => `${value} ${row.stock_unit}`,
    },
    { key: "performed_by", header: "Performed By", align: "center" },
    {
      key: "created_at",
      header: "Date & Time",
      align: "center",
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {timestamp(String(value))}
        </span>
      ),
    },
  ];
  const actions: TableAction<Row>[] = [
    { type: "view", label: "Inspect details", onClick: setDetail },
  ];
  const submit = async () => {
    if (!product) {
      toast.error("Select a product");
      return;
    }
    if (!form.adjustment_type) {
      toast.error("Select an adjustment type");
      return;
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      toast.error("Enter a valid quantity");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("A reason is required");
      return;
    }
    if (
      form.adjustment_type === "opening_balance" &&
      !/^\d+$/.test(form.opening_unit_cost_ugx)
    ) {
      toast.error("Opening stock requires a whole-UGX unit cost");
      return;
    }
    const before = product.quantity_on_hand;
    const success = await adjust(product.product_id, {
      quantity: Number(form.quantity),
      adjustment_type: form.adjustment_type,
      reason: form.reason.trim(),
      notes: form.notes.trim() || undefined,
    });
    if (!success) return;
    setMovements((old) => [
      {
        id: Date.now(),
        product_id: product.product_id,
        product_name: product.product_name,
        sku: product.sku,
        movement_type: form.adjustment_type,
        quantity_change: change,
        stock_before: before,
        stock_after: Math.max(0, before + change),
        stock_unit: product.stock_unit,
        reason: form.reason.trim(),
        notes: form.notes.trim() || undefined,
        performed_by: "System",
        created_at: new Date().toISOString(),
        opening_unit_cost_ugx:
          form.adjustment_type === "opening_balance"
            ? Number(form.opening_unit_cost_ugx)
            : undefined,
      },
      ...old,
    ]);
    setForm({
      product_id: "",
      adjustment_type: "",
      quantity: "",
      opening_unit_cost_ugx: "",
      reason: "",
      notes: "",
    });
    toast.success("Stock adjustment saved");
  };
  const added = movements
      .filter((m) => m.quantity_change > 0)
      .reduce((s, m) => s + m.quantity_change, 0),
    removed = movements
      .filter((m) => m.quantity_change < 0)
      .reduce((s, m) => s + Math.abs(m.quantity_change), 0);
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Stock Adjustment
            </h2>
            <p className="text-sm text-muted-foreground">
              Record controlled stock changes and inspect adjustment activity.
            </p>
          </div>
          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="Total Adjustments"
              value={String(movements.length)}
              description="All recorded stock changes"
              icon={<ClipboardList className="size-5" />}
            />
            <MetricCard
              title="Stock Added"
              value={String(added)}
              description="Incoming inventory"
              icon={<ArrowUp className="size-5" />}
            />
            <MetricCard
              title="Stock Removed"
              value={String(removed)}
              description="Outgoing inventory"
              icon={<ArrowDown className="size-5" />}
            />
            <MetricCard
              title="Critical Cases"
              value={String(
                movements.filter(
                  (m) =>
                    m.movement_type === "damaged" || m.movement_type === "lost",
                ).length,
              )}
              description="Losses and damages"
              icon={<AlertTriangle className="size-5" />}
            />
          </section>
          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">New Adjustment</CardTitle>
                <CardDescription>
                  Record a controlled inventory change.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <FieldLabel required>Product</FieldLabel>
                  <Select
                    value={form.product_id}
                    onValueChange={(value) =>
                      setForm((old) => ({ ...old, product_id: value }))
                    }>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {overview.map((p) => (
                        <SelectItem
                          key={p.product_id}
                          value={String(p.product_id)}>
                          {p.product_name} ({p.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel required>Adjustment Type</FieldLabel>
                  <Select
                    value={form.adjustment_type}
                    onValueChange={(value: AdjustmentType) =>
                      setForm((old) => ({ ...old, adjustment_type: value }))
                    }>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select adjustment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(labels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <FieldLabel required>Quantity</FieldLabel>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((old) => ({ ...old, quantity: e.target.value }))
                    }
                  />
                </div>
                {form.adjustment_type === "opening_balance" && (
                  <div className="space-y-2">
                    <Label>Opening unit cost (UGX)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={form.opening_unit_cost_ugx}
                      onChange={(e) =>
                        setForm((old) => ({
                          ...old,
                          opening_unit_cost_ugx: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <FieldLabel required>Reason</FieldLabel>
                  <Input
                    value={form.reason}
                    onChange={(e) =>
                      setForm((old) => ({ ...old, reason: e.target.value }))
                    }
                    placeholder="Reason for adjustment"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) =>
                      setForm((old) => ({ ...old, notes: e.target.value }))
                    }
                  />
                </div>
                {product && form.adjustment_type && form.quantity && (
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Preview</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Current</span>
                        <span>
                          {product.quantity_on_hand} {product.stock_unit}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Change</span>
                        <span>
                          {change > 0 ? "+" : ""}
                          {change} {product.stock_unit}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2 font-semibold">
                        <span>New Stock</span>
                        <span>
                          {product.quantity_on_hand + change}{" "}
                          {product.stock_unit}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  className="w-full"
                  disabled={loading}
                  onClick={() => void submit()}>
                  Save Adjustment
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <DataTable
                  title="Adjustment History"
                  description="Review stock movement and audit activity"
                  data={movements}
                  fields={fields}
                  actions={actions}
                  enableGlobalSearch
                  searchPlaceholder="Search adjustment history..."
                  pageSize={5}
                  onRowClick={setDetail}
                  emptyMessage="No adjustments recorded."
                  onRefresh={async () => {
                    await refreshInventory();
                    toast.success("Stock adjustment page refreshed");
                  }}
                  refreshing={loading}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Dialog
        open={Boolean(detail)}
        onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adjustment Details</DialogTitle>
            <DialogDescription>
              Review the recorded inventory adjustment.
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <Card>
              <CardContent className="space-y-3 p-4">
                {[
                  ["Product", detail.product_name],
                  ["SKU", detail.sku],
                  ["Before", `${detail.stock_before} ${detail.stock_unit}`],
                  [
                    "Change",
                    `${detail.quantity_change > 0 ? "+" : ""}${detail.quantity_change} ${detail.stock_unit}`,
                  ],
                  ["After", `${detail.stock_after} ${detail.stock_unit}`],
                  ["Reason", detail.reason],
                  ["Performed By", detail.performed_by],
                  ["Date & Time", timestamp(detail.created_at)],
                ].map(([label, value]) => (
                  <div className="flex justify-between gap-4" key={label}>
                    <span className="text-sm text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-right font-medium">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge>{labels[detail.movement_type]}</Badge>
                </div>
                {detail.notes && (
                  <>
                    <Separator />
                    <p className="text-sm">{detail.notes}</p>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
