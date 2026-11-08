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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  IconArrowDown,
  IconArrowUp,
  IconClipboardList,
  IconEye,
  IconHistory,
} from "@tabler/icons-react";
import { toast } from "sonner";
import MetricCard from "@/components/metric-card";
import { useReduxInventory } from "@/hooks/useReduxInventory";
import type { StockMovement } from "@/services/tauri/inventory";
import { useI18n } from "@/hooks/useI18n";

// ============================================================================
// TYPES
// ============================================================================

type StockMovementType =
  | "stock_in"
  | "stock_out"
  | "damaged"
  | "lost"
  | "return_in"
  | "correction"
  | "opening_balance";

interface StockHistoryRow extends TableData {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  movement_type: StockMovementType | string;
  quantity_change: number;
  stock_before: number;
  stock_after: number;
  stock_unit: string;
  reason: string;
  notes?: string;
  performed_by: string;
  created_at: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMovementLabel(type: string, t: ReturnType<typeof useI18n>["t"]) {
  switch (type) {
    case "stock_in":
      return t("inventory.stockIn");
    case "stock_out":
      return t("inventory.stockOut");
    case "damaged":
      return t("inventory.damaged");
    case "lost":
      return t("inventory.lost");
    case "return_in":
      return t("inventory.returnIn");
    case "correction":
      return t("inventory.correction");
    case "opening_balance":
      return t("inventory.openingBalance");
    default:
      return type
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

function getMovementBadge(type: string, t: ReturnType<typeof useI18n>["t"]) {
  if (type === "damaged" || type === "lost") {
    return <Badge variant="destructive">{getMovementLabel(type, t)}</Badge>;
  }

  return <Badge variant="outline">{getMovementLabel(type, t)}</Badge>;
}

function mapMovementToRow(
  movement: StockMovement,
  systemLabel: string,
): StockHistoryRow {
  return {
    id: movement.id,
    product_id: movement.product_id,
    product_name: movement.product_name,
    sku: movement.sku,
    movement_type: movement.movement_type,
    quantity_change: movement.quantity_change,
    stock_before: movement.stock_before,
    stock_after: movement.stock_after,
    stock_unit: movement.stock_unit || "pcs",
    reason: movement.reason,
    notes: movement.notes || "",
    performed_by: movement.performed_by || systemLabel,
    created_at: movement.created_at,
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InventoryStockHistoryPage() {
  const { t } = useI18n();
  const {
    logs,
    summary,
    loading,
    error,
    getLogs,
    getSummary,
    refreshInventory,
    clearError,
  } = useReduxInventory();

  const [selectedMovement, setSelectedMovement] =
    React.useState<StockHistoryRow | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  React.useEffect(() => {
    void Promise.all([getLogs(), getSummary()]);
  }, [getLogs, getSummary]);

  React.useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  React.useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const stockHistory = React.useMemo<StockHistoryRow[]>(() => {
    return logs.map((movement) => mapMovementToRow(movement, t("inventory.system")));
  }, [logs, t]);

  const stats = React.useMemo(() => {
    const totalMovements = summary?.total_adjustments ?? stockHistory.length;

    const stockAdded =
      summary?.added_stock_total ??
      stockHistory
        .filter((m) => m.quantity_change > 0)
        .reduce((sum, m) => sum + m.quantity_change, 0);

    const stockRemoved =
      summary?.removed_stock_total ??
      stockHistory
        .filter((m) => m.quantity_change < 0)
        .reduce((sum, m) => sum + Math.abs(m.quantity_change), 0);

    const adjustmentEvents =
      summary?.critical_adjustments_count ??
      stockHistory.filter(
        (m) =>
          m.movement_type === "correction" ||
          m.movement_type === "damaged" ||
          m.movement_type === "lost",
      ).length;

    return {
      totalMovements,
      stockAdded,
      stockRemoved,
      adjustmentEvents,
    };
  }, [summary, stockHistory]);

  const historyFields: TableField<StockHistoryRow>[] = [
    {
      key: "product_name",
      header: t("inventory.product"),
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
      key: "movement_type",
      header: t("inventory.movementType"),
      align: "center",
      cell: (value) => getMovementBadge(String(value), t),
    },
    {
      key: "quantity_change",
      header: t("inventory.quantityChange"),
      align: "center",
      enableSorting: true,
      cell: (value, row) => {
        const qty = Number(value);

        return (
          <span className={`font-medium ${qty < 0 ? "text-destructive" : ""}`}>
            {qty > 0 ? "+" : ""}
            {qty} {row.stock_unit}
          </span>
        );
      },
    },
    {
      key: "stock_before",
      header: t("inventory.before"),
      align: "center",
      enableSorting: true,
      cell: (value, row) => `${value} ${row.stock_unit}`,
    },
    {
      key: "stock_after",
      header: t("inventory.after"),
      align: "center",
      enableSorting: true,
      cell: (value, row) => `${value} ${row.stock_unit}`,
    },
    {
      key: "performed_by",
      header: t("inventory.performedBy"),
      align: "center",
      enableSorting: true,
    },
    {
      key: "created_at",
      header: t("inventory.dateTime"),
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(String(value))}
        </span>
      ),
    },
  ];

  const historyActions: TableAction<StockHistoryRow>[] = [
    {
      type: "custom",
      label: t("inventory.inspectDetails"),
      icon: <IconEye className="size-4" />,
      onClick: (row) => {
        setSelectedMovement(row);
        setDetailsOpen(true);
      },
    },
  ];

  const handleRefresh = async () => {
    await Promise.all([refreshInventory(), getLogs(), getSummary()]);
    toast.success(t("inventory.historyRefreshed"));
  };

  return (
    <>
      <SiteHeader label={t("inventory.history")} />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("inventory.movementHeading")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("inventory.movementIntro")}
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title={t("inventory.totalMovements")}
              value={String(stats.totalMovements)}
              description={t("inventory.allMovements")}
              icon={<IconHistory className="size-5" />}
            />

            <MetricCard
              title={t("inventory.stockAdded")}
              value={String(stats.stockAdded)}
              description={t("inventory.addedDescription")}
              icon={<IconArrowUp className="size-5" />}
            />

            <MetricCard
              title={t("inventory.stockRemoved")}
              value={String(stats.stockRemoved)}
              description={t("inventory.removedDescription")}
              icon={<IconArrowDown className="size-5" />}
            />

            <MetricCard
              title={t("inventory.events")}
              value={String(stats.adjustmentEvents)}
              description={t("inventory.eventsDescription")}
              icon={<IconClipboardList className="size-5" />}
            />
          </section>

          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<StockHistoryRow>
                title={t("inventory.movementLedger")}
                description={t("inventory.movementLedgerDescription")}
                data={stockHistory}
                fields={historyFields}
                actions={historyActions}
                enableGlobalSearch
                searchPlaceholder={t("inventory.searchHistory")}
                pageSize={10}
                onRowClick={(row) => {
                  setSelectedMovement(row);
                  setDetailsOpen(true);
                  }}
                  emptyMessage={t("inventory.noHistory")}
                  onRefresh={handleRefresh}
                  refreshing={loading}
                />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("inventory.movementDetails")}</DialogTitle>
            <DialogDescription>
              {t("inventory.movementDetailsDescription")}
            </DialogDescription>
          </DialogHeader>

          {selectedMovement && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{t("inventory.product")}</span>
                    <span className="text-right font-medium">
                      {selectedMovement.product_name}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">SKU</span>
                    <span className="font-mono">{selectedMovement.sku}</span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t("inventory.movementType")}
                    </span>
                    {getMovementBadge(selectedMovement.movement_type, t)}
                  </div>

                  <Separator />

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{t("inventory.before")}</span>
                    <span className="font-medium">
                      {selectedMovement.stock_before} {selectedMovement.stock_unit}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{t("inventory.change")}</span>
                    <span
                      className={`font-medium ${
                        selectedMovement.quantity_change < 0
                          ? "text-destructive"
                          : ""
                      }`}
                    >
                      {selectedMovement.quantity_change > 0 ? "+" : ""}
                      {selectedMovement.quantity_change}{" "}
                      {selectedMovement.stock_unit}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{t("inventory.after")}</span>
                    <span className="font-medium">
                      {selectedMovement.stock_after} {selectedMovement.stock_unit}
                    </span>
                  </div>

                  <Separator />

                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">{t("inventory.reason")}</p>
                    <p className="text-sm">{selectedMovement.reason}</p>
                  </div>

                  {selectedMovement.notes && (
                    <div>
                      <p className="mb-1 text-sm text-muted-foreground">{t("inventory.notes")}</p>
                      <p className="text-sm">{selectedMovement.notes}</p>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t("inventory.performedBy")}
                    </span>
                    <span className="font-medium">
                      {selectedMovement.performed_by}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t("inventory.dateTime")}
                    </span>
                    <span className="text-right font-medium">
                      {formatDateTime(selectedMovement.created_at)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
