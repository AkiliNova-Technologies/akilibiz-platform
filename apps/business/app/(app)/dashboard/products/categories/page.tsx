"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Banknote,
  Box,
  Download,
  FolderTree,
  History,
  Plus,
  RefreshCw,
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
  CategoryImportDialog,
  CategoryExportDialog,
  CategoryImportHistoryDialog,
} from "@/components/akilibiz/products/category-transfer-dialogs";
import {
  type Category,
  useCategoriesData,
} from "@/components/akilibiz/products/categories-data";
import { formatProductCurrency } from "@/components/akilibiz/products/products-data";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
type Row = Category & TableData;
const quantity = (milli: number) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(
    milli / 1000,
  );
const date = (value: string) =>
  new Date(value).toLocaleDateString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
export default function ProductCategoriesPage() {
  const {
    categories,
    loading,
    error,
    getCategories,
    addCategory,
    editCategory,
  } = useCategoriesData();
  const [selected, setSelected] = useState<Row | null>(null);
  const [view, setView] = useState(false),
    [form, setForm] = useState(false),
    [remove, setRemove] = useState(false),
    [imports, setImports] = useState(false),
    [exports, setExports] = useState(false),
    [history, setHistory] = useState(false),
    [isEdit, setIsEdit] = useState(false);
  const [data, setData] = useState({
    name: "",
    description: "",
    is_active: true,
  });
  useEffect(() => {
    void getCategories();
  }, [getCategories]);
  const rows = categories as Row[];
  const openAdd = () => {
    setData({ name: "", description: "", is_active: true });
    setSelected(null);
    setIsEdit(false);
    setForm(true);
  };
  const openEdit = (row: Row) => {
    setSelected(row);
    setData({
      name: row.name,
      description: row.description ?? "",
      is_active: row.is_active,
    });
    setIsEdit(true);
    setForm(true);
  };
  const fields: TableField<Row>[] = [
    {
      key: "name",
      header: "Name",
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "slug",
      header: "Slug",
      align: "center",
      cell: (value) => <Badge variant="secondary">{String(value)}</Badge>,
    },
    {
      key: "description",
      header: "Description",
      cell: (value) => (
        <span className="line-clamp-1 text-wrap text-sm text-muted-foreground">
          {String(value || "-")}
        </span>
      ),
    },
    {
      key: "product_count",
      header: "Products",
      align: "center",
      enableSorting: true,
      cell: (value) => <Badge variant="outline">{Number(value)}</Badge>,
    },
    {
      key: "stock_quantity_milli",
      header: "Stock Quantity",
      align: "center",
      enableSorting: true,
      cell: (value) => quantity(Number(value)),
    },
    {
      key: "inventory_value_ugx",
      header: "Inventory Value",
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-semibold">
          {formatProductCurrency(Number(value))}
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
    {
      key: "created_at",
      header: "Created",
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
      type: "view",
      label: "View",
      onClick: (row) => {
        setSelected(row);
        setView(true);
      },
    },
    { type: "edit", label: "Edit", onClick: openEdit },
    {
      type: "delete",
      label: "Deactivate",
      onClick: (row) => {
        setSelected(row);
        setRemove(true);
      },
    },
  ];
  const inventory = rows.reduce((sum, row) => sum + row.inventory_value_ugx, 0);
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Category Management
            </h2>
            <p className="text-sm text-muted-foreground">
              Organize products and track category-level inventory.
            </p>
          </div>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="Total Categories"
              value={String(rows.length)}
              description={`${rows.filter((row) => row.is_active).length} active categories`}
              icon={<FolderTree className="size-5" />}
            />
            <MetricCard
              title="Assigned Products"
              value={String(
                rows.reduce((sum, row) => sum + row.product_count, 0),
              )}
              description="Products assigned to categories"
              icon={<Box className="size-5" />}
            />
            <MetricCard
              title="Inventory Value"
              value={formatProductCurrency(inventory)}
              description="Category-level stock value"
              icon={<Archive className="size-5" />}
            />
            <MetricCard
              title="Active Categories"
              value={String(rows.filter((row) => row.is_active).length)}
              description="Categories available for product assignment"
              icon={<Banknote className="size-5" />}
            />
          </section>
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable
                title="Product Categories"
                description="Manage product groups, stock quantities, and inventory value"
                data={rows}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder="Search categories..."
                pageSize={10}
                onRowClick={(row) => {
                  setSelected(row);
                  setView(true);
                }}
                emptyMessage={
                  loading ? "Loading categories..." : "No categories found."
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
                      onClick={() => void getCategories()}
                      disabled={loading}>
                      <RefreshCw className="mr-2 size-4" />
                      Refresh
                    </Button>
                    <Button onClick={openAdd} disabled={loading}>
                      <Plus className="mr-2 size-4" />
                      Add category
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <CategoryImportDialog
        open={imports}
        onOpenChange={setImports}
        onImportComplete={getCategories}
      />
      <CategoryExportDialog
        open={exports}
        onOpenChange={setExports}
        categories={categories}
      />
      <CategoryImportHistoryDialog open={history} onOpenChange={setHistory} />
      <Dialog open={form} onOpenChange={setForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit category" : "Add category"}
            </DialogTitle>
            <DialogDescription>
              Create or update a product category and its availability.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <FieldLabel required htmlFor="name">
                Name
              </FieldLabel>
              <Input
                id="name"
                value={data.name}
                onChange={(e) =>
                  setData((old) => ({ ...old, name: e.target.value }))
                }
                placeholder="Enter category name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={data.description}
                onChange={(e) =>
                  setData((old) => ({ ...old, description: e.target.value }))
                }
                placeholder="Describe this category"
                rows={4}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Active category</p>
                <p className="text-sm text-muted-foreground">
                  Inactive categories cannot be used for new products.
                </p>
              </div>
              <Button
                type="button"
                variant={data.is_active ? "default" : "outline"}
                onClick={() =>
                  setData((old) => ({ ...old, is_active: !old.is_active }))
                }>
                {data.is_active ? "Active" : "Inactive"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(false)}>
              Cancel
            </Button>
            <Button
              disabled={loading || !data.name.trim()}
              onClick={async () => {
                if (isEdit && selected)
                  await editCategory(selected.id, {
                    name: data.name.trim(),
                    description: data.description.trim() || null,
                    is_active: data.is_active,
                  });
                else
                  await addCategory({
                    name: data.name.trim(),
                    description: data.description.trim() || null,
                    is_active: data.is_active,
                  });
                toast.success(isEdit ? "Category updated" : "Category created");
                setForm(false);
              }}>
              {isEdit ? "Update category" : "Create category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={view} onOpenChange={setView}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Category Details</DialogTitle>
            <DialogDescription>
              Review this category&apos;s details and inventory position.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  {[
                    ["Name", selected.name],
                    ["Slug", selected.slug],
                    ["Products", selected.product_count],
                    ["Stock Quantity", quantity(selected.stock_quantity_milli)],
                    [
                      "Inventory Value",
                      formatProductCurrency(selected.inventory_value_ugx),
                    ],
                    ["Created", date(selected.created_at)],
                  ].map(([label, value]) => (
                    <div className="flex justify-between" key={label}>
                      <span className="text-sm text-muted-foreground">
                        {label}
                      </span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <Badge
                      variant={selected.is_active ? "outline" : "secondary"}>
                      {selected.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <Separator />
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">
                      Description
                    </p>
                    <p className="text-sm">
                      {selected.description || "No description"}
                    </p>
                  </div>
                  {selected.unvalued_product_count > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        Unvalued stock
                      </span>
                      <span className="font-medium">
                        {quantity(selected.unvalued_stock_quantity_milli)} (
                        {selected.unvalued_product_count} products)
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setView(false);
                  openEdit(selected);
                }}>
                Edit category
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={remove} onOpenChange={setRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate category?</AlertDialogTitle>
            <AlertDialogDescription>
              This category will no longer be available for new product
              assignments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selected && (
            <div className="my-2 rounded-lg border bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{selected.name}</span>
                <Badge variant="outline">
                  {selected.product_count} products
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {selected.description || "No description"}
              </p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (selected) {
                  await editCategory(selected.id, { is_active: false });
                  toast.success("Category deactivated");
                  setRemove(false);
                  setSelected(null);
                }
              }}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
