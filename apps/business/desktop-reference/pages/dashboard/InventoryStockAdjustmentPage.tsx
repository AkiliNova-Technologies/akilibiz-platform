import * as React from "react";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowUp,
  IconClipboardList,
} from "@tabler/icons-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import MetricCard from "@/components/metric-card";
import { useReduxInventory } from "@/hooks/useReduxInventory";
import type {
  AdjustmentType,
  InventoryOverviewItem,
  StockMovement,
} from "@/services/tauri/inventory";
import { useReduxProducts } from "@/hooks/useReduxProducts";
import { useI18n } from "@/hooks/useI18n";

// ============================================================================
// TYPES
// ============================================================================

interface ProductOption {
  id: number;
  name: string;
  sku: string;
  stock_quantity: number;
  stock_unit: string;
}

interface AdjustmentRow extends TableData {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  adjustment_type: string;
  quantity_change: number;
  stock_before: number;
  stock_after: number;
  stock_unit: string;
  reason: string;
  notes?: string;
  performed_by: string;
  created_at: string;
}

interface AdjustmentFormData {
  product_id: string;
  adjustment_type: AdjustmentType | "";
  quantity: string;
  opening_unit_cost_ugx: string;
  reason: string;
  notes: string;
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

function formatAdjustmentLabel(
  type: string,
  t: ReturnType<typeof useI18n>["t"],
) {
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

function getAdjustmentBadge(type: string, t: ReturnType<typeof useI18n>["t"]) {
  if (type === "damaged" || type === "lost") {
    return <Badge variant="destructive">{formatAdjustmentLabel(type, t)}</Badge>;
  }

  return (
    <Badge variant="outline" className="text-xs">
      {formatAdjustmentLabel(type, t)}
    </Badge>
  );
}

function mapMovementToRow(
  movement: StockMovement,
  systemLabel: string,
): AdjustmentRow {
  return {
    id: movement.id,
    product_id: movement.product_id,
    product_name: movement.product_name,
    sku: movement.sku,
    adjustment_type: movement.movement_type,
    quantity_change: movement.quantity_change,
    stock_before: movement.stock_before,
    stock_after: movement.stock_after,
    stock_unit: movement.stock_unit,
    reason: movement.reason,
    notes: movement.notes || "",
    performed_by: movement.performed_by || systemLabel,
    created_at: movement.created_at,
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function InventoryStockAdjustmentPage() {
  const { t } = useI18n();
  const {
    overview,
    summary,
    logs,
    loading,
    error,
    getOverview,
    getSummary,
    getLogs,
    getLowStock,
    refreshInventory,
    adjust,
    clearError,
  } = useReduxInventory();

  const { products, getProducts } = useReduxProducts();

  const [selectedAdjustment, setSelectedAdjustment] =
    React.useState<AdjustmentRow | null>(null);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  const [formData, setFormData] = React.useState<AdjustmentFormData>({
    product_id: "",
    adjustment_type: "",
    quantity: "",
    opening_unit_cost_ugx: "",
    reason: "",
    notes: "",
  });

  React.useEffect(() => {
  void Promise.all([
    getOverview(), 
    getSummary(), 
    getLowStock(), 
    getLogs(),
    getProducts()
  ]);
}, [getOverview, getSummary, getLowStock, getLogs, getProducts]);

  React.useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  React.useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const productOptions = React.useMemo<ProductOption[]>(() => {
  // First try from overview (inventory data)
  const fromOverview = overview.map((item: InventoryOverviewItem) => ({
    id: item.product_id,
    name: item.product_name,
    sku: item.sku,
    stock_quantity: item.quantity_on_hand,
    stock_unit: item.stock_unit || "pcs",
  }));

  if (fromOverview.length > 0) {
    return fromOverview;
  }

  // Fallback to products list
  return products.map((product: ProductOption) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    stock_quantity: product.stock_quantity || 0,
    stock_unit: product.stock_unit || "pcs",
  }));
}, [overview, products]);

  const adjustmentRows = React.useMemo<AdjustmentRow[]>(() => {
    return logs.map((movement) => mapMovementToRow(movement, t("inventory.system")));
  }, [logs, t]);

  const selectedProduct = React.useMemo(
    () => productOptions.find((p) => String(p.id) === formData.product_id),
    [formData.product_id, productOptions],
  );

  const computedChange = React.useMemo(() => {
    const qty = Number(formData.quantity || 0);
    const type = formData.adjustment_type;

    if (!type) return 0;

    if (
      type === "stock_in" ||
      type === "return_in" ||
      type === "opening_balance"
    ) {
      return Math.abs(qty);
    }

    if (type === "stock_out" || type === "damaged" || type === "lost") {
      return -Math.abs(qty);
    }

    return qty;
  }, [formData.quantity, formData.adjustment_type]);

  const stockPreview = React.useMemo(() => {
    if (!selectedProduct) return null;
    return selectedProduct.stock_quantity + computedChange;
  }, [selectedProduct, computedChange]);

  const stats = React.useMemo(() => {
    const totalAdjustments =
      summary?.total_adjustments ?? adjustmentRows.length;

    const addedStock =
      summary?.added_stock_total ??
      adjustmentRows
        .filter((a) => a.quantity_change > 0)
        .reduce((sum, a) => sum + a.quantity_change, 0);

    const removedStock =
      summary?.removed_stock_total ??
      adjustmentRows
        .filter((a) => a.quantity_change < 0)
        .reduce((sum, a) => sum + Math.abs(a.quantity_change), 0);

    const criticalAdjustments =
      summary?.critical_adjustments_count ??
      adjustmentRows.filter(
        (a) => a.adjustment_type === "damaged" || a.adjustment_type === "lost",
      ).length;

    return {
      totalAdjustments,
      addedStock,
      removedStock,
      criticalAdjustments,
    };
  }, [summary, adjustmentRows]);

  const handleInputChange = (
    field: keyof AdjustmentFormData,
    value: string,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      product_id: "",
      adjustment_type: "",
      quantity: "",
      opening_unit_cost_ugx: "",
      reason: "",
      notes: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      toast.error(t("inventory.selectProductError"));
      return;
    }

    if (!formData.adjustment_type) {
      toast.error(t("inventory.selectTypeError"));
      return;
    }

    if (!formData.quantity || Number(formData.quantity) <= 0) {
      toast.error(t("inventory.validQuantityError"));
      return;
    }

    if (!formData.reason.trim()) {
      toast.error(t("inventory.reasonRequired"));
      return;
    }
    if (formData.adjustment_type === "opening_balance" && (!/^\d+$/.test(formData.opening_unit_cost_ugx))) {
      toast.error("Opening stock requires a whole-UGX unit cost");
      return;
    }

    const success = await adjust(selectedProduct.id, {
      quantity: Number(formData.quantity),
      adjustment_type: formData.adjustment_type,
      reason: formData.reason.trim(),
      notes: formData.notes.trim() || undefined,
      opening_unit_cost_ugx: formData.adjustment_type === "opening_balance" ? Number(formData.opening_unit_cost_ugx) : undefined,
    });

    if (success) {
      await getLogs();
      resetForm();
    }
  };

  const adjustmentFields: TableField<AdjustmentRow>[] = [
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
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "adjustment_type",
      header: t("finance.type"),
      align: "center",
      cell: (value) => getAdjustmentBadge(String(value), t),
    },
    {
      key: "quantity_change",
      header: t("inventory.quantityChange"),
      align: "center",
      enableSorting: true,
      cell: (value, row) => {
        const qty = Number(value);
        const unit = row.stock_unit || "pcs";

        return (
          <span className={`font-medium ${qty < 0 ? "text-destructive" : ""}`}>
            {qty > 0 ? "+" : ""}
            {qty} {unit}
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

  const adjustmentActions: TableAction<AdjustmentRow>[] = [
    {
      type: "view",
      label: t("inventory.inspectDetails"),
      onClick: (row) => {
        setSelectedAdjustment(row);
        setDetailsOpen(true);
      },
    },
  ];

  const handleRefresh = async () => {
    await Promise.all([refreshInventory(), getLogs()]);
    toast.success(t("inventory.pageRefreshed"));
  };

  return (
    <>
      <SiteHeader label={t("inventory.adjustment")} />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("inventory.adjustmentHeading")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("inventory.adjustmentIntro")}
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title={t("inventory.totalAdjustments")}
              value={String(stats.totalAdjustments)}
              description={t("inventory.allChanges")}
              icon={<IconClipboardList className="size-5" />}
            />

            <MetricCard
              title={t("inventory.stockAdded")}
              value={String(stats.addedStock)}
              description={t("inventory.incoming")}
              icon={<IconArrowUp className="size-5" />}
            />

            <MetricCard
              title={t("inventory.stockRemoved")}
              value={String(stats.removedStock)}
              description={t("inventory.outgoing")}
              icon={<IconArrowDown className="size-5" />}
            />

            <MetricCard
              title={t("inventory.criticalCases")}
              value={String(stats.criticalAdjustments)}
              description={t("inventory.lossesDamages")}
              icon={<IconAlertTriangle className="size-5" />}
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("inventory.newAdjustment")}</CardTitle>
                <CardDescription>
                  {t("inventory.controlledChange")}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <FieldLabel required>{t("inventory.product")}</FieldLabel>
                    <Select
                      value={formData.product_id}
                      onValueChange={(value) =>
                        handleInputChange("product_id", value)
                      }
                    >
                      <SelectTrigger aria-required="true" className="w-full">
                        <SelectValue placeholder={t("inventory.selectProduct")} />
                      </SelectTrigger>
                      <SelectContent>
                        {productOptions.map((product) => (
                          <SelectItem
                            key={product.id}
                            value={String(product.id)}
                          >
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <FieldLabel required>{t("inventory.adjustmentType")}</FieldLabel>
                    <Select
                      value={formData.adjustment_type}
                      onValueChange={(value) =>
                        handleInputChange(
                          "adjustment_type",
                          value as AdjustmentType,
                        )
                      }
                    >
                      <SelectTrigger aria-required="true" className="w-full">
                        <SelectValue placeholder={t("inventory.selectAdjustmentType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stock_in">{t("inventory.stockIn")}</SelectItem>
                        <SelectItem value="stock_out">{t("inventory.stockOut")}</SelectItem>
                        <SelectItem value="damaged">{t("inventory.damaged")}</SelectItem>
                        <SelectItem value="lost">{t("inventory.lost")}</SelectItem>
                        <SelectItem value="return_in">
                          {t("inventory.returnIn")}
                        </SelectItem>
                        <SelectItem value="correction">{t("inventory.correction")}</SelectItem>
                        <SelectItem value="opening_balance">
                          {t("inventory.openingBalance")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <FieldLabel required>{t("inventory.quantity")}</FieldLabel>
                    <Input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) =>
                        handleInputChange("quantity", e.target.value)
                      }
                      placeholder={t("inventory.enterQuantity")}
                    />
                  </div>

                  {formData.adjustment_type === "opening_balance" && (
                    <div className="space-y-2">
                      <Label>Opening unit cost (UGX)</Label>
                      <Input type="number" min="0" step="1" value={formData.opening_unit_cost_ugx} onChange={(e) => handleInputChange("opening_unit_cost_ugx", e.target.value)} />
                    </div>
                  )}

                  <div className="space-y-2">
                    <FieldLabel required>{t("inventory.reason")}</FieldLabel>
                    <Input
                      required
                      value={formData.reason}
                      onChange={(e) =>
                        handleInputChange("reason", e.target.value)
                      }
                      placeholder={t("inventory.reasonHint")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>{t("inventory.notes")}</Label>
                    <Textarea
                      rows={4}
                      value={formData.notes}
                      onChange={(e) =>
                        handleInputChange("notes", e.target.value)
                      }
                      placeholder={t("inventory.notesHint")}
                    />
                  </div>

                  {selectedProduct &&
                    formData.adjustment_type &&
                    formData.quantity && (
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">{t("inventory.preview")}</p>

                        <div className="mt-2 space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>{t("inventory.current")}</span>
                            <span className="font-medium">
                              {selectedProduct.stock_quantity}{" "}
                              {selectedProduct.stock_unit}
                            </span>
                          </div>

                          <div className="flex justify-between">
                            <span>{t("inventory.change")}</span>
                            <span className="font-medium">
                              {computedChange > 0 ? "+" : ""}
                              {computedChange} {selectedProduct.stock_unit}
                            </span>
                          </div>

                          <div className="mt-2 flex justify-between border-t pt-2">
                            <span>{t("inventory.newStock")}</span>
                            <span className="font-semibold">
                              {stockPreview} {selectedProduct.stock_unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {t("inventory.saveAdjustment")}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <DataTable<AdjustmentRow>
                  title={t("inventory.adjustmentHistory")}
                  description={t("inventory.adjustmentHistoryDescription")}
                  data={adjustmentRows}
                  fields={adjustmentFields}
                  actions={adjustmentActions}
                  enableGlobalSearch
                  searchPlaceholder={t("inventory.searchHistory")}
                  pageSize={5}
                  onRowClick={(row) => {
                    setSelectedAdjustment(row);
                    setDetailsOpen(true);
                  }}
                  emptyMessage={t("inventory.noAdjustments")}
                  onRefresh={handleRefresh}
                  refreshing={loading}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("inventory.adjustmentDetails")}</DialogTitle>
            <DialogDescription>
              {t("inventory.adjustmentDetailsDescription")}
            </DialogDescription>
          </DialogHeader>

          {selectedAdjustment && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t("inventory.product")}
                    </span>
                    <span className="text-right font-medium">
                      {selectedAdjustment.product_name}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">SKU</span>
                    <span className="font-mono">{selectedAdjustment.sku}</span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{t("finance.type")}</span>
                    {getAdjustmentBadge(selectedAdjustment.adjustment_type, t)}
                  </div>

                  <Separator />

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t("inventory.before")}
                    </span>
                    <span className="font-medium">
                      {selectedAdjustment.stock_before}{" "}
                      {selectedAdjustment.stock_unit}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t("inventory.change")}
                    </span>
                    <span
                      className={`font-medium ${
                        selectedAdjustment.quantity_change < 0
                          ? "text-destructive"
                          : ""
                      }`}
                    >
                      {selectedAdjustment.quantity_change > 0 ? "+" : ""}
                      {selectedAdjustment.quantity_change}{" "}
                      {selectedAdjustment.stock_unit}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{t("inventory.after")}</span>
                    <span className="font-medium">
                      {selectedAdjustment.stock_after}{" "}
                      {selectedAdjustment.stock_unit}
                    </span>
                  </div>

                  <Separator />

                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">{t("inventory.reason")}</p>
                    <p className="text-sm">{selectedAdjustment.reason}</p>
                  </div>

                  {selectedAdjustment.notes && (
                    <div>
                      <p className="mb-1 text-sm text-muted-foreground">
                        {t("inventory.notes")}
                      </p>
                      <p className="text-sm">{selectedAdjustment.notes}</p>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t("inventory.performedBy")}
                    </span>
                    <span className="font-medium">
                      {selectedAdjustment.performed_by}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-sm text-muted-foreground">
                      {t("inventory.dateTime")}
                    </span>
                    <span className="text-right font-medium">
                      {formatDateTime(selectedAdjustment.created_at)}
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
