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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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
import {
  IconArchive,
  IconBox,
  IconCategory,
  IconCash,
  IconPlus,
  IconRefresh,
  IconUpload,
  IconDownload,
  IconHistory,
} from "@tabler/icons-react";
import MetricCard from "@/components/metric-card";
import { useReduxCategories } from "@/hooks/useReduxCategories";
import type { Category } from "@/services/tauri/categories";
import { CategoryCsvImportDialog } from "@/components/CategoryCsvImportDialog";
import { CsvImportHistoryDialog } from "@/components/CsvImportHistoryDialog";
import { save } from "@tauri-apps/plugin-dialog";
import { toast } from "sonner";
import { importExportService } from "@/services/tauri/import-export";
import { usePermissions } from "@/hooks/usePermissions";
import { useI18n } from "@/hooks/useI18n";
import { formatCurrency, formatDate } from "@/i18n";

// ============================================================================
// TYPES
// ============================================================================

interface CategoryRow extends TableData {
  id: number;
  name: string;
  slug: string;
  description?: string;
  product_count: number;
  stock_quantity: number;
  inventory_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category: Category;
}

interface CategoryFormData {
  name: string;
  description: string;
  is_active: boolean;
}

// ============================================================================
// UTILITIES
// ============================================================================

function categoryExportErrorMessage(error: unknown, t: ReturnType<typeof useI18n>["t"]) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("unauthorized") || message.includes("permission")) {
    return t("categories.exportPermissionError");
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

  return t("categories.exportError");
}

function formatQuantity(milli: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(
    milli / 1000,
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ProductCategoriesPage() {
  const { t } = useI18n();
  const {
    categories,
    loading,
    error,
    getCategories,
    addCategory,
    editCategory,
    clearError,
  } = useReduxCategories();
  const { can } = usePermissions();

  const [selectedCategory, setSelectedCategory] =
    React.useState<CategoryRow | null>(null);

  const [viewOpen, setViewOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [choosingExportDestination, setChoosingExportDestination] = React.useState(false);
  const [exportingCategories, setExportingCategories] = React.useState(false);
  const [overwriteDestination, setOverwriteDestination] = React.useState<string | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = React.useState(false);
  const [isEdit, setIsEdit] = React.useState(false);

  const [formData, setFormData] = React.useState<CategoryFormData>({
    name: "",
    description: "",
    is_active: true,
  });

  React.useEffect(() => {
    getCategories();
  }, [getCategories]);

  React.useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const rows = React.useMemo<CategoryRow[]>(() => {
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      product_count: category.product_count,
      stock_quantity: category.stock_quantity_milli,
      inventory_value: category.inventory_value_ugx,
      is_active: category.is_active,
      created_at: category.created_at,
      updated_at: category.updated_at,
      category,
    }));
  }, [categories]);

  const totalCategories = rows.length;
  const activeCategories = rows.filter((c) => c.is_active).length;
  const totalProductsAssigned = rows.reduce(
    (sum, c) => sum + c.product_count,
    0,
  );
  const totalInventoryValue = rows.reduce(
    (sum, c) => sum + c.inventory_value,
    0,
  );

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      is_active: true,
    });
  };

  const handleAdd = () => {
    resetForm();
    setSelectedCategory(null);
    setIsEdit(false);
    setFormOpen(true);
  };

  const handleEdit = (category: CategoryRow) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      is_active: category.is_active,
    });
    setIsEdit(true);
    setFormOpen(true);
  };

  const handleView = (category: CategoryRow) => {
    setSelectedCategory(category);
    setViewOpen(true);
  };

  const handleDelete = (category: CategoryRow) => {
    setSelectedCategory(category);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedCategory) return;

    await editCategory(selectedCategory.id, {
      is_active: false,
    });

    setDeleteOpen(false);
    setSelectedCategory(null);
  };

  const exportCategoryCatalogue = React.useCallback(
    async (destinationPath: string, overwrite: boolean) => {
      setExportingCategories(true);
      try {
        const result = await importExportService.exportCategoryCatalogueCsv(
          destinationPath,
          overwrite,
        );
        setOverwriteDestination(null);
        toast.success(t("categories.exportSuccess"), {
          description: t("products.exportSummary", { fileName: result.file_name, count: result.row_count, label: result.row_count === 1 ? t("categories.category") : t("categories.categories") }),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message.toLowerCase() : "";
        if (!overwrite && message.includes("already exists")) {
          setOverwriteDestination(destinationPath);
        } else {
          toast.error(t("categories.exportFailed"), {
            description: categoryExportErrorMessage(error, t),
          });
        }
      } finally {
        setExportingCategories(false);
      }
    },
    [t],
  );

  const handleExport = React.useCallback(async () => {
    setChoosingExportDestination(true);
    try {
      const selectedPath = await save({
        title: t("categories.exportDialogTitle"),
        defaultPath: `akilibiz-category-catalogue-${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (typeof selectedPath === "string") {
        await exportCategoryCatalogue(selectedPath, false);
      }
    } catch {
      toast.error(t("products.saveDialogError"), {
        description: t("categories.saveDialogDescription"),
      });
    } finally {
      setChoosingExportDestination(false);
    }
  }, [exportCategoryCatalogue, t]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (isEdit && selectedCategory) {
      await editCategory(selectedCategory.id, {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      });
    } else {
      await addCategory({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      });
    }

    setFormOpen(false);
    resetForm();
    setSelectedCategory(null);
  };

  const categoryFields: TableField<CategoryRow>[] = [
    {
      key: "name",
      header: t("categories.name"),
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "slug",
      header: t("categories.slug"),
      align: "center",
      cell: (value) => <Badge variant="secondary">{String(value)}</Badge>,
    },
    {
      key: "description",
      header: t("productForm.description"),
      cell: (value) => (
        <span className="text-sm text-muted-foreground line-clamp-1 text-wrap">
          {String(value || "-")}
        </span>
      ),
    },
    {
      key: "product_count",
      header: t("categories.productCount"),
      align: "center",
      enableSorting: true,
      cell: (value) => <Badge variant="outline">{Number(value)}</Badge>,
    },
    {
      key: "stock_quantity",
      header: t("categories.stockQuantity"),
      align: "center",
      enableSorting: true,
      cell: (value) => formatQuantity(Number(value)),
    },
    {
      key: "inventory_value",
      header: t("categories.inventoryValue"),
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-semibold">{formatCurrency(Number(value))}</span>
      ),
    },
    {
      key: "is_active",
      header: t("products.status"),
      align: "center",
      cell: (value) => (
        <Badge variant={value ? "outline" : "secondary"}>
          {value ? t("common.active") : t("common.inactive")}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: t("categories.created"),
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
  ];

  const categoryActions: TableAction<CategoryRow>[] = [
    {
      type: "view",
      label: t("categories.view"),
      onClick: handleView,
    },
    {
      type: "edit",
      label: t("categories.edit"),
      onClick: handleEdit,
    },
    {
      type: "delete",
      label: t("categories.deactivate"),
      onClick: handleDelete,
    },
  ];

  return (
    <>
      <SiteHeader label={t("categories.tableTitle")} />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("categories.management")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("categories.description")}
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title={t("categories.total")}
              value={String(totalCategories)}
              description={t("categories.activeCount", { count: activeCategories })}
              icon={<IconCategory className="size-5" />}
            />

            <MetricCard
              title={t("categories.assignedProducts")}
              value={String(totalProductsAssigned)}
              description={t("categories.assignedDescription")}
              icon={<IconBox className="size-5" />}
            />

            <MetricCard
              title={t("categories.inventoryValue")}
              value={formatCurrency(totalInventoryValue)}
              description={t("categories.inventoryDescription")}
              icon={<IconArchive className="size-5" />}
            />

            <MetricCard
              title={t("categories.activeTitle")}
              value={String(activeCategories)}
              description={t("categories.activeDescription")}
              icon={<IconCash className="size-5" />}
            />
          </section>

          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<CategoryRow>
                title={t("categories.tableTitle")}
                description={t("categories.tableDescription")}
                data={rows}
                fields={categoryFields}
                actions={categoryActions}
                enableGlobalSearch
                searchPlaceholder={t("categories.search")}
                pageSize={10}
                onRowClick={handleView}
                toolbarActions={
                  <div className="flex gap-2">
                    {can("categories.create") && (
                      <Button
                        variant="outline"
                        onClick={() => setImportDialogOpen(true)}>
                        <IconUpload className="mr-2 size-4" />
                        {t("categories.import")}
                      </Button>
                    )}
                    {can("categories.view") && (
                      <Button variant="outline" onClick={() => setHistoryDialogOpen(true)}>
                        <IconHistory className="mr-2 size-4" />
                        {t("products.importHistory")}
                      </Button>
                    )}
                    {can("categories.view") && (
                      <Button
                        variant="outline"
                        onClick={handleExport}
                        disabled={choosingExportDestination || exportingCategories}>
                        <IconDownload className="mr-2 size-4" />
                        {choosingExportDestination || exportingCategories
                          ? t("products.exporting")
                          : t("categories.export")}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => getCategories()}
                      disabled={loading}>
                      <IconRefresh className="size-4" />
                      {t("common.refresh")}
                    </Button>
                    <Button onClick={handleAdd} disabled={loading}>
                      <IconPlus className="mr-2 size-4" />
                      {t("categories.add")}
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <CategoryCsvImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImportComplete={getCategories}
      />
      <CsvImportHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        importType="category"
      />

      <AlertDialog
        open={overwriteDestination !== null}
        onOpenChange={(open) => {
          if (!open && !exportingCategories) setOverwriteDestination(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("products.replaceCsv")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("categories.replaceCsvDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={exportingCategories}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={exportingCategories}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (overwriteDestination) {
                  void exportCategoryCatalogue(overwriteDestination, true);
                }
              }}>
              {exportingCategories ? t("products.replacing") : t("products.replaceCsvAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t("categories.edit") : t("categories.add")}
            </DialogTitle>
            <DialogDescription>
              {t("categories.formDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <FieldLabel required htmlFor="name">{t("categories.name")}</FieldLabel>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={t("categories.enterName")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("productForm.description")}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder={t("categories.describe")}
                rows={4}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{t("categories.activeCategory")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("categories.inactiveDescription")}
                </p>
              </div>
              <Button
                type="button"
                variant={formData.is_active ? "default" : "outline"}
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    is_active: !prev.is_active,
                  }))
                }>
                {formData.is_active ? t("common.active") : t("common.inactive")}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !formData.name.trim()}>
              {loading
                ? t("categories.saving")
                : isEdit
                  ? t("categories.update")
                  : t("categories.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("categories.details")}</DialogTitle>
            <DialogDescription>
              {t("categories.detailsDescription")}
            </DialogDescription>
          </DialogHeader>

          {selectedCategory && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("categories.name")}</span>
                    <span className="font-medium">{selectedCategory.name}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("categories.slug")}</span>
                    <Badge variant="secondary">{selectedCategory.slug}</Badge>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("products.status")}
                    </span>
                    <Badge
                      variant={
                        selectedCategory.is_active ? "outline" : "secondary"
                      }>
                      {selectedCategory.is_active ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </div>

                  <Separator />

                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">
                      {t("productForm.description")}
                    </p>
                    <p className="text-sm">
                      {selectedCategory.description ||
                        t("common.noDescription")}
                    </p>
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("categories.productCount")}
                    </span>
                    <span className="font-medium">
                      {selectedCategory.product_count}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("categories.stockQuantity")}
                    </span>
                    <span className="font-medium">
                      {formatQuantity(selectedCategory.stock_quantity)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("categories.inventoryValue")}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(selectedCategory.inventory_value)}
                    </span>
                  </div>
                  {selectedCategory.category.unvalued_product_count > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Unvalued stock</span>
                      <span className="font-medium">
                        {formatQuantity(selectedCategory.category.unvalued_stock_quantity_milli)}
                        {` (${selectedCategory.category.unvalued_product_count} products)`}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("categories.created")}
                    </span>
                    <span className="font-medium">
                      {formatDate(selectedCategory.created_at)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setViewOpen(false);
                    handleEdit(selectedCategory);
                  }}>
                  {t("categories.edit")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("categories.deactivate")}?</AlertDialogTitle>
            <AlertDialogDescription>
              {t("categories.deactivateDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedCategory && (
            <div className="my-2 space-y-3 rounded-lg border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{selectedCategory.name}</span>
                <Badge variant="outline">
                  {selectedCategory.product_count} {t("categories.productCount").toLowerCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedCategory.description || t("common.noDescription")}
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("categories.deactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
