"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, ClipboardList, Eye, History } from "lucide-react";
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
} from "@/components/akilibiz/inventory/inventory-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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
const date = (value: string) =>
  new Date(value).toLocaleString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export default function InventoryStockHistoryPage() {
  const [detail, setDetail] = useState<Row | null>(null);
  // The hosted service does not yet expose a business-scoped movement ledger.
  // Never present demonstration movements as recorded inventory transactions.
  const rows: Row[] = [];
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
      header: "Movement Type",
      align: "center",
      cell: (value) => (
        <Badge
          variant={
            value === "damaged" || value === "lost" ? "destructive" : "outline"
          }>
          {labels[value as AdjustmentType | ""]}
        </Badge>
      ),
    },
    {
      key: "quantity_change",
      header: "Quantity Change",
      align: "center",
      enableSorting: true,
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
      enableSorting: true,
      cell: (value, row) => `${value} ${row.stock_unit}`,
    },
    {
      key: "stock_after",
      header: "After",
      align: "center",
      enableSorting: true,
      cell: (value, row) => `${value} ${row.stock_unit}`,
    },
    {
      key: "performed_by",
      header: "Performed By",
      align: "center",
      enableSorting: true,
    },
    {
      key: "created_at",
      header: "Date & Time",
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {date(String(value))}
        </span>
      ),
    },
  ];
  const actions: TableAction<Row>[] = [
    {
      type: "custom",
      label: "Inspect details",
      icon: <Eye className="size-4" />,
      onClick: setDetail,
    },
  ];
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Stock Movement History
            </h2>
            <p className="text-sm text-muted-foreground">
              Review stock movement, audit references, and inventory history.
            </p>
          </div>
          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="Total Movements"
              value="—"
              description="Movement records unavailable"
              icon={<History className="size-5" />}
            />
            <MetricCard
              title="Stock Added"
              value="—"
              description="Incoming movements unavailable"
              icon={<ArrowUp className="size-5" />}
            />
            <MetricCard
              title="Stock Removed"
              value="—"
              description="Outgoing movements unavailable"
              icon={<ArrowDown className="size-5" />}
            />
            <MetricCard
              title="Adjustment Events"
              value="—"
              description="Adjustment records unavailable"
              icon={<ClipboardList className="size-5" />}
            />
          </section>
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable
                title="Stock Movement Ledger"
                description="Search and review product, movement type, quantities, and audit information"
                data={rows}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder="Search stock history..."
                pageSize={10}
                onRowClick={setDetail}
                emptyMessage="Stock movement history is unavailable until the hosted movement ledger is connected."
                onRefresh={() => {}}
                refreshDisabled
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog
        open={Boolean(detail)}
        onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Movement Details</DialogTitle>
            <DialogDescription>
              Review the complete stock movement audit record.
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
                  ["Date & Time", date(detail.created_at)],
                ].map(([label, value]) => (
                  <div className="flex justify-between gap-4" key={label}>
                    <span className="text-sm text-muted-foreground">
                      {label}
                    </span>
                    <span className="text-right font-medium">{value}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Movement Type
                  </span>
                  <Badge
                    variant={
                      detail.movement_type === "damaged" ||
                      detail.movement_type === "lost"
                        ? "destructive"
                        : "outline"
                    }>
                    {labels[detail.movement_type]}
                  </Badge>
                </div>
                {detail.notes && (
                  <>
                    <Separator />
                    <div>
                      <p className="mb-1 text-sm text-muted-foreground">
                        Notes
                      </p>
                      <p className="text-sm">{detail.notes}</p>
                    </div>
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
