import {
  DataTable,
  type TableData,
  type TableField,
  type TableAction,
} from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useReduxProducts } from "@/hooks/useReduxProducts";
import { useReduxCategories } from "@/hooks/useReduxCategories";
import { useReduxTax } from "@/hooks/useReduxTax";
import { ProductSheet, type ProductFormData } from "@/components/product-sheet";
import { ProductCsvImportDialog } from "@/components/ProductCsvImportDialog";
import { CsvImportHistoryDialog } from "@/components/CsvImportHistoryDialog";
import { save } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { importExportService } from "@/services/tauri/import-export";
import {
  IconAlertTriangle,
  IconPlus,
  IconCash,
  IconArchive,
  IconPackage,
  IconRefresh,
  IconUpload,
  IconDownload,
  IconReceiptTax,
  IconHistory,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MetricCard from "@/components/metric-card";
import { usePermissions } from "@/hooks/usePermissions";
import { useI18n } from "@/hooks/useI18n";
import { formatCurrency } from "@/i18n";

// ============================================================================
// TYPES
// ============================================================================

interface ProductRow extends TableData {
  id: number;
  name: string;
  sku: string;
  barcode?: string | null;
  description?: string | null;
  brand?: string | null;

  product_type?: "stock_item" | "service" | "digital" | "fee";
  inventory_type?: "count" | "weight" | "liquid" | "length" | "area" | "volume";

  stock_unit?: string;
  sales_unit?: string;
  purchase_unit?: string;
  unit_conversion_factor?: number | string;
  pack_size?: number | string;

  cost_price: number | string;
  selling_price: number | string;
  wholesale_price?: number | string;
  minimum_selling_price?: number | string;

  stock_quantity: number;
  min_stock_level: number;
  max_stock_level: number;

  allow_decimal_quantity?: boolean;
  allow_negative_stock?: boolean;
  track_expiry?: boolean;
  track_batches?: boolean;
  is_taxable?: boolean;
  tax_classification_id?: number | null;
  tax_inclusive?: boolean;

  category_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profit_margin: number;
  is_low_stock: boolean;
  category_name?: string;
}

const initialFormData: ProductFormData = {
  name: "",
  sku: "",
  barcode: "",
  category_id: "",
  brand: "",
  description: "",

  product_type: "stock_item",
  inventory_type: "count",

  stock_unit: "pcs",
  sales_unit: "pcs",
  purchase_unit: "pcs",
  unit_conversion_factor: "1",
  pack_size: "",

  cost_price: "",
  selling_price: "",
  wholesale_price: "",
  minimum_selling_price: "",

  stock_quantity: "",
  min_stock_level: "10",
  max_stock_level: "100",

  allow_decimal_quantity: false,
  allow_negative_stock: false,
  track_expiry: false,
  track_batches: false,
  is_taxable: false,
  tax_classification_id: "",
  tax_inclusive: false,
  is_active: true,
};

// ============================================================================
// UTILITIES
// ============================================================================

function toNumber(value: number | string | undefined | null) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value) || 0;
  return 0;
}

function productExportErrorMessage(error: unknown, t: ReturnType<typeof useI18n>["t"]) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("unauthorized") || message.includes("permission")) {
    return t("products.exportPermissionError");
  }
  if (message.includes("already exists")) {
    return t("products.exportExistsError");
  }
  if (message.includes(".csv") || message.includes("filename")) {
    return t("products.exportFilenameError");
  }
  if (message.includes("audit")) {
    return t("products.exportAuditError");
  }
  if (message.includes("write") || message.includes("destination")) {
    return t("products.exportDestinationError");
  }

  return t("products.exportError");
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProductsPage() {
  const { t } = useI18n();
  const { products, getProducts, addProduct, editProduct, removeProduct } =
    useReduxProducts();

  const { categories, getCategories } = useReduxCategories();
  const { classifications, getTaxClassifications } = useReduxTax();
  const { can } = usePermissions();

  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [choosingExportDestination, setChoosingExportDestination] = useState(false);
  const [exportingProducts, setExportingProducts] = useState(false);
  const [overwriteDestination, setOverwriteDestination] = useState<string | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<ProductRow | null>(null);

  useEffect(() => {
    getProducts();
    getCategories();
    getTaxClassifications();
  }, [getProducts, getCategories, getTaxClassifications]);

  const handleAdd = useCallback(() => {
    setAddSheetOpen(true);
  }, []);

  const handleView = useCallback((product: ProductRow) => {
    setCurrentProduct(product);
    setViewDialogOpen(true);
  }, []);

  const handleDelete = useCallback((product: ProductRow) => {
    setCurrentProduct(product);
    setDeleteDialogOpen(true);
  }, []);

  const handleEdit = useCallback((product: ProductRow) => {
    setCurrentProduct(product);
    setEditSheetOpen(true);
  }, []);

  const handleImport = useCallback(() => {
    setImportDialogOpen(true);
  }, []);

  const exportProductCatalogue = useCallback(async (destinationPath: string, overwrite: boolean) => {
    setExportingProducts(true);
    try {
      const result = await importExportService.exportProductCatalogueCsv(
        destinationPath,
        overwrite,
      );
      setOverwriteDestination(null);
      toast.success(t("products.exportSuccess"), {
        description: t("products.exportSummary", { fileName: result.file_name, count: result.row_count, label: t(result.row_count === 1 ? "products.product" : "products.products") }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (!overwrite && message.includes("already exists")) {
        setOverwriteDestination(destinationPath);
      } else {
        toast.error(t("products.exportFailed"), {
          description: productExportErrorMessage(error, t),
        });
      }
    } finally {
      setExportingProducts(false);
    }
  }, [t]);

  const handleExport = useCallback(async () => {
    setChoosingExportDestination(true);
    try {
      const selectedPath = await save({
        title: t("products.exportDialogTitle"),
        defaultPath: `akilibiz-product-catalogue-${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (typeof selectedPath === "string") {
        await exportProductCatalogue(selectedPath, false);
      }
    } catch {
      toast.error(t("products.saveDialogError"), {
        description: t("products.saveDialogDescription"),
      });
    } finally {
      setChoosingExportDestination(false);
    }
  }, [exportProductCatalogue, t]);

  const confirmDelete = useCallback(async () => {
    if (!currentProduct) return;

    const success = await removeProduct(currentProduct.id);
    if (success) {
      setDeleteDialogOpen(false);
      setCurrentProduct(null);
    }
  }, [currentProduct, removeProduct]);

  const handleAddSubmit = useCallback(
    async (formData: ProductFormData) => {
      const success = await addProduct({
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode || null,
        category_id: formData.category_id ? parseInt(formData.category_id) : 0,
        brand: formData.brand || null,
        description: formData.description || null,

        product_type: formData.product_type,
        inventory_type: formData.inventory_type,

        stock_unit: formData.stock_unit,
        sales_unit: formData.sales_unit,
        purchase_unit: formData.purchase_unit || null,
        unit_conversion_factor: formData.unit_conversion_factor
          ? parseFloat(formData.unit_conversion_factor)
          : 1,
        pack_size: formData.pack_size ? parseFloat(formData.pack_size) : null,

        cost_price: parseFloat(formData.cost_price || "0"),
        selling_price: parseFloat(formData.selling_price || "0"),
        wholesale_price: formData.wholesale_price
          ? parseFloat(formData.wholesale_price)
          : null,
        minimum_selling_price: formData.minimum_selling_price
          ? parseFloat(formData.minimum_selling_price)
          : null,

        min_stock_level: parseFloat(formData.min_stock_level || "0"),
        max_stock_level: parseFloat(formData.max_stock_level || "0"),

        allow_decimal_quantity: formData.allow_decimal_quantity,
        allow_negative_stock: formData.allow_negative_stock,
        track_expiry: formData.track_expiry,
        track_batches: formData.track_batches,
        is_taxable: formData.is_taxable,
        tax_classification_id: formData.tax_classification_id
          ? parseInt(formData.tax_classification_id)
          : null,
        tax_inclusive: formData.tax_inclusive,
        is_active: formData.is_active,
      });

      if (success) setAddSheetOpen(false);
    },
    [addProduct],
  );

  const handleEditSubmit = useCallback(
    async (formData: ProductFormData) => {
      if (!currentProduct) return;

      const success = await editProduct(currentProduct.id, {
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode || null,
        category_id: formData.category_id ? parseInt(formData.category_id) : 0,
        brand: formData.brand || null,
        description: formData.description || null,

        product_type: formData.product_type,
        inventory_type: formData.inventory_type,

        stock_unit: formData.stock_unit,
        sales_unit: formData.sales_unit,
        purchase_unit: formData.purchase_unit || null,
        unit_conversion_factor: formData.unit_conversion_factor
          ? parseFloat(formData.unit_conversion_factor)
          : 1,
        pack_size: formData.pack_size ? parseFloat(formData.pack_size) : null,

        cost_price: parseFloat(formData.cost_price || "0"),
        selling_price: parseFloat(formData.selling_price || "0"),
        wholesale_price: formData.wholesale_price
          ? parseFloat(formData.wholesale_price)
          : null,
        minimum_selling_price: formData.minimum_selling_price
          ? parseFloat(formData.minimum_selling_price)
          : null,

        min_stock_level: parseFloat(formData.min_stock_level || "0"),
        max_stock_level: parseFloat(formData.max_stock_level || "0"),

        allow_decimal_quantity: formData.allow_decimal_quantity,
        allow_negative_stock: formData.allow_negative_stock,
        track_expiry: formData.track_expiry,
        track_batches: formData.track_batches,
        is_taxable: formData.is_taxable,
        tax_classification_id: formData.tax_classification_id
          ? parseInt(formData.tax_classification_id)
          : null,
        tax_inclusive: formData.tax_inclusive,
        is_active: formData.is_active,
      });

      if (success) setEditSheetOpen(false);
    },
    [currentProduct, editProduct],
  );

  const getCategoryName = useMemo(() => {
    return (categoryId?: number, categoryName?: string) => {
      if (categoryName) return categoryName;
      if (!categoryId) return t("products.uncategorized");
      const category = categories.find((c) => c.id === categoryId);
      return category?.name || t("products.unknownCategory");
    };
  }, [categories, t]);

  const getTaxClassificationName = useMemo(() => {
    return (classificationId?: number | null) => {
      if (!classificationId) return null;
      const classification = classifications.find(
        (c) => c.id === classificationId,
      );
      return classification?.name || null;
    };
  }, [classifications]);

  const getEditFormData = useCallback(
    (product: ProductRow): ProductFormData => {
      return {
        name: product.name || "",
        sku: product.sku || "",
        barcode: product.barcode || "",
        category_id: product.category_id?.toString() || "",
        brand: product.brand || "",
        description: product.description || "",

        product_type: product.product_type || "stock_item",
        inventory_type: product.inventory_type || "count",

        stock_unit: product.stock_unit || "pcs",
        sales_unit: product.sales_unit || "pcs",
        purchase_unit: product.purchase_unit || "pcs",
        unit_conversion_factor:
          product.unit_conversion_factor?.toString() || "1",
        pack_size: product.pack_size?.toString() || "",

        cost_price: product.cost_price?.toString() || "",
        selling_price: product.selling_price?.toString() || "",
        wholesale_price: product.wholesale_price?.toString() || "",
        minimum_selling_price: product.minimum_selling_price?.toString() || "",

        stock_quantity: product.stock_quantity?.toString() || "",
        min_stock_level: product.min_stock_level?.toString() || "10",
        max_stock_level: product.max_stock_level?.toString() || "100",

        allow_decimal_quantity: product.allow_decimal_quantity ?? false,
        allow_negative_stock: product.allow_negative_stock ?? false,
        track_expiry: product.track_expiry ?? false,
        track_batches: product.track_batches ?? false,
        is_taxable: product.is_taxable ?? false,
        tax_classification_id: product.tax_classification_id?.toString() || "",
        tax_inclusive: product.tax_inclusive ?? false,
        is_active: product.is_active ?? true,
      };
    },
    [],
  );

  const productRows = useMemo(() => {
    return products.map((product) => ({
      ...product,
      id: product.id,
    })) as ProductRow[];
  }, [products]);

  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.is_active).length;
  const lowStockProducts = products.filter((p) => p.is_low_stock).length;

  const inventoryCostValue = products.reduce(
    (sum, p) => sum + p.stock_quantity * toNumber(p.cost_price),
    0,
  );

  const avgMargin =
    products.length > 0
      ? products.reduce((sum, p) => sum + toNumber(p.profit_margin), 0) /
        products.length
      : 0;

  const productFields: TableField<ProductRow>[] = useMemo(
    () => [
      {
        key: "name",
        header: t("productForm.name"),
        enableSorting: true,
      },
      {
        key: "sku",
        header: t("productForm.sku"),
        align: "center",
        cell: (value) => (
          <span className="font-mono text-sm">{value as string}</span>
        ),
      },
      {
        key: "category_id",
        header: t("products.category"),
        align: "center",
        cell: (_, row) => (
          <Badge variant="outline">
            {getCategoryName(row.category_id, row.category_name)}
          </Badge>
        ),
      },
      {
        key: "tax_classification_id",
        header: t("products.tax"),
        align: "center",
        cell: (_, row) => {
          const taxName = getTaxClassificationName(row.tax_classification_id);
          if (!taxName) {
            return <Badge variant="secondary">{t("common.notSet")}</Badge>;
          }
          return <Badge variant="outline">{taxName}</Badge>;
        },
      },
      {
        key: "selling_price",
        header: t("products.sellingPrice"),
        align: "center",
        enableSorting: true,
        cell: (value) => (
          <span className="font-semibold">
            {formatCurrency(toNumber(value as number | string))}
          </span>
        ),
      },
      {
        key: "cost_price",
        header: t("products.costPrice"),
        align: "center",
        enableSorting: true,
        cell: (value) => (
          <span className="text-sm text-muted-foreground">
            {formatCurrency(toNumber(value as number | string))}
          </span>
        ),
      },
      {
        key: "stock_quantity",
        header: t("products.stock"),
        align: "center",
        enableSorting: true,
        cell: (value, row) => {
          const stock = typeof value === "number" ? value : 0;
          const minLevel = row.min_stock_level ?? 10;

          if (stock === 0) return <Badge variant="destructive">{t("products.outOfStock")}</Badge>;
          if (stock <= minLevel) {
            return (
              <Badge
                variant="outline"
                className="border-amber-300 text-amber-700">
                {t("products.lowStock", { stock })}
              </Badge>
            );
          }

          return <Badge variant="secondary">{stock}</Badge>;
        },
      },
      {
        key: "profit_margin",
        header: t("products.margin"),
        align: "center",
        enableSorting: true,
        cell: (value) => {
          const margin = toNumber(value as number | string);
          return (
            <span
              className={`font-mono text-sm ${
                margin >= 20
                  ? "text-emerald-600"
                  : margin >= 10
                    ? "text-amber-600"
                    : "text-red-600"
              }`}>
              {margin.toFixed(1)}%
            </span>
          );
        },
      },
      {
        key: "is_active",
        header: t("products.status"),
        align: "center",
        cell: (value) => {
          const isActive = value as boolean;
          return (
            <Badge variant={isActive ? "outline" : "secondary"}>
              {isActive ? t("common.active") : t("common.inactive")}
            </Badge>
          );
        },
      },
    ],
    [getCategoryName, getTaxClassificationName, t],
  );

  const productActions: TableAction<ProductRow>[] = useMemo(
    () => [
      { type: "view", label: t("products.view"), onClick: handleView },
      { type: "edit", label: t("products.edit"), onClick: handleEdit },
      { type: "delete", label: t("products.deactivateAction"), onClick: handleDelete },
    ],
    [handleView, handleEdit, handleDelete, t],
  );

    const currentCostPrice = toNumber(currentProduct?.cost_price);
  const currentSellingPrice = toNumber(currentProduct?.selling_price);
  const currentProfitMargin = toNumber(currentProduct?.profit_margin);
  const currentStockValue =
    (currentProduct?.stock_quantity || 0) * currentCostPrice;
  const currentTaxClassification = getTaxClassificationName(
    currentProduct?.tax_classification_id,
  );

  return (
    <>
      <SiteHeader label={t("products.management")} />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("products.catalog")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("products.description")}
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title={t("products.total")}
              value={String(totalProducts)}
              description={t("products.activeCount", { count: activeProducts })}
              icon={<IconPackage className="size-5" />}
            />

            <MetricCard
              title={t("products.stockRisk")}
              value={String(lowStockProducts)}
              description={t("products.stockRiskDescription")}
              icon={<IconAlertTriangle className="size-5" />}
            />

            <MetricCard
              title={t("products.inventoryCostValue")}
              value={formatCurrency(inventoryCostValue)}
              description={t("products.inventoryCostDescription")}
              icon={<IconArchive className="size-5" />}
            />

            <MetricCard
              title={t("products.averageMargin")}
              value={`${avgMargin.toFixed(1)}%`}
              description={t("products.averageMarginDescription")}
              icon={<IconCash className="size-5" />}
            />
          </section>

          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<ProductRow>
                title={t("products.catalogTitle")}
                description={t("products.catalogDescription")}
                data={productRows}
                fields={productFields}
                actions={productActions}
                enableGlobalSearch
                searchPlaceholder={t("products.search")}
                pageSize={10}
                onRowClick={handleView}
                toolbarActions={
                  <div className="flex gap-2">
                    {can("products.create") && (
                      <Button variant="outline" onClick={handleImport}>
                        <IconUpload className="mr-2 size-4" />
                        {t("products.import")}
                      </Button>
                    )}
                    {can("products.view") && (
                      <Button variant="outline" onClick={() => setHistoryDialogOpen(true)}>
                        <IconHistory className="mr-2 size-4" />
                        {t("products.importHistory")}
                      </Button>
                    )}
                    {can("products.view") && (
                      <Button
                        variant="outline"
                        onClick={handleExport}
                        disabled={choosingExportDestination || exportingProducts}>
                        <IconDownload className="mr-2 size-4" />
                        {choosingExportDestination || exportingProducts
                          ? t("products.exporting")
                          : t("products.export")}
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => getProducts()}>
                      <IconRefresh className="size-4" />
                      {t("common.refresh")}
                    </Button>
                    <Button onClick={handleAdd}>
                      <IconPlus className="size-4" />
                      {t("products.add")}
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <ProductSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        isEdit={false}
        initialData={initialFormData}
        onSubmit={handleAddSubmit}
        categories={categories}
      />

      <ProductSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        isEdit={true}
        initialData={
          currentProduct ? getEditFormData(currentProduct) : initialFormData
        }
        onSubmit={handleEditSubmit}
        categories={categories}
      />

      <ProductCsvImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={getProducts}
      />
      <CsvImportHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        importType="product"
      />

      <AlertDialog
        open={overwriteDestination !== null}
        onOpenChange={(open) => {
          if (!open && !exportingProducts) setOverwriteDestination(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("products.replaceCsv")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("products.replaceCsvDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={exportingProducts}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={exportingProducts}
              onClick={() => {
                if (overwriteDestination) void exportProductCatalogue(overwriteDestination, true);
              }}>
              {exportingProducts ? t("products.replacing") : t("products.replaceCsvAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("products.deactivate")}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t("products.deactivateDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {currentProduct && (
            <div className="my-2 rounded-lg border bg-muted/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{currentProduct.name}</span>
                <Badge variant="outline">{currentProduct.sku}</Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("products.category")}:</span>
                  <span className="ml-2">
                    {getCategoryName(
                      currentProduct.category_id,
                      currentProduct.category_name,
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("products.stock")}:</span>
                  <span className="ml-2 font-medium">
                    {t("products.units", { count: currentProduct.stock_quantity })}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("products.sellingPrice")}:</span>
                  <span className="ml-2">
                    {formatCurrency(currentSellingPrice)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("products.costPrice")}:</span>
                  <span className="ml-2">
                    {formatCurrency(currentCostPrice)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("products.deactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-h-[90vh] min-w-3xl w-full max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("products.details")}</DialogTitle>
            <DialogDescription>
              {t("products.detailsDescription")}
            </DialogDescription>
          </DialogHeader>

          {currentProduct && (
            <div className="space-y-6 py-2">
              <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-semibold">
                      {currentProduct.name}
                    </h3>
                    <Badge
                      variant={
                        currentProduct.is_active ? "outline" : "destructive"
                      }>
                      {currentProduct.is_active ? t("common.active") : t("common.inactive")}
                    </Badge>
                    {currentProduct.is_low_stock && (
                      <Badge
                        variant="outline"
                        className="border-amber-500/60 text-amber-700 dark:text-amber-400">
                        {t("products.lowStockTitle")}
                      </Badge>
                    )}
                    {currentTaxClassification && (
                      <Badge variant="outline">
                        <IconReceiptTax className="mr-1 size-3" />
                        {currentTaxClassification}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      SKU:{" "}
                      <span className="font-mono text-foreground">
                        {currentProduct.sku}
                      </span>
                    </span>
                    {currentProduct.barcode && (
                      <span>
                        Barcode:{" "}
                        <span className="font-mono text-foreground">
                          {currentProduct.barcode}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                <Badge variant="outline" className="w-fit">
                  {getCategoryName(
                    currentProduct.category_id,
                    currentProduct.category_name,
                  )}
                </Badge>
              </div>

              <div className="grid gap-8 lg:grid-cols-2">
                <section aria-labelledby="product-pricing-heading" className="space-y-3">
                  <div>
                    <h4 id="product-pricing-heading" className="font-semibold">
                      {t("products.pricing")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Cost, selling price, and profitability
                    </p>
                  </div>
                  <dl className="divide-y border-y text-sm">
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-muted-foreground">Cost Price</dt>
                      <dd className="font-medium">{formatCurrency(currentCostPrice)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-muted-foreground">Selling Price</dt>
                      <dd className="font-semibold">{formatCurrency(currentSellingPrice)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-muted-foreground">Profit Margin</dt>
                      <dd>{currentProfitMargin.toFixed(1)}%</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-muted-foreground">Profit Per Unit</dt>
                      <dd>{formatCurrency(currentSellingPrice - currentCostPrice)}</dd>
                    </div>
                  </dl>
                </section>

                <section aria-labelledby="product-stock-heading" className="space-y-3">
                  <div>
                    <h4 id="product-stock-heading" className="font-semibold">
                      {t("products.stockPosition")}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Availability and stock thresholds
                    </p>
                  </div>
                  <dl className="divide-y border-y text-sm">
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-muted-foreground">Current Stock</dt>
                      <dd className="font-semibold">{currentProduct.stock_quantity}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-muted-foreground">Stock Value</dt>
                      <dd className="font-medium">{formatCurrency(currentStockValue)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-muted-foreground">Minimum Stock</dt>
                      <dd>{currentProduct.min_stock_level}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-muted-foreground">Maximum Stock</dt>
                      <dd>{currentProduct.max_stock_level}</dd>
                    </div>
                  </dl>
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-muted-foreground">Stock Fill Level</span>
                      <span className="font-medium">
                        {currentProduct.stock_quantity} / {currentProduct.max_stock_level}
                      </span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-label="Stock fill level"
                      aria-valuemin={0}
                      aria-valuemax={Math.max(currentProduct.max_stock_level, 1)}
                      aria-valuenow={Math.min(
                        currentProduct.stock_quantity,
                        Math.max(currentProduct.max_stock_level, 1),
                      )}>
                      <div
                        className={`h-full rounded-full ${
                          currentProduct.stock_quantity === 0
                            ? "bg-destructive"
                            : currentProduct.stock_quantity <= currentProduct.min_stock_level
                              ? "bg-amber-500"
                              : "bg-primary"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (currentProduct.stock_quantity /
                              Math.max(currentProduct.max_stock_level, 1)) *
                              100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </section>
              </div>

              <section aria-labelledby="product-description-heading" className="space-y-3 border-t pt-6">
                <h4 id="product-description-heading" className="font-semibold">
                  {t("productForm.description")}
                </h4>
                {currentProduct.description ? (
                  <p className="whitespace-pre-wrap text-sm leading-6">
                    {currentProduct.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No description provided.</p>
                )}
              </section>

              <section aria-labelledby="product-metadata-heading" className="space-y-3 border-t pt-6">
                <h4 id="product-metadata-heading" className="font-semibold">
                  {t("products.metadata")}
                </h4>
                <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
                  <div className="flex items-center justify-between gap-4 border-b pb-3">
                    <dt className="text-muted-foreground">{t("products.id")}</dt>
                    <dd className="font-mono">{currentProduct.id}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b pb-3">
                    <dt className="text-muted-foreground">{t("products.created")}</dt>
                    <dd>
                      {new Date(currentProduct.created_at).toLocaleDateString("en-UG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b pb-3">
                    <dt className="text-muted-foreground">Last Updated</dt>
                    <dd>
                      {new Date(currentProduct.updated_at).toLocaleDateString("en-UG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b pb-3">
                    <dt className="text-muted-foreground">Inventory Status</dt>
                    <dd>
                      {currentProduct.is_low_stock
                        ? t("products.needsRestocking")
                        : t("products.adequateStock")}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
