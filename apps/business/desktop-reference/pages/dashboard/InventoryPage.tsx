import {
  DataTable,
  type TableField,
  type TableAction,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  IconPackage,
  IconAlertTriangle,
  IconTrendingDown,
  IconRefresh,
  IconEdit,
  IconMinus,
  IconPlus,
  IconBox,
  IconTrendingUp,
} from "@tabler/icons-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useReduxInventory } from "@/hooks/useReduxInventory";
import type {
  AdjustmentType,
  InventoryOverviewItem,
} from "@/services/tauri/inventory";
import MetricCard from "@/components/metric-card";
import { useI18n } from "@/hooks/useI18n";
import { formatCurrency, formatDate } from "@/i18n";

interface InventoryRow {
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
  [key: string]: unknown;
}

function getStatus(
  item: InventoryOverviewItem,
): "In Stock" | "Low Stock" | "Out of Stock" | "Overstocked" {
  if (item.is_out_of_stock || item.quantity_on_hand === 0)
    return "Out of Stock";
  if (item.is_low_stock) return "Low Stock";
  if (item.is_overstocked) return "Overstocked";
  return "In Stock";
}

const adjustmentOptions: Array<{
  value: AdjustmentType;
  label: string;
  direction: "in" | "out" | "neutral";
}> = [
  { value: "stock_in", label: "Stock In", direction: "in" },
  { value: "stock_out", label: "Stock Out", direction: "out" },
  { value: "damaged", label: "Damaged", direction: "out" },
  { value: "lost", label: "Lost / Missing", direction: "out" },
  { value: "return_in", label: "Customer Return", direction: "in" },
  { value: "correction", label: "Inventory Correction", direction: "neutral" },
  { value: "opening_balance", label: "Opening Balance", direction: "in" },
];

export default function InventoryPage() {
  const { t } = useI18n();
  const {
    overview,
    summary,
    error,
    getOverview,
    getSummary,
    getLogs,
    getLowStock,
    refreshInventory,
    adjust,
    clearError,
  } = useReduxInventory();

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<InventoryOverviewItem | null>(null);

  const [formData, setFormData] = useState({
    current_stock: "",
    min_stock: "",
    max_stock: "",
    adjustment_qty: "",
    adjustment_reason: "",
    adjustment_type: "stock_in" as AdjustmentType,
    notes: "",
  });

  useEffect(() => {
    void Promise.all([getOverview(), getSummary(), getLowStock()]);
  }, [getOverview, getSummary, getLowStock]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleInputChange = useCallback(
    (field: string, value: string | number) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleView = useCallback(
    async (product: InventoryOverviewItem) => {
      setSelectedProduct(product);
      await getLogs(product.product_id);
      setViewDialogOpen(true);
    },
    [getLogs],
  );

  const handleEdit = useCallback((product: InventoryOverviewItem) => {
    setSelectedProduct(product);
    setFormData({
      current_stock: String(product.quantity_on_hand),
      min_stock: String(product.min_stock_level),
      max_stock: String(product.max_stock_level),
      adjustment_qty: "",
      adjustment_reason: "",
      adjustment_type: "stock_in",
      notes: "",
    });
    setEditSheetOpen(true);
  }, []);

  const inventoryItems = useMemo<InventoryRow[]>(() => {
    return overview.map((item) => ({
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
      status: getStatus(item),
      product: item,
    }));
  }, [overview]);

  const selectedAdjustmentMeta = useMemo(() => {
    return adjustmentOptions.find(
      (option) => option.value === formData.adjustment_type,
    );
  }, [formData.adjustment_type]);

  const projectedStock = useMemo(() => {
    if (!selectedProduct) return 0;

    const qty = parseInt(formData.adjustment_qty || "0", 10) || 0;
    const direction = selectedAdjustmentMeta?.direction;

    if (direction === "in") {
      return selectedProduct.quantity_on_hand + qty;
    }

    if (direction === "out") {
      return Math.max(0, selectedProduct.quantity_on_hand - qty);
    }

    return selectedProduct.quantity_on_hand;
  }, [selectedProduct, formData.adjustment_qty, selectedAdjustmentMeta]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!selectedProduct) return;

      const adjustmentQty = parseInt(formData.adjustment_qty || "0", 10);
      if (!adjustmentQty || adjustmentQty <= 0) {
        toast.error(t("inventory.quantityInvalid"));
        return;
      }

      const success = await adjust(selectedProduct.product_id, {
        quantity: adjustmentQty,
        adjustment_type: formData.adjustment_type,
        reason: formData.adjustment_reason.trim() || "Inventory adjustment",
        notes: formData.notes.trim() || undefined,
      });

      if (success) {
        setEditSheetOpen(false);
        if (viewDialogOpen) {
          await getLogs(selectedProduct.product_id);
        }
      }
    },
    [selectedProduct, formData, adjust, viewDialogOpen, getLogs, t],
  );

  const inventoryFields: TableField<InventoryRow>[] = useMemo(
    () => [
      {
        key: "product_name",
        header: t("inventory.product"),
        enableSorting: true,
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
        header: t("inventory.currentStock"),
        align: "center",
        enableSorting: true,
        cell: (value, row) => {
          const stock = Number(value);
          const min = Number(row.min_stock);
          const unit = row.stock_unit || "pcs";
          const variant =
            stock === 0
              ? "destructive"
              : stock <= min
                ? "secondary"
                : "outline";

          return <Badge variant={variant}>{`${stock} ${unit}`}</Badge>;
        },
      },
      {
        key: "min_stock",
        header: t("inventory.minStock"),
        align: "center",
        cell: (value) => (
          <span className="text-sm text-muted-foreground">{Number(value)}</span>
        ),
      },
      {
        key: "max_stock",
        header: t("inventory.maxStock"),
        align: "center",
        cell: (value) => (
          <span className="text-sm text-muted-foreground">{Number(value)}</span>
        ),
      },
      {
        key: "last_restock",
        header: t("inventory.lastUpdated"),
        align: "center",
        enableSorting: true,
        cell: (value) => {
          const date = new Date(String(value));
          return (
            <span className="text-sm text-muted-foreground">
              {formatDate(date)}
            </span>
          );
        },
      },
      {
        key: "status",
        header: t("products.status"),
        align: "center",
        cell: (value) => {
          const status = String(value);
          const variant =
            status === "Out of Stock"
              ? "destructive"
              : status === "Low Stock"
                ? "secondary"
                : "outline";

          return <Badge variant={variant}>{status}</Badge>;
        },
      },
    ],
    [t],
  );

  const inventoryActions: TableAction<InventoryRow>[] = useMemo(
    () => [
      {
        type: "view",
        label: t("inventory.viewHistory"),
        onClick: (row) => handleView(row.product),
      },
      {
        type: "edit",
        label: t("inventory.adjustStock"),
        onClick: (row) => handleEdit(row.product),
      },
    ],
    [handleView, handleEdit, t],
  );

  return (
    <>
      <SiteHeader label={t("inventory.title")} />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
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
              value={String(summary?.inventory_items ?? overview.length)}
              description={`${summary?.category_count ?? new Set(overview.map((i) => i.category_id)).size} categories tracked`}
              icon={<IconPackage className="size-5" />}
            />

            <MetricCard
              title="Low Stock"
              value={String(summary?.low_stock_count ?? 0)}
              description="Products below minimum threshold"
              icon={<IconAlertTriangle className="size-5" />}
            />

            <MetricCard
              title="Out of Stock"
              value={String(summary?.out_of_stock_count ?? 0)}
              description="Unavailable products affecting sales"
              icon={<IconTrendingDown className="size-5" />}
            />

            <MetricCard
              title="Inventory Cost Value"
              value={summary?.inventory_cost_value == null ? "Unavailable" : formatCurrency(summary.inventory_cost_value)}
              description="Immutable cost evidence; unreconciled stock is unavailable"
              icon={<IconTrendingUp className="size-5" />}
            />
          </section>

          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<InventoryRow>
                title="Inventory Overview"
                description="Track stock quantities, thresholds, and category-level stock position"
                data={inventoryItems}
                fields={inventoryFields}
                actions={inventoryActions}
                enableGlobalSearch
                searchPlaceholder="Search by product name or SKU..."
                pageSize={10}
                onRowClick={(row) => handleView(row.product)}
                toolbarActions={
                  <Button
                    variant="outline"
                    onClick={async () => {
                      await refreshInventory();
                      toast.success("Inventory refreshed");
                    }}
                  >
                    <IconRefresh className="size-4" />
                    Refresh
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-h-[90vh] min-w-3xl w-full max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("products.details")}</DialogTitle>
            <DialogDescription>{t("products.detailsDescription")}</DialogDescription>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6 py-2">
              <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-semibold">{selectedProduct.product_name}</h3>
                    <Badge variant={selectedProduct.is_active ? "outline" : "destructive"}>
                      {selectedProduct.is_active ? t("common.active") : t("common.inactive")}
                    </Badge>
                    {selectedProduct.is_low_stock && (
                      <Badge variant="outline" className="border-amber-500/60 text-amber-700 dark:text-amber-400">Low Stock</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span>SKU: <span className="font-mono text-foreground">{selectedProduct.sku}</span></span>
                    {selectedProduct.barcode && <span>Barcode: <span className="font-mono text-foreground">{selectedProduct.barcode}</span></span>}
                  </div>
                </div>
                <Badge variant="outline" className="w-fit">{selectedProduct.category_name}</Badge>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                <section aria-labelledby="product-pricing-heading" className="space-y-3">
                  <div><h4 id="product-pricing-heading" className="font-semibold">{t("products.pricing")}</h4><p className="text-sm text-muted-foreground">Cost, selling price, and profitability</p></div>
                  <dl className="divide-y border-y text-sm">
                    <div className="flex items-center justify-between gap-4 py-3"><dt className="text-muted-foreground">Cost Price</dt><dd className="font-medium">{formatCurrency(selectedProduct.cost_price)}</dd></div>
                    <div className="flex items-center justify-between gap-4 py-3"><dt className="text-muted-foreground">Selling Price</dt><dd className="font-semibold">{formatCurrency(selectedProduct.selling_price)}</dd></div>
                    <div className="flex items-center justify-between gap-4 py-3"><dt className="text-muted-foreground">Profit Margin</dt><dd>{selectedProduct.cost_price ? (((selectedProduct.selling_price - selectedProduct.cost_price) / selectedProduct.cost_price) * 100).toFixed(1) : "0.0"}%</dd></div>
                    <div className="flex items-center justify-between gap-4 py-3"><dt className="text-muted-foreground">Profit Per Unit</dt><dd>{formatCurrency(selectedProduct.selling_price - selectedProduct.cost_price)}</dd></div>
                  </dl>
                </section>

                <section aria-labelledby="product-stock-heading" className="space-y-3">
                  <div><h4 id="product-stock-heading" className="font-semibold">{t("products.stockPosition")}</h4><p className="text-sm text-muted-foreground">Availability and stock thresholds</p></div>
                  <dl className="divide-y border-y text-sm">
                    <div className="flex items-center justify-between gap-4 py-3"><dt className="text-muted-foreground">Current Stock</dt><dd className="font-semibold">{selectedProduct.quantity_on_hand}</dd></div>
                    <div className="flex items-center justify-between gap-4 py-3"><dt className="text-muted-foreground">Stock Value</dt><dd className="font-medium">{selectedProduct.inventory_cost_value == null ? "Unavailable" : formatCurrency(selectedProduct.inventory_cost_value)}</dd></div>
                    <div className="flex items-center justify-between gap-4 py-3"><dt className="text-muted-foreground">Minimum Stock</dt><dd>{selectedProduct.min_stock_level}</dd></div>
                    <div className="flex items-center justify-between gap-4 py-3"><dt className="text-muted-foreground">Maximum Stock</dt><dd>{selectedProduct.max_stock_level}</dd></div>
                  </dl>
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between gap-4 text-sm"><span className="text-muted-foreground">Stock Fill Level</span><span className="font-medium">{selectedProduct.quantity_on_hand} / {selectedProduct.max_stock_level}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Stock fill level" aria-valuemin={0} aria-valuemax={Math.max(selectedProduct.max_stock_level, 1)} aria-valuenow={Math.min(selectedProduct.quantity_on_hand, Math.max(selectedProduct.max_stock_level, 1))}>
                      <div className={`h-full rounded-full ${selectedProduct.quantity_on_hand === 0 ? "bg-destructive" : selectedProduct.quantity_on_hand <= selectedProduct.min_stock_level ? "bg-amber-500" : "bg-primary"}`} style={{ width: `${Math.min(100, (selectedProduct.quantity_on_hand / Math.max(selectedProduct.max_stock_level, 1)) * 100)}%` }} />
                    </div>
                  </div>
                </section>
              </div>

              <section aria-labelledby="product-description-heading" className="space-y-3 border-t pt-6">
                <h4 id="product-description-heading" className="font-semibold">{t("productForm.description")}</h4>
                {selectedProduct.description ? <p className="whitespace-pre-wrap text-sm leading-6">{selectedProduct.description}</p> : <p className="text-sm text-muted-foreground">No description provided.</p>}
              </section>

              <section aria-labelledby="product-metadata-heading" className="space-y-3 border-t pt-6">
                <h4 id="product-metadata-heading" className="font-semibold">{t("products.metadata")}</h4>
                <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-4 border-b pb-3"><dt className="text-muted-foreground">{t("products.id")}</dt><dd className="font-mono">{selectedProduct.product_id}</dd></div>
                  <div className="flex items-center justify-between gap-4 border-b pb-3"><dt className="text-muted-foreground">{t("products.created")}</dt><dd>{formatDate(selectedProduct.created_at)}</dd></div>
                  <div className="flex items-center justify-between gap-4 border-b pb-3"><dt className="text-muted-foreground">Last Updated</dt><dd>{formatDate(selectedProduct.updated_at)}</dd></div>
                  <div className="flex items-center justify-between gap-4 border-b pb-3"><dt className="text-muted-foreground">Inventory Status</dt><dd>{selectedProduct.quantity_on_hand === 0 ? "Out of Stock" : selectedProduct.is_low_stock ? "Needs Restocking" : "Adequate Stock"}</dd></div>
                </dl>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent
          className="w-full sm:max-w-xl overflow-y-auto p-0 bg-white dark:bg-[#323232]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-[#323232]">
            <SheetHeader className="text-left dark:bg-[#323232]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <IconEdit className="size-5 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-xl text-gray-900 dark:text-primary">
                    Adjust Stock
                  </SheetTitle>
                  <SheetDescription className="text-gray-600 dark:text-gray-400">
                    Update inventory quantity using the inventory service
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
          </div>

          <div className="px-6 py-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              {selectedProduct && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 dark:bg-[#323232] dark:border-gray-700">
                  <p className="font-semibold text-gray-900 mb-1 dark:text-primary">
                    {selectedProduct.product_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {selectedProduct.sku}
                    </span>
                    <Badge
                      variant="outline"
                      className="dark:border-gray-600 dark:text-gray-300"
                    >
                      {selectedProduct.category_name}
                    </Badge>
                  </div>
                </div>
              )}

              <Separator className="dark:bg-gray-700" />

              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/30">
                    <IconBox className="size-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-primary">
                    Stock Levels
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="current_stock"
                      className="text-sm dark:text-gray-300"
                    >
                      Current Stock
                    </Label>
                    <Input
                      id="current_stock"
                      type="number"
                      value={formData.current_stock}
                      disabled
                      className="bg-gray-50 dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="min_stock"
                      className="text-sm dark:text-gray-300"
                    >
                      Min Stock
                    </Label>
                    <Input
                      id="min_stock"
                      type="number"
                      value={formData.min_stock}
                      disabled
                      className="bg-gray-50 dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="max_stock"
                      className="text-sm dark:text-gray-300"
                    >
                      Max Stock
                    </Label>
                    <Input
                      id="max_stock"
                      type="number"
                      value={formData.max_stock}
                      disabled
                      className="bg-gray-50 dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white"
                    />
                  </div>
                </div>

                <p className="text-xs text-muted-foreground dark:text-gray-400">
                  Threshold editing is not wired through the current inventory
                  backend yet.
                </p>
              </div>

              <Separator className="dark:bg-gray-700" />

              <div className="space-y-5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-purple-100 dark:bg-purple-900/30">
                    <IconTrendingUp className="size-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-primary">
                    Adjust Quantity
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <FieldLabel
                      required
                      htmlFor="adjustment_qty"
                      className="text-sm dark:text-gray-300"
                    >
                      Adjustment Quantity
                    </FieldLabel>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const current =
                            parseInt(formData.adjustment_qty || "0", 10) || 0;
                          handleInputChange(
                            "adjustment_qty",
                            Math.max(0, current - 1),
                          );
                        }}
                        className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <IconMinus className="size-4" />
                      </Button>

                      <Input
                        id="adjustment_qty"
                        required
                        type="number"
                        min="0"
                        value={formData.adjustment_qty}
                        onChange={(e) =>
                          handleInputChange("adjustment_qty", e.target.value)
                        }
                        className="text-center dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500"
                      />

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const current =
                            parseInt(formData.adjustment_qty || "0", 10) || 0;
                          handleInputChange("adjustment_qty", current + 1);
                        }}
                        className="dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <IconPlus className="size-4" />
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground dark:text-gray-400">
                      Quantity is always positive. Increase or decrease is
                      determined by adjustment type.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="adjustment_type"
                      className="text-sm dark:text-gray-300"
                    >
                      Adjustment Type
                    </Label>

                    <Select
                      value={formData.adjustment_type}
                      onValueChange={(value: AdjustmentType) =>
                        handleInputChange("adjustment_type", value)
                      }
                    >
                      <SelectTrigger
                        id="adjustment_type"
                        className="w-full dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white"
                      >
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>

                      <SelectContent className="dark:bg-[#2c2c2c] dark:border-gray-600">
                        {adjustmentOptions.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="dark:text-white dark:hover:bg-[#444444]"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="adjustment_reason"
                      className="text-sm dark:text-gray-300"
                    >
                      Reason
                    </Label>
                    <Input
                      id="adjustment_reason"
                      value={formData.adjustment_reason}
                      onChange={(e) =>
                        handleInputChange("adjustment_reason", e.target.value)
                      }
                      placeholder="Reason for adjustment"
                      className="dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="notes"
                      className="text-sm dark:text-gray-300"
                    >
                      Notes (Optional)
                    </Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        handleInputChange("notes", e.target.value)
                      }
                      placeholder="Additional details..."
                      rows={3}
                      className="dark:bg-[#2c2c2c] dark:border-gray-600 dark:text-white dark:placeholder:text-gray-500"
                    />
                  </div>
                </div>

                {selectedProduct && formData.adjustment_qty && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-[#2c2c2c] dark:border-gray-700">
                    <p className="text-sm font-medium text-blue-900 mb-1 dark:text-gray-400">
                      Projected Stock Level
                    </p>
                    <p className="text-2xl font-bold text-blue-900 mb-1 dark:text-primary">
                      {projectedStock} {selectedProduct.stock_unit}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-gray-400">
                      Current: {selectedProduct.quantity_on_hand} → New:{" "}
                      {projectedStock}
                    </p>
                  </div>
                )}
              </div>
            </form>
          </div>

          <div className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-[#323232]">
            <SheetFooter className="flex flex-row items-center gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditSheetOpen(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 flex-1 dark:bg-[#444444] dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </Button>

              <Button type="submit" onClick={handleSubmit} className="flex-1">
                Save Changes
              </Button>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
