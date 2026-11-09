"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  Banknote,
  Download,
  Eye,
  FolderTree,
  History,
  Layers,
  Package,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";

import { DataTable, type TableAction, type TableData, type TableField } from "@/components/akilibiz/data-table";
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

export type HostedCategoryRow = TableData & {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  local_category_id: number;
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
};

function money(value: number | null) {
  if (value == null || !Number.isSafeInteger(value)) return "—";
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(value);
}

function NotAvailable() {
  return <span className="text-muted-foreground">—</span>;
}

export function HostedCatalogue({
  businessName: _businessName,
  categories,
  products,
  view,
}: {
  businessName: string;
  categories: HostedCategoryRow[];
  products: HostedProductRow[];
  view: "products" | "categories";
}) {
  const [selectedProduct, setSelectedProduct] = useState<HostedProductRow | null>(null);
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  // These fields have not been synchronized; do not present estimates as recorded values.
  const productFields: TableField<HostedProductRow>[] = [
    { key: "name", header: "Product Name", enableSorting: true },
    {
      key: "sku",
      header: "SKU",
      align: "center",
      cell: (value) => <span className="font-mono text-sm">{String(value)}</span>,
    },
    {
      key: "category_id",
      header: "Category",
      align: "center",
      cell: (_, row) => (
        <Badge variant="outline">{categoryNames.get(row.category_id) ?? "Unknown"}</Badge>
      ),
    },
    {
      key: "id",
      header: "Tax",
      align: "center",
      enableSorting: false,
      cell: () => <NotAvailable />,
    },
    {
      key: "selling_price_ugx",
      header: "Selling Price",
      align: "center",
      enableSorting: true,
      cell: (value) => <span className="font-semibold">{money(value as number | null)}</span>,
    },
    {
      key: "cost_price_ugx",
      header: "Cost Price",
      align: "center",
      enableSorting: true,
      cell: (value) => <span className="text-sm text-muted-foreground">{money(value as number | null)}</span>,
    },
    {
      key: "id",
      header: "Stock",
      align: "center",
      enableSorting: false,
      cell: () => <NotAvailable />,
    },
    {
      key: "id",
      header: "Margin",
      align: "center",
      enableSorting: false,
      cell: () => <NotAvailable />,
    },
    {
      key: "is_active",
      header: "Status",
      align: "center",
      cell: (value) => (
        <Badge variant={value ? "outline" : "secondary"}>
          {value ? "Active" : "Inactive"}
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
      label: "Deactivate product",
      onClick: () => {},
      disabled: () => true,
    },
  ];

  const categoryFields: TableField<HostedCategoryRow>[] = [
    { key: "name", header: "Category", enableSorting: true },
    { key: "slug", header: "Slug", cell: (value) => <span className="font-mono text-xs">{String(value)}</span> },
    { key: "description", header: "Description", cell: (value) => <span className="text-muted-foreground">{String(value ?? "—")}</span> },
    { key: "local_category_id", header: "Products", align: "center", cell: (_, row) => products.filter((product) => product.category_id === row.id).length },
    {
      key: "is_active",
      header: "Status",
      cell: (value) => <Badge variant={value ? "outline" : "secondary"}>{value ? "Active" : "Inactive"}</Badge>,
    },
  ];

  if (view === "categories") {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Category Management</h2>
        </div>
        <Card>
          <CardContent className="min-w-0 px-3 pb-4 sm:px-4 md:px-6 md:pb-6">
            <DataTable<HostedCategoryRow>
              title="Categories"
              data={categories}
              fields={categoryFields}
              enableGlobalSearch
              searchPlaceholder="Search categories..."
              enableSelection={false}
              pageSize={10}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 md:gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Product Catalogue</h2>
        <p className="text-sm text-muted-foreground">
          Manage your products, pricing, stock and categories.
        </p>
      </div>

      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Products"
          value={String(products.length)}
          description={`${products.filter((product) => product.is_active).length} active products`}
          icon={<Package className="size-5" />}
        />
        <MetricCard
          title="Stock Risk"
          value="—"
          description="Stock levels unavailable"
          icon={<AlertTriangle className="size-5" />}
        />
        <MetricCard
          title="Inventory Cost Value"
          value="—"
          description="Stock valuation unavailable"
          icon={<Archive className="size-5" />}
        />
        <MetricCard
          title="Average Margin"
          value="—"
          description="Margin data unavailable"
          icon={<Banknote className="size-5" />}
        />
      </section>

      <Card>
        <CardContent className="min-w-0 px-3 pb-4 sm:px-4 md:px-6 md:pb-6">
          <DataTable<HostedProductRow>
            title="Product Catalogue"
            description="View and manage your products."
            data={products}
            fields={productFields}
            actions={productActions}
            enableGlobalSearch
            searchPlaceholder="Search products..."
            pageSize={10}
            onRowClick={setSelectedProduct}
            toolbarActions={
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Button type="button" variant="outline" disabled title="Import is unavailable on web">
                  <Upload className="size-4" />
                  Import
                </Button>
                <Button type="button" variant="outline" disabled title="Import history is unavailable on web">
                  <History className="size-4" />
                  Import History
                </Button>
                <Button type="button" variant="outline" disabled title="Export is not connected on web">
                  <Download className="size-4" />
                  Export
                </Button>
                <Button type="button" variant="outline" size="icon" disabled title="Catalogue refresh is not connected">
                  <RefreshCw className="size-4" />
                  <span className="sr-only">Refresh</span>
                </Button>
                <Button type="button" variant="outline" disabled title="Variants management is unavailable on web">
                  <Layers className="size-4" />
                  Variants
                </Button>
                <Button type="button" disabled title="Product creation is unavailable on web">
                  <Plus className="size-4" />
                  Add Product
                </Button>
              </div>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={selectedProduct !== null} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-full max-w-5xl min-w-0 overflow-x-hidden overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
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
                ["Stock", "—"],
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
                <Button variant="outline" onClick={() => setSelectedProduct(null)}>Close</Button>
                <Button variant="outline" disabled><Eye className="size-4" /> Edit product unavailable</Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
