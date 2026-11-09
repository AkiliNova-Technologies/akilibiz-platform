"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Package, RefreshCw } from "lucide-react";
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

export type Position = TableData & {
  id: string;
  product_id: string;
  on_hand_milli: number | null;
  reserved_milli: number | null;
  damaged_milli: number | null;
  minimum_milli: number | null;
  maximum_milli: number | null;
  is_current: boolean;
  snapshot_at: string;
  ledger_checkpoint_id?: string | null;
  ledger_movement_id?: number | null;
  product_name?: string;
  sku?: string;
};
export type ProductSummary = {
  id: string;
  name: string;
  sku: string;
  stock_unit: string;
  is_active: boolean;
};

type InventoryRow = Position & {
  product_name: string;
  sku: string;
  category: null;
  current_stock: number | null;
  min_stock: number | null;
  max_stock: number | null;
  last_restock: null;
  status: "In Stock" | "Low Stock" | "Out of Stock" | "Overstocked" | null;
};

function exactQuantity(milli: number | null, unit: string) {
  if (milli === null || !Number.isSafeInteger(milli)) return "—";
  return `${new Intl.NumberFormat("en-UG", { maximumFractionDigits: 3 }).format(milli / 1000)} ${unit}`;
}

function stockStatus(position: Position): InventoryRow["status"] {
  if (position.on_hand_milli === null || !Number.isSafeInteger(position.on_hand_milli)) return null;
  if (position.on_hand_milli <= 0) return "Out of Stock";
  if (position.minimum_milli !== null && Number.isSafeInteger(position.minimum_milli) &&
      position.on_hand_milli <= position.minimum_milli) return "Low Stock";
  if (position.maximum_milli !== null && Number.isSafeInteger(position.maximum_milli) &&
      position.on_hand_milli > position.maximum_milli) return "Overstocked";
  if (position.minimum_milli === null || position.maximum_milli === null) return null;
  return "In Stock";
}

function StatusBadge({status}:{status:InventoryRow["status"]}) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant={status === "Out of Stock" ? "destructive" : status === "Low Stock" ? "secondary" : "outline"}>
      {status}
    </Badge>
  );
}

export function HostedInventory({
  positions,
  products,
  businessName: _businessName,
}: {
  positions: Position[];
  products: ProductSummary[];
  businessName: string;
}) {
  const [selectedPosition, setSelectedPosition] = useState<InventoryRow | null>(null);
  const productNames = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const rows = useMemo<InventoryRow[]>(() => (
    positions.filter((position) => position.is_current).map((position) => {
      const product = productNames.get(position.product_id);
      return {
        ...position,
        product_name: product?.name ?? position.product_name ?? "Unknown product",
        sku: product?.sku ?? position.sku ?? "",
        category: null,
        current_stock: position.on_hand_milli,
        min_stock: position.minimum_milli,
        max_stock: position.maximum_milli,
        last_restock: null,
        status: stockStatus(position),
      };
    })
  ), [positions, productNames]);

  // Missing thresholds or quantities must not be mistaken for healthy stock.
  const hasVerifiedQuantities = rows.every((row) => row.on_hand_milli !== null && Number.isSafeInteger(row.on_hand_milli));
  const hasVerifiedThresholds = rows.every((row) =>
    row.minimum_milli !== null && Number.isSafeInteger(row.minimum_milli) &&
    row.maximum_milli !== null && Number.isSafeInteger(row.maximum_milli),
  );
  const lowStockCount = hasVerifiedQuantities && hasVerifiedThresholds
    ? rows.filter((row) => row.status === "Low Stock").length : null;
  const outOfStockCount = hasVerifiedQuantities
    ? rows.filter((row) => row.status === "Out of Stock").length : null;

  const unitFor = (productId: string) => productNames.get(productId)?.stock_unit ?? "units";
  const fields: TableField<InventoryRow>[] = [
    { key: "product_name", header: "Product", enableSorting: true },
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
      enableSorting: false,
      cell: () => <span className="text-muted-foreground">—</span>,
    },
    {
      key: "current_stock",
      header: "Current Stock",
      align: "center",
      enableSorting: true,
      cell: (_, row) => {
        if (row.on_hand_milli === null || !Number.isSafeInteger(row.on_hand_milli)) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <Badge variant={row.status === "Out of Stock" ? "destructive" : row.status === "Low Stock" ? "secondary" : "outline"}>
            {exactQuantity(row.on_hand_milli, unitFor(row.product_id))}
          </Badge>
        );
      },
    },
    {
      key: "min_stock",
      header: "Min Stock",
      align: "center",
      cell: (_, row) => <span className="text-sm text-muted-foreground">{exactQuantity(row.minimum_milli, unitFor(row.product_id))}</span>,
    },
    {
      key: "max_stock",
      header: "Max Stock",
      align: "center",
      cell: (_, row) => <span className="text-sm text-muted-foreground">{exactQuantity(row.maximum_milli, unitFor(row.product_id))}</span>,
    },
    {
      key: "last_restock",
      header: "Last Updated",
      align: "center",
      enableSorting: false,
      cell: () => <span className="text-muted-foreground">—</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) => <StatusBadge status={value as InventoryRow["status"]} />,
    },
  ];
  const actions: TableAction<InventoryRow>[] = [
    { type: "view", label: "View details", onClick: setSelectedPosition },
    { type: "edit", label: "Adjust stock", onClick: () => {}, disabled: () => true },
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 md:gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Inventory Control</h2>
        <p className="text-sm text-muted-foreground">
          Monitor stock levels, adjust quantities, and track inventory health across the business.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MetricCard title="Inventory Items" value={String(rows.length)}
          description="Current stock positions" icon={<Package className="size-5" />} />
        <MetricCard title="Low Stock" value={lowStockCount === null ? "—" : String(lowStockCount)}
          description="Products below minimum stock" icon={<AlertTriangle className="size-5" />} />
        <MetricCard title="Out of Stock" value={outOfStockCount === null ? "—" : String(outOfStockCount)}
          description="Products currently unavailable" icon={<ArrowDownRight className="size-5" />} />
        <MetricCard title="Stock Value" value="—"
          description="Cost valuation unavailable" icon={<ArrowUpRight className="size-5" />} />
      </section>

      <Card>
        <CardContent className="min-w-0 px-3 pb-4 sm:px-4 md:px-6 md:pb-6">
          <DataTable<InventoryRow>
            title="Inventory Overview"
            description="Current inventory quantities and stock status."
            data={rows}
            fields={fields}
            actions={actions}
            enableGlobalSearch
            searchPlaceholder="Search by product name or SKU..."
            pageSize={10}
            onRowClick={setSelectedPosition}
            emptyMessage="No current inventory positions are available."
            toolbarActions={
              <Button type="button" variant="outline" size="icon" disabled
                aria-label="Refresh inventory" title="Refreshing hosted inventory is not connected">
                <RefreshCw className="size-4" />
              </Button>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={selectedPosition !== null} onOpenChange={(open) => { if (!open) setSelectedPosition(null); }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-full max-w-5xl min-w-0 overflow-x-hidden overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>Review recorded stock quantities for this product.</DialogDescription>
          </DialogHeader>
          {selectedPosition && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  {([
                    ["Product", selectedPosition.product_name],
                    ["SKU", selectedPosition.sku],
                    ["Category", "—"],
                    ["Current Stock", exactQuantity(selectedPosition.on_hand_milli, unitFor(selectedPosition.product_id))],
                    ["Minimum Stock", exactQuantity(selectedPosition.minimum_milli, unitFor(selectedPosition.product_id))],
                    ["Maximum Stock", exactQuantity(selectedPosition.maximum_milli, unitFor(selectedPosition.product_id))],
                    ["Reserved Stock", exactQuantity(selectedPosition.reserved_milli, unitFor(selectedPosition.product_id))],
                    ["Damaged Stock", exactQuantity(selectedPosition.damaged_milli, unitFor(selectedPosition.product_id))],
                    ["Status", selectedPosition.status ?? "—"],
                    ["Stock Value", "—"],
                    ["Last Updated", "—"],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-right text-sm font-medium">{value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" disabled>View Stock History</Button>
                <Button disabled>Adjust Stock</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
