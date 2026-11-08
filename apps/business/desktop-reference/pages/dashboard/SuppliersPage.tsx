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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  IconCash,
  IconDownload,
  IconPackage,
  IconPlus,
  IconShoppingBag,
  IconTruck,
  IconUpload,
  IconWallet,
} from "@tabler/icons-react";
import MetricCard from "@/components/metric-card";
import { useReduxSuppliers } from "@/hooks/useReduxSuppliers";
import type {
  CreateSupplierPayload,
  SupplierResponse,
  UpdateSupplierPayload,
} from "@/services/tauri/suppliers";
import { ImportDialog } from "@/components/ImportDialog";
import { ExportDialog } from "@/components/ExportDialog";
import { useI18n } from "@/hooks/useI18n";
import { formatCurrency as formatDisplayCurrency, formatDate as formatDisplayDate } from "@/i18n";

const formatCurrency = formatDisplayCurrency;

// ============================================================================
// TYPES
// ============================================================================

interface SupplierRow extends TableData {
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
}

interface SupplierFormData {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  status: "Active" | "Inactive";
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return formatDisplayDate(date);
}

function mapSupplierRow(supplier: SupplierResponse): SupplierRow {
  return {
    id: supplier.id,
    name: supplier.name,
    contact_person: supplier.contact_person,
    phone: supplier.phone,
    email: supplier.email || "",
    address: supplier.address || "",
    products_supplied: supplier.products_supplied,
    total_purchases: supplier.total_purchases,
    outstanding_balance: supplier.outstanding_balance,
    last_supply_date: supplier.last_supply_date || "",
    status: supplier.is_active ? "Active" : "Inactive",
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SuppliersPage() {
  const { t } = useI18n();
  const {
    suppliers,
    selectedSupplier,
    summary,
    loading,
    getSuppliers,
    getSupplier,
    addSupplier,
    editSupplier,
    getSupplierSummary,
    clearSupplier,
  } = useReduxSuppliers();

  const [viewOpen, setViewOpen] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [isEdit, setIsEdit] = React.useState(false);
  const [editingSupplierId, setEditingSupplierId] = React.useState<
    number | null
  >(null);
  const [importDialogOpen, setImportDialogOpen] = React.useState(false);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);

  const [formData, setFormData] = React.useState<SupplierFormData>({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    status: "Active",
  });

  React.useEffect(() => {
    void Promise.all([getSuppliers(), getSupplierSummary()]);
  }, [getSuppliers, getSupplierSummary]);

  React.useEffect(() => {
    if (!viewOpen && !formOpen) {
      clearSupplier();
    }
  }, [viewOpen, formOpen, clearSupplier]);

  const supplierRows = React.useMemo<SupplierRow[]>(() => {
    return suppliers.map(mapSupplierRow);
  }, [suppliers]);

  const totalSuppliers = summary?.total_suppliers ?? supplierRows.length;
  const activeSuppliers =
    summary?.active_suppliers ??
    supplierRows.filter((s) => s.status === "Active").length;
  const totalPurchasesValue =
    summary?.total_purchase_value ??
    supplierRows.reduce((sum, s) => sum + s.total_purchases, 0);
  const totalOutstandingPayables =
    summary?.total_outstanding_payables ??
    supplierRows.reduce((sum, s) => sum + s.outstanding_balance, 0);

  const resetForm = () => {
    setFormData({
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
      status: "Active",
    });
  };

  const handleAdd = () => {
    resetForm();
    setEditingSupplierId(null);
    setIsEdit(false);
    setFormOpen(true);
  };

  const handleEdit = async (supplier: SupplierRow) => {
    const full = await getSupplier(supplier.id);

    setEditingSupplierId(full.id);
    setFormData({
      name: full.name,
      contact_person: full.contact_person,
      phone: full.phone,
      email: full.email || "",
      address: full.address || "",
      status: full.is_active ? "Active" : "Inactive",
    });
    setIsEdit(true);
    setFormOpen(true);
  };

  const handleView = async (supplier: SupplierRow) => {
    await getSupplier(supplier.id);
    setViewOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    if (!formData.contact_person.trim()) return;
    if (!formData.phone.trim()) return;

    if (isEdit && editingSupplierId) {
      const payload: UpdateSupplierPayload = {
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        is_active: formData.status === "Active",
      };

      const updated = await editSupplier(editingSupplierId, payload);
      if (!updated) return;
    } else {
      const payload: CreateSupplierPayload = {
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        is_active: formData.status === "Active",
      };

      const created = await addSupplier(payload);
      if (!created) return;
    }

    setFormOpen(false);
    resetForm();
    setEditingSupplierId(null);
  };

  const supplierFields: TableField<SupplierRow>[] = [
    {
      key: "name",
      header: t("suppliers.supplier"),
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "contact_person",
      header: t("suppliers.contactPerson"),
      align: "center",
      enableSorting: true,
    },
    {
      key: "phone",
      header: t("customers.phone"),
      align: "center",
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "email",
      header: t("customers.email"),
      align: "center",
      cell: (value) => <span className="text-sm">{String(value) || "—"}</span>,
    },
    {
      key: "products_supplied",
      header: t("suppliers.products"),
      align: "center",
      enableSorting: true,
      cell: (value) => <Badge variant="outline">{Number(value)}</Badge>,
    },
    {
      key: "total_purchases",
      header: t("suppliers.totalPurchases"),
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-semibold">{formatCurrency(Number(value))}</span>
      ),
    },
    {
      key: "outstanding_balance",
      header: t("suppliers.outstanding"),
      align: "right",
      enableSorting: true,
      cell: (value) => {
        const amount = Number(value);
        return amount > 0 ? (
          <span className="font-medium">{formatCurrency(amount)}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      key: "last_supply_date",
      header: t("suppliers.lastSupply"),
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(String(value || ""))}
        </span>
      ),
    },
    {
      key: "status",
      header: t("sales.status"),
      align: "center",
      cell: (value) => (
        <Badge variant={String(value) === "Active" ? "outline" : "secondary"}>
          {String(value)}
        </Badge>
      ),
    },
  ];

  const supplierActions: TableAction<SupplierRow>[] = [
    {
      type: "view",
      label: t("suppliers.view"),
      onClick: handleView,
    },
    {
      type: "edit",
      label: t("suppliers.edit"),
      onClick: handleEdit,
    },
    {
      type: "custom",
      label: t("suppliers.viewPurchases"),
      icon: <IconShoppingBag className="size-4" />,
      onClick: (row) => {
        console.log("View supplier purchase history:", row.id);
      },
    },
  ];

  return (
    <>
      <SiteHeader label={t("suppliers.title")} />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("suppliers.directory")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("suppliers.description")}
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title={t("suppliers.total")}
              value={String(totalSuppliers)}
              description={`${activeSuppliers} active suppliers`}
              icon={<IconTruck className="size-5" />}
            />

            <MetricCard
              title={t("suppliers.active")}
              value={String(activeSuppliers)}
              description={t("suppliers.availableDescription")}
              icon={<IconPackage className="size-5" />}
            />

            <MetricCard
              title={t("suppliers.purchaseValue")}
              value={formatCurrency(totalPurchasesValue)}
              description={t("suppliers.purchaseValueDescription")}
              icon={<IconCash className="size-5" />}
            />

            <MetricCard
              title={t("suppliers.outstanding")}
              value={formatCurrency(totalOutstandingPayables)}
              description={t("suppliers.payablesDescription")}
              icon={<IconWallet className="size-5" />}
            />
          </section>

          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<SupplierRow>
                title={t("suppliers.directory")}
                description={t("suppliers.directoryDescription")}
                data={supplierRows}
                fields={supplierFields}
                actions={supplierActions}
                enableGlobalSearch
                searchPlaceholder={t("suppliers.search")}
                pageSize={10}
                onRowClick={handleView}
                emptyMessage={
                  loading ? t("suppliers.loading") : t("suppliers.empty")
                }
                toolbarActions={
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setImportDialogOpen(true)}>
                      <IconUpload className="mr-2 size-4" />
                      {t("suppliers.import")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setExportDialogOpen(true)}>
                      <IconDownload className="mr-2 size-4" />
                      {t("suppliers.export")}
                    </Button>
                    <Button onClick={handleAdd}>
                      <IconPlus className="mr-2 size-4" />
                      {t("suppliers.add")}
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        importType="suppliers"
        onImportComplete={getSuppliers}
      />
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        exportType="suppliers"
      />

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t("suppliers.edit") : t("suppliers.add")}
            </DialogTitle>
            <DialogDescription>
              {t("suppliers.formDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <FieldLabel required htmlFor="name">{t("suppliers.name")}</FieldLabel>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={t("suppliers.enterName")}
              />
            </div>

            <div className="space-y-2">
              <FieldLabel required htmlFor="contact_person">{t("suppliers.contactPerson")}</FieldLabel>
              <Input
                id="contact_person"
                required
                value={formData.contact_person}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    contact_person: e.target.value,
                  }))
                }
                placeholder={t("suppliers.enterContact")}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel required htmlFor="phone">{t("customers.phone")}</FieldLabel>
                <Input
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder={t("suppliers.enterPhone")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("customers.email")}</Label>
                <Input
                  id="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder={t("suppliers.enterEmail")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t("customers.address")}</Label>
              <Textarea
                id="address"
                rows={3}
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                placeholder={t("suppliers.enterAddress")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              {t("pos.cancel")}
            </Button>
            <Button onClick={handleSubmit}>
              {isEdit ? t("suppliers.edit") : t("suppliers.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("suppliers.details")}</DialogTitle>
            <DialogDescription>
              {t("suppliers.detailsDescription")}
            </DialogDescription>
          </DialogHeader>

          {selectedSupplier && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("suppliers.supplier")}
                    </span>
                    <span className="font-medium">{selectedSupplier.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("suppliers.contactPerson")}
                    </span>
                    <span className="font-medium">
                      {selectedSupplier.contact_person}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("customers.phone")}</span>
                    <span className="font-medium">
                      {selectedSupplier.phone}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">{t("customers.email")}</span>
                    <span className="font-medium">
                      {selectedSupplier.email || "-"}
                    </span>
                  </div>

                  <Separator />

                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">
                      {t("customers.address")}
                    </p>
                    <p className="text-sm">
                      {selectedSupplier.address || t("suppliers.noAddress")}
                    </p>
                  </div>

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("suppliers.productsSupplied")}
                    </span>
                    <span className="font-medium">
                      {selectedSupplier.products_supplied}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("suppliers.totalPurchases")}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(selectedSupplier.total_purchases)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("suppliers.outstandingBalance")}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(selectedSupplier.outstanding_balance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("suppliers.lastSupplyDate")}
                    </span>
                    <span className="font-medium">
                      {formatDate(selectedSupplier.last_supply_date)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      {t("sales.status")}
                    </span>
                    <Badge
                      variant={
                        selectedSupplier.is_active ? "outline" : "secondary"
                      }>
                      {selectedSupplier.is_active ? t("common.active") : t("common.inactive")}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setViewOpen(false);
                    handleEdit(mapSupplierRow(selectedSupplier));
                  }}>
                  {t("suppliers.edit")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
