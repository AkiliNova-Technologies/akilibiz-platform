"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ClipboardList } from "lucide-react";
import { DataTable, type TableAction, type TableData, type TableField } from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { Position, ProductSummary } from "@/components/akilibiz/inventory/hosted-inventory";

type AdjustmentType = "stock_in" | "stock_out" | "damaged" | "lost" | "return_in" | "correction" | "opening_balance";
type AdjustmentRow = TableData & {
  id: string;
  product_name: string;
  sku: string;
  adjustment_type: AdjustmentType;
  quantity_change: number;
  stock_before: number;
  stock_after: number;
  stock_unit: string;
  performed_by: string;
  created_at: string;
};
const adjustmentLabels: Record<AdjustmentType, string> = {
  stock_in: "Stock In",
  stock_out: "Stock Out",
  damaged: "Damaged",
  lost: "Lost / Missing",
  return_in: "Customer Return",
  correction: "Inventory Correction",
  opening_balance: "Opening Balance",
};
const stockDirections: Record<AdjustmentType, number> = {
  stock_in: 1, stock_out: -1, damaged: -1, lost: -1,
  return_in: 1, correction: 1, opening_balance: 1,
};
type Form = {
  product_id: string;
  adjustment_type: AdjustmentType | "";
  quantity: string;
  quantity_unit: "stock";
  opening_unit_cost_ugx: string;
  reason: string;
  notes: string;
};

const initialForm: Form = {
  product_id: "", adjustment_type: "", quantity: "",
  quantity_unit: "stock", opening_unit_cost_ugx: "", reason: "", notes: "",
};

function formatQuantity(milli: number | null, unit: string) {
  if (milli === null || !Number.isSafeInteger(milli)) return "—";
  return `${new Intl.NumberFormat("en-UG", { maximumFractionDigits: 3 }).format(milli / 1000)} ${unit}`;
}

export function HostedStockAdjustment({ positions, products, error }: {
  positions: Position[];
  products: ProductSummary[];
  error?: string | null;
}) {
  const [form, setForm] = useState<Form>(initialForm);
  const [selectedMovement, setSelectedMovement] = useState<AdjustmentRow | null>(null);

  const verifiedProducts = useMemo(() => {
    const names = new Map(products.filter((product) => product.is_active).map((product) => [product.id, product]));
    return positions.filter((position) =>
      position.is_current &&
      position.on_hand_milli !== null &&
      Number.isSafeInteger(position.on_hand_milli) &&
      names.has(position.product_id),
    ).map((position) => ({ position, product: names.get(position.product_id)! }));
  }, [positions, products]);

  const selected = verifiedProducts.find(({ product }) => product.id === form.product_id);
  const inputQuantity = Number(form.quantity);
  const quantityValid = form.quantity.trim() !== "" && Number.isFinite(inputQuantity)
    && inputQuantity > 0 && Math.round(inputQuantity * 1000) === inputQuantity * 1000;
  const currentQuantity = selected ? selected.position.on_hand_milli! / 1000 : null;
  const change = quantityValid && form.adjustment_type
    ? inputQuantity * stockDirections[form.adjustment_type] : null;
  const newStock = currentQuantity !== null && change !== null ? currentQuantity + change : null;
  // No hosted stock-movement listing or write operation is connected.
  const movements: AdjustmentRow[] = [];

  const fields: TableField<AdjustmentRow>[] = [
    { key: "product_name", header: "Product", enableSorting: true },
    { key: "sku", header: "SKU", align: "center", cell: (value) => <span className="font-mono text-sm">{String(value)}</span> },
    { key: "adjustment_type", header: "Type", align: "center", cell: (value) =>
      <Badge variant={value === "damaged" || value === "lost" ? "destructive" : "outline"}>
        {adjustmentLabels[value as AdjustmentType]}
      </Badge> },
    { key: "quantity_change", header: "Quantity Change", align: "center", enableSorting: true, cell: (value, row) =>
      <span className="font-medium">{Number(value) > 0 ? "+" : ""}{String(value)} {row.stock_unit}</span> },
    { key: "stock_before", header: "Before", align: "center", enableSorting: true, cell: (value, row) => `${value} ${row.stock_unit}` },
    { key: "stock_after", header: "After", align: "center", enableSorting: true, cell: (value, row) => `${value} ${row.stock_unit}` },
    { key: "performed_by", header: "Performed By", align: "center", enableSorting: true },
    { key: "created_at", header: "Date & Time", align: "center", enableSorting: true },
  ];
  const actions: TableAction<AdjustmentRow>[] = [
    { type: "view", label: "Inspect details", onClick: setSelectedMovement, disabled: () => true },
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Stock Adjustment</h2>
        <p className="text-sm text-muted-foreground">
          Record controlled stock changes and inspect adjustment activity.
        </p>
      </div>
      <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MetricCard title="Total Adjustments" value="—" description="Adjustment records unavailable" icon={<ClipboardList className="size-5" />} />
        <MetricCard title="Stock Added" value="—" description="Incoming inventory unavailable" icon={<ArrowUp className="size-5" />} />
        <MetricCard title="Stock Removed" value="—" description="Outgoing inventory unavailable" icon={<ArrowDown className="size-5" />} />
        <MetricCard title="Critical Cases" value="—" description="Losses and damages unavailable" icon={<AlertTriangle className="size-5" />} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Adjustment</CardTitle>
            <CardDescription>Record a controlled inventory change.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={(event) => event.preventDefault()}>
              <div className="space-y-2">
                <FieldLabel required>Product</FieldLabel>
                <Select value={form.product_id} onValueChange={(product_id) => setForm((old) => ({ ...old, product_id, quantity_unit: "stock" }))}>
                  <SelectTrigger aria-required="true" className="w-full">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {verifiedProducts.map(({ product }) => (
                      <SelectItem key={product.id} value={product.id}>{product.name} ({product.sku})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {verifiedProducts.length === 0 && !error && <p className="text-xs text-muted-foreground">No products with verified stock are available.</p>}
              </div>
              <div className="space-y-2">
                <FieldLabel required>Adjustment Type</FieldLabel>
                <Select value={form.adjustment_type} onValueChange={(adjustment_type) => setForm((old) => ({ ...old, adjustment_type: adjustment_type as AdjustmentType }))}>
                  <SelectTrigger aria-required="true" className="w-full">
                    <SelectValue placeholder="Select adjustment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(adjustmentLabels) as AdjustmentType[]).map((type) => (
                      <SelectItem key={type} value={type}>{adjustmentLabels[type]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <FieldLabel required>Quantity</FieldLabel>
                <Input type="number" min="0" step="0.001" required
                  value={form.quantity} onChange={(event) => setForm((old) => ({ ...old, quantity: event.target.value }))}
                  placeholder="Enter quantity" />
                {form.quantity.trim() && !quantityValid && (
                  <p role="alert" className="text-xs text-destructive">Enter a positive quantity with up to three decimal places.</p>
                )}
              </div>
              {selected && (
                <div className="space-y-2">
                  <Label>Enter quantity as</Label>
                  <Select value="stock" disabled>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="stock">Stock unit ({selected.product.stock_unit})</SelectItem></SelectContent>
                  </Select>
                </div>
              )}
              {form.adjustment_type === "opening_balance" && (
                <div className="space-y-2">
                  <Label htmlFor="opening-cost">Opening unit cost (UGX)</Label>
                  <Input id="opening-cost" type="number" min="0" step="1"
                    value={form.opening_unit_cost_ugx}
                    onChange={(event) => setForm((old) => ({ ...old, opening_unit_cost_ugx: event.target.value }))} />
                </div>
              )}
              <div className="space-y-2">
                <FieldLabel required>Reason</FieldLabel>
                <Input value={form.reason} onChange={(event) => setForm((old) => ({ ...old, reason: event.target.value }))}
                  placeholder="Reason for adjustment" />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea rows={4} value={form.notes}
                  onChange={(event) => setForm((old) => ({ ...old, notes: event.target.value }))} />
              </div>
              {selected && form.adjustment_type && form.quantity && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Preview</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Current</span><span className="font-medium">{formatQuantity(selected.position.on_hand_milli, selected.product.stock_unit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Change</span>
                      <span className="font-medium">{change === null ? "—" : `${change > 0 ? "+" : ""}${change} ${selected.product.stock_unit}`}</span>
                    </div>
                    <div className="mt-2 flex justify-between border-t pt-2">
                      <span>New Stock</span>
                      <span className="font-semibold">{newStock === null ? "—" : `${newStock} ${selected.product.stock_unit}`}</span>
                    </div>
                  </div>
                </div>
              )}
              <Button type="submit" className="w-full" disabled title="Stock adjustments are unavailable until posting is connected">
                Save Adjustment
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <DataTable<AdjustmentRow>
              title="Adjustment History"
              description="Review stock movement and audit activity"
              data={movements} fields={fields} actions={actions}
              enableGlobalSearch searchPlaceholder="Search adjustment history..."
              pageSize={5} onRowClick={undefined}
              emptyMessage={error ?? "Adjustment history is unavailable until stock movements are connected."}
              onRefresh={() => {}} refreshDisabled
            />
          </CardContent>
        </Card>
      </div>

      <Dialog open={selectedMovement !== null} onOpenChange={(open) => { if (!open) setSelectedMovement(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adjustment Details</DialogTitle>
            <DialogDescription>Review the recorded inventory adjustment.</DialogDescription>
          </DialogHeader>
          {selectedMovement && (
            <Card><CardContent className="space-y-3 p-4">
              {([
                ["Product", selectedMovement.product_name], ["SKU", selectedMovement.sku],
                ["Before", String(selectedMovement.stock_before)], ["Change", String(selectedMovement.quantity_change)],
                ["After", String(selectedMovement.stock_after)], ["Performed By", selectedMovement.performed_by],
              ] as const).map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-right text-sm font-medium">{value}</span>
                </div>
              ))}
              <Separator />
            </CardContent></Card>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
