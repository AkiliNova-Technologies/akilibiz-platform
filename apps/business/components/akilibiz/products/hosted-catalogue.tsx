"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  FolderTree,
  Archive,
  Banknote,
  History,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";

import { DataTable, type TableAction, type TableData, type TableField } from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { CataloguePageControls, type CataloguePagination } from "@/components/akilibiz/products/catalogue-page-controls";
import { CatalogueExportButton } from "@/components/akilibiz/products/catalogue-export-button";
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

import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
export type HostedCategoryRow = TableData & {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  local_category_id: number;
  stock_quantity?: null;
  inventory_value?: null;
  created_at?: string | null;
};

export type HostedProductRow = TableData & {
  id: string;
  name: string;
  sku: string;
  category_id: string;
  barcode: string | null;
  brand: string | null;
  selling_price_ugx: number | null;
  cost_price_ugx: number | null;
  is_active: boolean;
  tax_classification?: null;
  stock_unit: string;
  stock_quantity?: number | null;
  profit_margin?: null;
};

function money(value: number | null) {
  if (value == null || !Number.isSafeInteger(value)) return "—";
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(value);
}

function stockLabel(milli: number | null | undefined, unit: string) {
  if (milli === null || milli === undefined || !Number.isSafeInteger(milli)) return "—";
  return `${new Intl.NumberFormat("en-UG", { maximumFractionDigits: 3 }).format(milli / 1000)} ${unit}`;
}

function NotAvailable() {
  return <span className="text-muted-foreground">—</span>;
}

export function HostedCatalogue({
  businessName: _businessName,
  categories,
  products,
  view,
  error,
  stockError,
  pagination,
  draftsEnabled,
}: {
  businessName: string;
  categories: HostedCategoryRow[];
  products: HostedProductRow[];
  view: "products" | "categories";
  error?: string | null;
  stockError?: string | null;
  pagination?: CataloguePagination;
  draftsEnabled: boolean;
}) {
  const { t } = useI18n();
  const [selectedProduct, setSelectedProduct] = useState<HostedProductRow | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<HostedCategoryRow | null>(null);
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  // Only verified synced snapshots are shown; no inventory values or margins are estimated.
  const productFields: TableField<HostedProductRow>[] = [
    { key: "name", header: t("productForm.name"), enableSorting: true },
    {
      key: "sku",
      header: t("productForm.sku"),
      align: "center",
      cell: (value) => <span className="font-mono text-sm">{String(value)}</span>,
    },
    {
      key: "category_id",
      header: t("finance.category"),
      align: "center",
      cell: (_, row) => (
        <Badge variant="outline">{categoryNames.get(row.category_id) ?? t("products.unknownCategory")}</Badge>
      ),
    },
    {
      key: "tax_classification",
      header: t("receipt.tax"),
      align: "center",
      enableSorting: false,
      cell: () => <NotAvailable />,
    },
    {
      key: "selling_price_ugx",
      header: t("products.sellingPrice"),
      align: "center",
      enableSorting: true,
      cell: (value) => <span className="font-semibold">{money(value as number | null)}</span>,
    },
    {
      key: "cost_price_ugx",
      header: t("products.costPrice"),
      align: "center",
      enableSorting: true,
      cell: (value) => <span className="text-sm text-muted-foreground">{money(value as number | null)}</span>,
    },
    {
      key: "stock_quantity",
      header: t("products.stock"),
      align: "center",
      enableSorting: false,
      cell: (_, row) => <span className="text-sm">{stockLabel(row.stock_quantity, row.stock_unit)}</span>,
    },
    {
      key: "profit_margin",
      header: t("products.margin"),
      align: "center",
      enableSorting: false,
      cell: () => <NotAvailable />,
    },
    {
      key: "is_active",
      header: t("reports.status"),
      align: "center",
      cell: (value) => (
        <Badge variant={value ? "outline" : "secondary"}>
          {value ? t("common.active") : t("common.inactive")}
        </Badge>
      ),
    },
  ];

  const productActions: TableAction<HostedProductRow>[] = [
    {
      type: "view",
      label: "View product",
      onClick: setSelectedProduct,
    },
    {
      type: "edit",
      label: "Edit product",
      onClick: () => {},
      disabled: () => true,
    },
    {
      type: "delete",
      label: t("products.deactivateAction"),
      onClick: () => {},
      disabled: () => true,
    },
  ];

  const assignedProductCount = (id: string) => products.filter((product) => product.category_id === id).length;
  const categoryFields: TableField<HostedCategoryRow>[] = [
    {
      key: "name",
      header: t("customers.name"),
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
      header: t("finance.description"),
      cell: (value) => (
        <span className="line-clamp-1 text-wrap text-sm text-muted-foreground">{String(value || "—")}</span>
      ),
    },
    {
      key: "local_category_id",
      header: t("suppliers.products"),
      align: "center",
      enableSorting: false,
      cell: (_, row) => <Badge variant="outline">{assignedProductCount(row.id)}</Badge>,
    },
    {
      key: "stock_quantity",
      header: "Stock Quantity",
      align: "center",
      enableSorting: false,
      cell: () => <NotAvailable />,
    },
    {
      key: "inventory_value",
      header: "Inventory Value",
      align: "right",
      enableSorting: false,
      cell: () => <NotAvailable />,
    },
    {
      key: "is_active",
      header: t("reports.status"),
      align: "center",
      cell: (value) => <Badge variant={value ? "outline" : "secondary"}>{value ? t("common.active") : t("common.inactive")}</Badge>,
    },
    {
      key: "created_at",
      header: t("products.created"),
      align: "center",
      enableSorting: false,
      cell: () => <NotAvailable />,
    },
  ];

  const categoryActions: TableAction<HostedCategoryRow>[] = [
    { type: "view", label: t("categories.view"), onClick: setSelectedCategory },
    { type: "edit", label: "Edit category", onClick: () => {}, disabled: () => true },
    { type: "delete", label: "Deactivate category", onClick: () => {}, disabled: () => true },
  ];

  if (view === "categories") {
    const activeCategories = categories.filter((category) => category.is_active).length;
    const assignedProducts = products.filter((product) => categories.some((category) => category.id === product.category_id)).length;
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("categories.management")}</h2>
          <p className="text-sm text-muted-foreground">View the categories synchronized from AkiliBiz Desktop.</p>
        </div>
        <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <MetricCard title={t("categories.total")} value={error ? "—" : String(categories.length)}
            description={error ? "Category data unavailable" : `${activeCategories} active categories`} icon={<FolderTree className="size-5" />} />
          <MetricCard title={t("categories.assignedProducts")} value={error ? "—" : String(assignedProducts)}
            description="Products assigned to categories" icon={<Package className="size-5" />} />
          <MetricCard title="Inventory Value" value="—"
            description="Stock valuation unavailable" icon={<Archive className="size-5" />} />
          <MetricCard title={t("categories.activeTitle")} value={error ? "—" : String(activeCategories)}
            description="Categories currently in use" icon={<Banknote className="size-5" />} />
        </section>
        <Card>
          <CardContent className="min-w-0 px-6 pb-6">
            <DataTable<HostedCategoryRow>
              title={t("categories.tableTitle")}
              description="Browse synchronized categories. Changes are currently made on the desktop."
              data={categories}
              emptyMessage={error ?? "No categories found."}
              fields={categoryFields}
              actions={categoryActions}
              enableGlobalSearch
              searchPlaceholder="Search categories..."
              pageSize={10}
              onRowClick={setSelectedCategory}
              toolbarActions={
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" disabled title="Category import unavailable">
                    <Upload className="size-4" />Import
                  </Button>
                  <Button type="button" variant="outline" disabled title="Import history unavailable">
                    <History className="size-4" />{t("products.importHistory")}
                  </Button>
                  <CatalogueExportButton entity="categories" />
                  <Button type="button" variant="outline" size="icon" disabled aria-label={t("pos.refresh")} title="Category refresh unavailable">
                    <RefreshCw className="size-4" />
                  </Button>
                  <Button type="button" disabled title="Category creation unavailable">
                    <Plus className="size-4" />{t("categories.add")}
                  </Button>
                </div>
              }
            />
          </CardContent>
        </Card>

        <Dialog open={selectedCategory !== null} onOpenChange={(open) => { if (!open) setSelectedCategory(null); }}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("categories.details")}</DialogTitle>
              <DialogDescription>View category information and assigned products.</DialogDescription>
            </DialogHeader>
            {selectedCategory ? (
              <div className="space-y-4">
                <Card>
                  <CardContent className="space-y-3 p-4">
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">{t("customers.name")}</span>
                      <span className="text-right font-medium">{selectedCategory.name}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">{t("categories.slug")}</span>
                      <Badge variant="secondary">{selectedCategory.slug}</Badge>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">{t("reports.status")}</span>
                      <Badge variant={selectedCategory.is_active ? "outline" : "secondary"}>
                        {selectedCategory.is_active ? t("common.active") : t("common.inactive")}
                      </Badge>
                    </div>
                    <div className="border-t pt-3">
                      <p className="mb-1 text-sm text-muted-foreground">{t("finance.description")}</p>
                      <p className="text-sm">{selectedCategory.description || "No description"}</p>
                    </div>
                    <div className="flex justify-between gap-4 border-t pt-3">
                      <span className="text-sm text-muted-foreground">{t("suppliers.products")}</span>
                      <span className="font-medium">{assignedProductCount(selectedCategory.id)}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Stock Quantity</span>
                      <NotAvailable />
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">Inventory Value</span>
                      <NotAvailable />
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-sm text-muted-foreground">{t("products.created")}</span>
                      <NotAvailable />
                    </div>
                  </CardContent>
                </Card>
                <Button type="button" variant="outline" className="w-full" disabled>{t("categories.edit")}</Button>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 md:gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("products.catalogTitle")}</h2>
        <p className="text-sm text-muted-foreground">
          View the products, prices, and stock information synchronized from AkiliBiz Desktop.
        </p>
      </div>

      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title={t("products.total")}
          value={error ? "—" : String(pagination?.total ?? products.length)}
          description={error ? "Product data unavailable" : `${products.filter((product) => product.is_active).length} active on this page`}
          icon={<Package className="size-5" />}
        />
        <MetricCard
          title={t("products.stockRisk")}
          value="—"
          description={stockError ?? "Stock risk summary unavailable"}
          icon={<AlertTriangle className="size-5" />}
        />
        <MetricCard
          title={t("inventory.stockValue")}
          value="—"
          description="Stock valuation unavailable"
          icon={<Archive className="size-5" />}
        />
        <MetricCard
          title={t("products.averageMargin")}
          value="—"
          description="Margin data unavailable"
          icon={<Banknote className="size-5" />}
        />
      </section>

      {pagination && !error ? <CataloguePageControls pagination={pagination} /> : null}
      <Card>
        <CardContent className="min-w-0 px-3 pb-4 sm:px-4 md:px-6 md:pb-6">
          <DataTable<HostedProductRow>
            title={t("products.catalogTitle")}
            description="Browse synchronized products. Changes are currently made on the desktop."
            data={products}
            emptyMessage={error ?? "No products found."}
            fields={productFields}
            actions={productActions}
            enableGlobalSearch={false}
            enablePagination={false}
            onRowClick={setSelectedProduct}
            toolbarActions={
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Button type="button" variant="outline" disabled title="Import unavailable">
                  <Upload className="size-4" />
                  Import
                </Button>
                <Button type="button" variant="outline" disabled title="Import history unavailable">
                  <History className="size-4" />
                  {t("products.importHistory")}
                </Button>
                <CatalogueExportButton entity="products" />
                <Button type="button" variant="outline" size="icon" disabled title="Catalogue refresh unavailable">
                  <RefreshCw className="size-4" />
                  <span className="sr-only">{t("pos.refresh")}</span>
                </Button>
                <Button type="button" variant="outline" disabled title="Variants management unavailable">
                  <Layers className="size-4" />
                  Variants
                </Button>
                {draftsEnabled ? (
                  <Button asChild title="Prepare a product draft; desktop publication is not yet available">
                    <Link href="/dashboard/products/drafts">
                      <Plus className="size-4" />
                      Prepare Product
                    </Link>
                  </Button>
                ) : (
                  <Button disabled title="Product preparation is not enabled yet">
                    <Plus className="size-4" />
                    {t("products.add")}
                  </Button>
                )}
              </div>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={selectedProduct !== null} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-full max-w-5xl min-w-0 overflow-x-hidden overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("products.details")}</DialogTitle>
            <DialogDescription>Review the available information for this product.</DialogDescription>
          </DialogHeader>
          {selectedProduct ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ["Product", selectedProduct.name],
                ["SKU", selectedProduct.sku],
                ["Category", categoryNames.get(selectedProduct.category_id) ?? "Unknown"],
                ["Barcode", selectedProduct.barcode || "—"],
                ["Brand", selectedProduct.brand || "—"],
                ["Selling Price", money(selectedProduct.selling_price_ugx)],
                ["Cost Price", money(selectedProduct.cost_price_ugx)],
                ["Stock", stockLabel(selectedProduct.stock_quantity, selectedProduct.stock_unit)],
                ["Margin", "—"],
                ["Tax", "—"],
                ["Status", selectedProduct.is_active ? "Active" : "Inactive"],
              ] as const).map(([label, value]) => (
                <div key={label} className="space-y-1 rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="break-words text-sm font-medium">{value}</div>
                </div>
              ))}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button variant="outline" onClick={() => setSelectedProduct(null)}>{t("receipt.close")}</Button>
                <Button variant="outline" disabled>{t("products.edit")}</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
