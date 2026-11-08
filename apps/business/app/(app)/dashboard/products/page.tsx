"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Archive,
  Banknote,
  Download,
  History,
  Package,
  Plus,
  RefreshCw,
  ReceiptText,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import {
  ProductSheet,
  initialProductForm,
  type ProductFormData,
} from "@/components/akilibiz/products/product-sheet";
import {
  ProductExportDialog,
  ProductImportDialog,
  ProductImportHistoryDialog,
} from "@/components/akilibiz/products/product-transfer-dialogs";
import {
  type Product,
  type ProductPayload,
  formatProductCurrency,
  useProductsData,
} from "@/components/akilibiz/products/products-data";
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
type ProductRow = Product & TableData;
const number = (value: number | string | undefined | null) =>
  typeof value === "number" ? value : parseFloat(value ?? "0") || 0;
const form = (p: Product): ProductFormData => ({
  name: p.name,
  sku: p.sku,
  barcode: p.barcode ?? "",
  category_id: String(p.category_id ?? ""),
  brand: p.brand ?? "",
  description: p.description ?? "",
  product_type: p.product_type,
  inventory_type: p.inventory_type,
  stock_unit: p.stock_unit,
  sales_unit: p.sales_unit,
  purchase_unit: p.purchase_unit ?? "",
  unit_conversion_factor: String(p.unit_conversion_factor),
  pack_size: String(p.pack_size ?? ""),
  cost_price: String(p.cost_price),
  selling_price: String(p.selling_price),
  wholesale_price: String(p.wholesale_price ?? ""),
  minimum_selling_price: String(p.minimum_selling_price ?? ""),
  stock_quantity: String(p.stock_quantity),
  min_stock_level: String(p.min_stock_level),
  max_stock_level: String(p.max_stock_level),
  allow_decimal_quantity: p.allow_decimal_quantity,
  allow_negative_stock: p.allow_negative_stock,
  track_expiry: p.track_expiry,
  track_batches: p.track_batches,
  is_taxable: p.is_taxable,
  tax_classification_id: String(p.tax_classification_id ?? ""),
  tax_inclusive: p.tax_inclusive,
  is_active: p.is_active,
});
const payload = (data: ProductFormData): ProductPayload => ({
  name: data.name,
  sku: data.sku,
  barcode: data.barcode || null,
  category_id: Number(data.category_id),
  brand: data.brand || null,
  description: data.description || null,
  product_type: data.product_type,
  inventory_type: data.inventory_type,
  stock_unit: data.stock_unit,
  sales_unit: data.sales_unit,
  purchase_unit: data.purchase_unit || null,
  unit_conversion_factor: number(data.unit_conversion_factor),
  pack_size: data.pack_size ? number(data.pack_size) : null,
  cost_price: number(data.cost_price),
  selling_price: number(data.selling_price),
  wholesale_price: data.wholesale_price ? number(data.wholesale_price) : null,
  minimum_selling_price: data.minimum_selling_price
    ? number(data.minimum_selling_price)
    : null,
  stock_quantity: number(data.stock_quantity),
  min_stock_level: number(data.min_stock_level),
  max_stock_level: number(data.max_stock_level),
  allow_decimal_quantity: data.allow_decimal_quantity,
  allow_negative_stock: data.allow_negative_stock,
  track_expiry: data.track_expiry,
  track_batches: data.track_batches,
  is_taxable: data.is_taxable,
  tax_classification_id: data.tax_classification_id
    ? Number(data.tax_classification_id)
    : null,
  tax_inclusive: data.tax_inclusive,
  is_active: data.is_active,
});
export default function ProductsPage() {
  const {
    products,
    categories,
    classifications,
    loading,
    getProducts,
    addProduct,
    editProduct,
    removeProduct,
  } = useProductsData();
  const [add, setAdd] = useState(false),
    [edit, setEdit] = useState(false),
    [view, setView] = useState(false),
    [remove, setRemove] = useState(false),
    [imports, setImports] = useState(false),
    [exports, setExports] = useState(false),
    [history, setHistory] = useState(false),
    [current, setCurrent] = useState<ProductRow | null>(null);
  useEffect(() => {
    void getProducts();
  }, [getProducts]);
  const category = (id?: number, name?: string) =>
    name ?? categories.find((item) => item.id === id)?.name ?? "Uncategorized";
  const tax = (id?: number | null) =>
    classifications.find((item) => item.id === id)?.name;
  const rows = products as ProductRow[];
  const fields: TableField<ProductRow>[] = [
    { key: "name", header: "Name", enableSorting: true },
    {
      key: "sku",
      header: "SKU",
      align: "center",
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "category_id",
      header: "Category",
      align: "center",
      cell: (_, row) => (
        <Badge variant="outline">
          {category(row.category_id, row.category_name)}
        </Badge>
      ),
    },
    {
      key: "tax_classification_id",
      header: "Tax",
      align: "center",
      cell: (_, row) =>
        tax(row.tax_classification_id) ? (
          <Badge variant="outline">{tax(row.tax_classification_id)}</Badge>
        ) : (
          <Badge variant="secondary">Not set</Badge>
        ),
    },
    {
      key: "selling_price",
      header: "Selling Price",
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="font-semibold">
          {formatProductCurrency(number(value as number))}
        </span>
      ),
    },
    {
      key: "cost_price",
      header: "Cost Price",
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {formatProductCurrency(number(value as number))}
        </span>
      ),
    },
    {
      key: "stock_quantity",
      header: "Stock",
      align: "center",
      enableSorting: true,
      cell: (value, row) =>
        Number(value) === 0 ? (
          <Badge variant="destructive">Out of stock</Badge>
        ) : Number(value) <= row.min_stock_level ? (
          <Badge variant="outline" className="border-amber-300 text-amber-700">
            Low: {Number(value)}
          </Badge>
        ) : (
          <Badge variant="secondary">{Number(value)}</Badge>
        ),
    },
    {
      key: "profit_margin",
      header: "Margin",
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span
          className={
            Number(value) >= 20
              ? "font-mono text-sm text-emerald-600"
              : Number(value) >= 10
                ? "font-mono text-sm text-amber-600"
                : "font-mono text-sm text-red-600"
          }>
          {Number(value).toFixed(1)}%
        </span>
      ),
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
  const actions: TableAction<ProductRow>[] = [
    {
      type: "view",
      label: "View",
      onClick: (row) => {
        setCurrent(row);
        setView(true);
      },
    },
    {
      type: "edit",
      label: "Edit",
      onClick: (row) => {
        setCurrent(row);
        setEdit(true);
      },
    },
    {
      type: "delete",
      label: "Deactivate",
      onClick: (row) => {
        setCurrent(row);
        setRemove(true);
      },
    },
  ];
  const inventory = rows.reduce(
      (sum, p) => sum + p.stock_quantity * p.cost_price,
      0,
    ),
    average =
      rows.reduce((sum, p) => sum + p.profit_margin, 0) /
      Math.max(rows.length, 1);
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Product Catalogue
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage products, stock levels, pricing, and category assignments.
            </p>
            <p className="pt-2 text-sm">
              <Link className="font-medium text-primary underline-offset-4 hover:underline" href="/dashboard/products/synced">
                View products uploaded from AkiliBiz Desktop
              </Link>
            </p>
          </div>
          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="Total Products"
              value={String(rows.length)}
              description={`${rows.filter((p) => p.is_active).length} active products`}
              icon={<Package className="size-5" />}
            />
            <MetricCard
              title="Stock Risk"
              value={String(rows.filter((p) => p.is_low_stock).length)}
              description="Products requiring restocking"
              icon={<AlertTriangle className="size-5" />}
            />
            <MetricCard
              title="Inventory Cost Value"
              value={formatProductCurrency(inventory)}
              description="Current stock at cost"
              icon={<Archive className="size-5" />}
            />
            <MetricCard
              title="Average Margin"
              value={`${average.toFixed(1)}%`}
              description="Average product profitability"
              icon={<Banknote className="size-5" />}
            />
          </section>
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable
                title="Product Catalogue"
                description="Manage product records, inventory, and pricing"
                data={rows}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder="Search products..."
                pageSize={10}
                onRowClick={(row) => {
                  setCurrent(row);
                  setView(true);
                }}
                emptyMessage={
                  loading ? "Loading products..." : "No products found."
                }
                toolbarActions={
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setImports(true)}>
                      <Upload className="mr-2 size-4" />
                      Import
                    </Button>
                    <Button variant="outline" onClick={() => setHistory(true)}>
                      <History className="mr-2 size-4" />
                      Import history
                    </Button>
                    <Button variant="outline" onClick={() => setExports(true)}>
                      <Download className="mr-2 size-4" />
                      Export
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void getProducts()}>
                      <RefreshCw className="mr-2 size-4" />
                      Refresh
                    </Button>
                    <Button
                      onClick={() => {
                        setCurrent(null);
                        setAdd(true);
                      }}>
                      <Plus className="mr-2 size-4" />
                      Add product
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <ProductSheet
        open={add}
        onOpenChange={setAdd}
        initialData={initialProductForm}
        onSubmit={async (data) => {
          await addProduct(payload(data));
          toast.success("Product added");
        }}
        categories={categories}
        classifications={classifications}
      />
      <ProductSheet
        open={edit}
        onOpenChange={setEdit}
        isEdit
        initialData={current ? form(current) : initialProductForm}
        onSubmit={async (data) => {
          if (current) {
            await editProduct(current.id, payload(data));
            toast.success("Product updated");
          }
        }}
        categories={categories}
        classifications={classifications}
      />
      <ProductImportDialog
        open={imports}
        onOpenChange={setImports}
        onImportComplete={getProducts}
      />
      <ProductExportDialog
        open={exports}
        onOpenChange={setExports}
        products={products}
      />
      <ProductImportHistoryDialog open={history} onOpenChange={setHistory} />
      <AlertDialog open={remove} onOpenChange={setRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate product?</AlertDialogTitle>
            <AlertDialogDescription>
              This product will no longer be active for new sales.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {current && (
            <div className="my-2 space-y-3 rounded-lg border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{current.name}</span>
                <Badge variant="outline">{current.sku}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <span>
                  Category:{" "}
                  {category(current.category_id, current.category_name)}
                </span>
                <span>Stock: {current.stock_quantity} units</span>
                <span>
                  Selling: {formatProductCurrency(current.selling_price)}
                </span>
                <span>Cost: {formatProductCurrency(current.cost_price)}</span>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (current) {
                  await removeProduct(current.id);
                  setRemove(false);
                  setCurrent(null);
                  toast.success("Product deactivated");
                }
              }}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={view} onOpenChange={setView}>
        <DialogContent className="max-h-[90vh] w-full max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              Review product information, pricing, stock position, and metadata.
            </DialogDescription>
          </DialogHeader>
          {current && (
            <div className="space-y-6 py-2">
              <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-2xl font-semibold">{current.name}</h3>
                    <Badge
                      variant={current.is_active ? "outline" : "destructive"}>
                      {current.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {current.is_low_stock && (
                      <Badge
                        variant="outline"
                        className="border-amber-500/60 text-amber-700">
                        Low stock
                      </Badge>
                    )}
                    {tax(current.tax_classification_id) && (
                      <Badge variant="outline">
                        <ReceiptText className="mr-1 size-3" />
                        {tax(current.tax_classification_id)}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    SKU:{" "}
                    <span className="font-mono text-foreground">
                      {current.sku}
                    </span>
                    {current.barcode && (
                      <>
                        {" "}
                        · Barcode:{" "}
                        <span className="font-mono text-foreground">
                          {current.barcode}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <Badge variant="outline" className="w-fit">
                  {category(current.category_id, current.category_name)}
                </Badge>
              </div>
              <div className="grid gap-8 lg:grid-cols-2">
                <section>
                  <h4 className="font-semibold">Pricing</h4>
                  <dl className="mt-3 divide-y border-y text-sm">
                    {[
                      ["Cost Price", formatProductCurrency(current.cost_price)],
                      [
                        "Selling Price",
                        formatProductCurrency(current.selling_price),
                      ],
                      ["Profit Margin", `${current.profit_margin.toFixed(1)}%`],
                      [
                        "Profit Per Unit",
                        formatProductCurrency(
                          current.selling_price - current.cost_price,
                        ),
                      ],
                    ].map(([label, value]) => (
                      <div className="flex justify-between py-3" key={label}>
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
                <section>
                  <h4 className="font-semibold">Stock Position</h4>
                  <dl className="mt-3 divide-y border-y text-sm">
                    {[
                      ["Current Stock", current.stock_quantity],
                      [
                        "Stock Value",
                        formatProductCurrency(
                          current.stock_quantity * current.cost_price,
                        ),
                      ],
                      ["Minimum Stock", current.min_stock_level],
                      ["Maximum Stock", current.max_stock_level],
                    ].map(([label, value]) => (
                      <div className="flex justify-between py-3" key={label}>
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="font-medium">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={
                        current.stock_quantity <= current.min_stock_level
                          ? "h-full bg-amber-500"
                          : "h-full bg-primary"
                      }
                      style={{
                        width: `${Math.min(100, (current.stock_quantity / Math.max(current.max_stock_level, 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </section>
              </div>
              <section className="border-t pt-6">
                <h4 className="font-semibold">Description</h4>
                <p className="mt-3 whitespace-pre-wrap text-sm">
                  {current.description || "No description provided."}
                </p>
              </section>
              <section className="border-t pt-6">
                <h4 className="font-semibold">Metadata</h4>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  {[
                    ["ID", current.id],
                    [
                      "Created",
                      new Date(current.created_at).toLocaleDateString("en-UG"),
                    ],
                    [
                      "Last Updated",
                      new Date(current.updated_at).toLocaleDateString("en-UG"),
                    ],
                    [
                      "Inventory Status",
                      current.is_low_stock
                        ? "Needs restocking"
                        : "Adequate stock",
                    ],
                  ].map(([label, value]) => (
                    <div
                      className="flex justify-between border-b pb-3"
                      key={label}>
                      <span className="text-muted-foreground">{label}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
