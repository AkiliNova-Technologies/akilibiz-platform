"use client";

import { useMemo, useState } from "react";
import { Banknote, Download, Package, Plus, ShoppingBag, Truck, Upload, Wallet } from "lucide-react";
import { DataTable, type TableAction, type TableField } from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { HostedSupplier } from "@/components/akilibiz/contacts/hosted-directory";

function Unavailable() {
  return <span className="text-muted-foreground">—</span>;
}

export function HostedSuppliers({suppliers,error}:{suppliers:HostedSupplier[];error?:string|null}) {
  const [selected, setSelected] = useState<HostedSupplier | null>(null);
  const activeCount = useMemo(() => suppliers.filter((supplier) => supplier.is_active).length, [suppliers]);

  // The contact-directory query cannot establish purchases, payables or product counts.
  const fields: TableField<HostedSupplier>[] = [
    { key: "name", header: "Supplier", enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span> },
    { key: "contact_person", header: "Contact Person", align: "center", enableSorting: true,
      cell: (value) => String(value || "—") },
    { key: "phone", header: "Phone", align: "center",
      cell: (value) => <span className="font-mono text-sm">{String(value || "—")}</span> },
    { key: "email", header: "Email", align: "center",
      cell: (value) => <span className="text-sm">{String(value || "—")}</span> },
    { key: "products_supplied", header: "Products", align: "center", enableSorting: false,
      cell: () => <Unavailable /> },
    { key: "total_purchases", header: "Total Purchases", align: "right", enableSorting: false,
      cell: () => <Unavailable /> },
    { key: "outstanding_balance", header: "Outstanding", align: "right", enableSorting: false,
      cell: () => <Unavailable /> },
    { key: "last_supply_date", header: "Last Supply", align: "center", enableSorting: false,
      cell: () => <Unavailable /> },
    { key: "is_active", header: "Status", align: "center",
      cell: (value) => <Badge variant={value ? "outline" : "secondary"}>{value ? "Active" : "Inactive"}</Badge> },
  ];

  const actions: TableAction<HostedSupplier>[] = [
    { type: "view", label: "View supplier", onClick: setSelected },
    { type: "edit", label: "Edit supplier", onClick: () => {}, disabled: () => true },
    { type: "custom", label: "View purchases", icon: <ShoppingBag className="size-4" />,
      onClick: () => {}, disabled: () => true },
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 md:gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Supplier Directory</h2>
        <p className="text-sm text-muted-foreground">Manage supplier information and purchasing relationships.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MetricCard title="Total Suppliers" value={error ? "—" : String(suppliers.length)}
          description={error ? "Supplier information unavailable" : `${activeCount} active suppliers`} icon={<Truck className="size-5" />} />
        <MetricCard title="Active Suppliers" value={error ? "—" : String(activeCount)}
          description="Available suppliers" icon={<Package className="size-5" />} />
        <MetricCard title="Purchase Value" value="—"
          description="Purchase totals unavailable" icon={<Banknote className="size-5" />} />
        <MetricCard title="Outstanding" value="—"
          description="Supplier payables unavailable" icon={<Wallet className="size-5" />} />
      </section>

      <Card>
        <CardContent className="min-w-0 px-3 pb-4 sm:px-4 md:px-6 md:pb-6">
          <DataTable<HostedSupplier>
            title="Supplier Directory"
            description="View and manage supplier records."
            data={suppliers}
            fields={fields}
            actions={actions}
            enableGlobalSearch
            searchPlaceholder="Search suppliers..."
            pageSize={10}
            onRowClick={setSelected}
            emptyMessage={error ?? "No suppliers found."}
            toolbarActions={
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled title="Supplier import is unavailable">
                  <Upload className="size-4" />Import
                </Button>
                <Button type="button" variant="outline" disabled title="Supplier export is unavailable">
                  <Download className="size-4" />Export
                </Button>
                <Button type="button" disabled title="Supplier creation is unavailable">
                  <Plus className="size-4" />Add Supplier
                </Button>
              </div>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Supplier Details</DialogTitle>
            <DialogDescription>Review the supplier's available contact information.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <Card><CardContent className="space-y-3 p-4">
                {([
                  ["Supplier", selected.name],
                  ["Contact Person", selected.contact_person || "—"],
                  ["Phone", selected.phone || "—"],
                  ["Email", selected.email || "—"],
                  ["Address", selected.address || "—"],
                  ["Payment Terms", selected.payment_terms || "—"],
                  ["Products Supplied", "—"],
                  ["Total Purchases", "—"],
                  ["Outstanding", "—"],
                  ["Last Supply", "—"],
                  ["Status", selected.is_active ? "Active" : "Inactive"],
                ] as const).map(([label, value]) => (
                  <div className="flex justify-between gap-4" key={label}>
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className="text-right text-sm font-medium">{value}</span>
                  </div>
                ))}
                <Separator />
              </CardContent></Card>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Close</Button>
                <Button className="flex-1" disabled title="Supplier editing is unavailable">Edit Supplier</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
