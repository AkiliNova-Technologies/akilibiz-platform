"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Download,
  Package,
  Plus,
  ShoppingBag,
  Truck,
  Upload,
  WalletCards,
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
  SupplierExportDialog,
  SupplierImportDialog,
} from "@/components/akilibiz/suppliers/supplier-transfer-dialogs";
import {
  type SupplierResponse,
  formatSupplierCurrency,
  useSuppliersData,
} from "@/components/akilibiz/suppliers/suppliers-data";
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
type Row = {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address?: string;
  products_supplied: number;
  total_purchases: number;
  outstanding_balance: number;
  last_supply_date: string;
  status: "Active" | "Inactive";
  supplier: SupplierResponse;
} & TableData;
const date = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString("en-UG", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";
export default function SuppliersPage() {
  const {
    suppliers,
    summary,
    loading,
    getSuppliers,
    getSupplier,
    addSupplier,
    editSupplier,
  } = useSuppliersData();
  const [view, setView] = useState(false),
    [form, setForm] = useState(false),
    [isEdit, setIsEdit] = useState(false),
    [editing, setEditing] = useState<number | null>(null),
    [imports, setImports] = useState(false),
    [exports, setExports] = useState(false),
    [selected, setSelected] = useState<SupplierResponse | null>(null);
  const [data, setData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    status: "Active" as "Active" | "Inactive",
  });
  useEffect(() => {
    void getSuppliers();
  }, [getSuppliers]);
  const rows = useMemo<Row[]>(
    () =>
      suppliers.map((supplier) => ({
        id: supplier.id,
        name: supplier.name,
        contact_person: supplier.contact_person,
        phone: supplier.phone,
        email: supplier.email ?? "",
        address: supplier.address ?? "",
        products_supplied: supplier.products_supplied,
        total_purchases: supplier.total_purchases,
        outstanding_balance: supplier.outstanding_balance,
        last_supply_date: supplier.last_supply_date ?? "",
        status: supplier.is_active ? "Active" : "Inactive",
        supplier,
      })),
    [suppliers],
  );
  const openAdd = () => {
    setData({
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      status: "Active",
    });
    setEditing(null);
    setIsEdit(false);
    setForm(true);
  };
  const openEdit = async (row: Row) => {
    const full = await getSupplier(row.id);
    if (!full) return;
    setSelected(full);
    setEditing(full.id);
    setData({
      name: full.name,
      contact_person: full.contact_person,
      phone: full.phone,
      email: full.email ?? "",
      address: full.address ?? "",
      status: full.is_active ? "Active" : "Inactive",
    });
    setIsEdit(true);
    setForm(true);
  };
  const openView = async (row: Row) => {
    setSelected(await getSupplier(row.id));
    setView(true);
  };
  const fields: TableField<Row>[] = [
    {
      key: "name",
      header: "Supplier",
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "contact_person",
      header: "Contact Person",
      align: "center",
      enableSorting: true,
    },
    {
      key: "phone",
      header: "Phone",
      align: "center",
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "email",
      header: "Email",
      align: "center",
      cell: (value) => <span className="text-sm">{String(value) || "—"}</span>,
    },
    {
      key: "products_supplied",
      header: "Products",
      align: "center",
      enableSorting: true,
      cell: (value) => <Badge variant="outline">{Number(value)}</Badge>,
    },
    {
      key: "total_purchases",
      header: "Total Purchases",
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-semibold">
          {formatSupplierCurrency(Number(value))}
        </span>
      ),
    },
    {
      key: "outstanding_balance",
      header: "Outstanding",
      align: "right",
      enableSorting: true,
      cell: (value) =>
        Number(value) > 0 ? (
          <span className="font-medium">
            {formatSupplierCurrency(Number(value))}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      key: "last_supply_date",
      header: "Last Supply",
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {date(String(value || ""))}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) => (
        <Badge variant={value === "Active" ? "outline" : "secondary"}>
          {String(value)}
        </Badge>
      ),
    },
  ];
  const actions: TableAction<Row>[] = [
    { type: "view", label: "View", onClick: (row) => void openView(row) },
    { type: "edit", label: "Edit", onClick: (row) => void openEdit(row) },
    {
      type: "custom",
      label: "View purchases",
      icon: <ShoppingBag className="size-4" />,
      onClick: (row) => {
        toast.info(`Purchase history for ${row.name}`);
      },
    },
  ];
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Supplier Directory
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage supplier relationships, purchases, and payable balances.
            </p>
          </div>
          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="Total Suppliers"
              value={String(summary.total_suppliers)}
              description={`${summary.active_suppliers} active suppliers`}
              icon={<Truck className="size-5" />}
            />
            <MetricCard
              title="Active Suppliers"
              value={String(summary.active_suppliers)}
              description="Suppliers available for purchasing"
              icon={<Package className="size-5" />}
            />
            <MetricCard
              title="Purchase Value"
              value={formatSupplierCurrency(summary.total_purchase_value)}
              description="Total purchase value"
              icon={<Banknote className="size-5" />}
            />
            <MetricCard
              title="Outstanding"
              value={formatSupplierCurrency(summary.total_outstanding_payables)}
              description="Outstanding supplier payables"
              icon={<WalletCards className="size-5" />}
            />
          </section>
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable
                title="Supplier Directory"
                description="View and manage supplier profiles and purchasing activity."
                data={rows}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder="Search suppliers..."
                pageSize={10}
                onRowClick={(row) => void openView(row)}
                emptyMessage={
                  loading ? "Loading suppliers..." : "No suppliers found."
                }
                toolbarActions={
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setImports(true)}>
                      <Upload className="mr-2 size-4" />
                      Import
                    </Button>
                    <Button variant="outline" onClick={() => setExports(true)}>
                      <Download className="mr-2 size-4" />
                      Export
                    </Button>
                    <Button onClick={openAdd}>
                      <Plus className="mr-2 size-4" />
                      Add supplier
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <SupplierImportDialog
        open={imports}
        onOpenChange={setImports}
        onImportComplete={getSuppliers}
      />
      <SupplierExportDialog
        open={exports}
        onOpenChange={setExports}
        suppliers={suppliers}
      />
      <Dialog open={form} onOpenChange={setForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit supplier" : "Add supplier"}
            </DialogTitle>
            <DialogDescription>
              Create or update a supplier profile.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <FieldLabel required>Name</FieldLabel>
              <Input
                value={data.name}
                onChange={(e) =>
                  setData((old) => ({ ...old, name: e.target.value }))
                }
                placeholder="Enter supplier name"
              />
            </div>
            <div className="space-y-2">
              <FieldLabel required>Contact person</FieldLabel>
              <Input
                value={data.contact_person}
                onChange={(e) =>
                  setData((old) => ({ ...old, contact_person: e.target.value }))
                }
                placeholder="Enter contact person"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel required>Phone</FieldLabel>
                <Input
                  value={data.phone}
                  onChange={(e) =>
                    setData((old) => ({ ...old, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={data.email}
                  onChange={(e) =>
                    setData((old) => ({ ...old, email: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Textarea
                value={data.address}
                onChange={(e) =>
                  setData((old) => ({ ...old, address: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                !data.name.trim() ||
                !data.contact_person.trim() ||
                !data.phone.trim()
              }
              onClick={async () => {
                const payload = {
                  name: data.name.trim(),
                  contact_person: data.contact_person.trim(),
                  phone: data.phone.trim(),
                  email: data.email.trim() || null,
                  address: data.address.trim() || null,
                  is_active: data.status === "Active",
                };
                if (isEdit && editing) await editSupplier(editing, payload);
                else await addSupplier(payload);
                toast.success(isEdit ? "Supplier updated" : "Supplier created");
                setForm(false);
              }}>
              {isEdit ? "Edit supplier" : "Create supplier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={view} onOpenChange={setView}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Supplier Details</DialogTitle>
            <DialogDescription>
              Review supplier profile, purchasing, and balance information.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  {[
                    ["Supplier", selected.name],
                    ["Contact Person", selected.contact_person],
                    ["Phone", selected.phone],
                    ["Email", selected.email || "-"],
                    ["Products Supplied", selected.products_supplied],
                    [
                      "Total Purchases",
                      formatSupplierCurrency(selected.total_purchases),
                    ],
                    [
                      "Outstanding Balance",
                      formatSupplierCurrency(selected.outstanding_balance),
                    ],
                    ["Last Supply Date", date(selected.last_supply_date)],
                  ].map(([label, value]) => (
                    <div className="flex justify-between" key={label}>
                      <span className="text-sm text-muted-foreground">
                        {label}
                      </span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                  <Separator />
                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">
                      Address
                    </p>
                    <p className="text-sm">
                      {selected.address || "No address"}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status
                    </span>
                    <Badge
                      variant={selected.is_active ? "outline" : "secondary"}>
                      {selected.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setView(false);
                  void openEdit({
                    id: selected.id,
                    name: selected.name,
                    contact_person: selected.contact_person,
                    phone: selected.phone,
                    email: selected.email ?? "",
                    address: selected.address ?? "",
                    products_supplied: selected.products_supplied,
                    total_purchases: selected.total_purchases,
                    outstanding_balance: selected.outstanding_balance,
                    last_supply_date: selected.last_supply_date ?? "",
                    status: selected.is_active ? "Active" : "Inactive",
                    supplier: selected,
                  });
                }}>
                Edit supplier
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
