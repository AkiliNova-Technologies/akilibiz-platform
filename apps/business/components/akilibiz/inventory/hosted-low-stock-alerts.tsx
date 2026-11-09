"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowUp, ClipboardList, Package, TrendingDown } from "lucide-react";
import { DataTable, type TableAction, type TableData, type TableField } from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { Position, ProductSummary } from "@/components/akilibiz/inventory/hosted-inventory";

type AlertStatus = "Low Stock" | "Out of Stock" | "Critical";
type AlertRow = TableData & {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  category: null;
  current_stock: number;
  min_stock: number;
  shortage: number;
  stock_unit: string;
  status: AlertStatus;
  last_updated: null;
};

function formatQuantity(milli: number, unit: string) {
  return `${new Intl.NumberFormat("en-UG", { maximumFractionDigits: 3 }).format(milli / 1000)} ${unit}`;
}
function StatusBadge({ status }: { status: AlertStatus }) {
  return <Badge variant={status === "Out of Stock" ? "destructive" : "outline"}>{status}</Badge>;
}

export function HostedLowStockAlerts({ positions, products }: { positions: Position[]; products: ProductSummary[] }) {
  const [selected, setSelected] = useState<AlertRow | null>(null);
  const [restock, setRestock] = useState<AlertRow | null>(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("Low stock replenishment");
  const [notes, setNotes] = useState("");

  const productNames = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );
  const currentPositions = useMemo(() => positions.filter((position) => position.is_current), [positions]);
  const alertsComplete = currentPositions.every((position) =>
    position.on_hand_milli !== null && Number.isSafeInteger(position.on_hand_milli) &&
    position.minimum_milli !== null && Number.isSafeInteger(position.minimum_milli),
  );
  const rows = useMemo<AlertRow[]>(() => currentPositions.flatMap((position) => {
    const current = position.on_hand_milli;
    const minimum = position.minimum_milli;
    if (current === null || minimum === null || !Number.isSafeInteger(current) ||
      !Number.isSafeInteger(minimum) || current > minimum) return [];
    const product = productNames.get(position.product_id);
    const status: AlertStatus = current <= 0 ? "Out of Stock" :
      minimum > 0 && current * 2 <= minimum ? "Critical" : "Low Stock";
    return [{
      id: position.id,
      product_id: position.product_id,
      product_name: product?.name ?? position.product_name ?? "Unknown product",
      sku: product?.sku ?? position.sku ?? "",
      category: null,
      current_stock: current,
      min_stock: minimum,
      shortage: Math.max(0, minimum - current),
      stock_unit: product?.stock_unit ?? "units",
      status,
      last_updated: null,
    }];
  }), [currentPositions, productNames]);

  const lowCount = alertsComplete ? rows.filter((row) => row.status === "Low Stock").length : null;
  const outCount = alertsComplete ? rows.filter((row) => row.status === "Out of Stock").length : null;
  const criticalCount = alertsComplete ? rows.filter((row) => row.status === "Critical").length : null;

  const fields: TableField<AlertRow>[] = [
    { key: "product_name", header: "Product", enableSorting: true, cell: (value) => <span className="font-medium">{String(value)}</span> },
    { key: "sku", header: "SKU", align: "center", cell: (value) => <span className="font-mono text-sm">{String(value)}</span> },
    { key: "category", header: "Category", align: "center", enableSorting: false, cell: () => <span className="text-muted-foreground">—</span> },
    { key: "current_stock", header: "Current Stock", align: "center", enableSorting: true, cell: (_, row) =>
      <Badge variant={row.current_stock <= 0 ? "destructive" : "outline"}>{formatQuantity(row.current_stock, row.stock_unit)}</Badge> },
    { key: "min_stock", header: "Min Stock", align: "center", enableSorting: true, cell: (_, row) =>
      <span className="text-sm text-muted-foreground">{formatQuantity(row.min_stock, row.stock_unit)}</span> },
    { key: "shortage", header: "Shortage", align: "center", enableSorting: true, cell: (_, row) =>
      <span className="font-medium">{formatQuantity(row.shortage, row.stock_unit)}</span> },
    { key: "status", header: "Status", align: "center", cell: (value) => <StatusBadge status={value as AlertStatus} /> },
    { key: "last_updated", header: "Last Updated", align: "center", enableSorting: false, cell: () =>
      <span className="text-muted-foreground">—</span> },
  ];

  const openRestock = (row: AlertRow) => {
    setRestock(row);
    setQuantity(String(row.shortage / 1000));
    setReason("Low stock replenishment");
    setNotes("");
  };
  const actions: TableAction<AlertRow>[] = [
    { type: "view", label: "View", onClick: setSelected },
    { type: "custom", label: "Restock (unavailable)", icon: <ArrowUp className="size-4" />, onClick: openRestock, disabled: () => false },
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Stock Alerts</h2>
        <p className="text-sm text-muted-foreground">Keep track of products running low or out of stock.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MetricCard title="Low Stock Items" value={lowCount === null ? "—" : String(lowCount)}
          description="Products below minimum stock" icon={<Package className="size-5" />} />
        <MetricCard title="Out of Stock" value={outCount === null ? "—" : String(outCount)}
          description="Products currently unavailable" icon={<TrendingDown className="size-5" />} />
        <MetricCard title="Critical Stock" value={criticalCount === null ? "—" : String(criticalCount)}
          description="Products needing urgent attention" icon={<AlertTriangle className="size-5" />} />
        <MetricCard title="Value at Risk" value="—"
          description="Product cost values unavailable" icon={<ClipboardList className="size-5" />} />
      </section>

      <Card>
        <CardContent className="px-6 pb-6">
          <DataTable<AlertRow>
            title="Low Stock Alerts" description="Products that need restocking."
            data={rows} fields={fields} actions={actions}
            enableGlobalSearch searchPlaceholder="Search stock alerts..."
            pageSize={10} onRowClick={setSelected}
            emptyMessage={alertsComplete
              ? "No products currently need restocking."
              : "No verified low stock alerts to display. Some stock quantities or minimum levels are unavailable."}
            onRefresh={() => {}} refreshDisabled
          />
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Stock Alert Details</DialogTitle>
            <DialogDescription>Review the stock shortage for this product.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <Card><CardContent className="space-y-3 p-4">
                {([
                  ["Product", selected.product_name],
                  ["SKU", selected.sku],
                  ["Category", "—"],
                  ["Current Stock", formatQuantity(selected.current_stock, selected.stock_unit)],
                  ["Minimum Stock", formatQuantity(selected.min_stock, selected.stock_unit)],
                  ["Shortage", formatQuantity(selected.shortage, selected.stock_unit)],
                  ["Last Updated", "—"],
                ] as const).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-right text-sm font-medium">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between gap-4">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusBadge status={selected.status} />
                </div>
              </CardContent></Card>
              <Button className="w-full" onClick={() => { openRestock(selected); setSelected(null); }}>
                <ArrowUp className="size-4" />Restock Product
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={restock !== null} onOpenChange={(open) => { if (!open) setRestock(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Restock Product</DialogTitle>
            <DialogDescription>Review the planned quantity for {restock?.product_name}. Saving stock adjustments is not yet available.</DialogDescription>
          </DialogHeader>
          {restock && (
            <div className="space-y-4">
              <Card><CardContent className="space-y-3 p-4">
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Current Stock</span><span>{formatQuantity(restock.current_stock, restock.stock_unit)}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Minimum Stock</span><span>{formatQuantity(restock.min_stock, restock.stock_unit)}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">Shortage</span><span>{formatQuantity(restock.shortage, restock.stock_unit)}</span></div>
              </CardContent></Card>
              <div className="space-y-2"><FieldLabel required>Quantity</FieldLabel>
                <Input type="number" min="0" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
              </div>
              <div className="space-y-2"><FieldLabel required>Reason</FieldLabel>
                <Input value={reason} onChange={(event) => setReason(event.target.value)} />
              </div>
              <div className="space-y-2"><Label>Notes</Label>
                <Textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setRestock(null)}>Cancel</Button>
                <Button type="button" className="flex-1" disabled title="Stock posting is unavailable">Save Restock</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
