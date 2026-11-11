"use client";

import { useMemo, useState } from "react";
import { Banknote, Download, Mail, MapPin, Phone, Plus, ShoppingBag, Star, Upload, UserPlus, Users, Wallet } from "lucide-react";
import { DataTable, type TableAction, type TableField } from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { HostedCustomer } from "@/components/akilibiz/contacts/hosted-directory";
import { ContactEditDialog } from "@/components/akilibiz/contacts/contact-edit-dialog";

type CustomerRow = HostedCustomer & {
  total_purchases: null;
  total_spent: null;
  loyalty_tier: null;
  credit_balance: null;
  last_visit: null;
  status: "Active" | "Inactive";
};

function Missing() { return <span className="text-muted-foreground">—</span>; }

export function HostedCustomers({ customers, error, canEditContacts }: { customers: HostedCustomer[]; error?: string | null; canEditContacts: boolean }) {
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<CustomerRow | null>(null);
  const [editing, setEditing] = useState<CustomerRow | null>(null);
  const rows = useMemo<CustomerRow[]>(() => customers.map((customer) => ({
    ...customer,
    total_purchases: null,
    total_spent: null,
    loyalty_tier: null,
    credit_balance: null,
    last_visit: null,
    status: customer.is_active ? "Active" : "Inactive",
  })), [customers]);
  const active = rows.filter((customer) => customer.is_active).length;
  const loyalty = rows.filter((customer) => customer.loyalty_points > 0).length;

  const fields: TableField<CustomerRow>[] = [
    { key: "name", header: "Name", enableSorting: true },
    { key: "email", header: "Email", align: "center", cell: (value) => String(value || "—") },
    { key: "phone", header: "Phone", align: "center", cell: (value) =>
      <span className="font-mono text-sm">{String(value || "—")}</span> },
    { key: "total_purchases", header: "Purchases", align: "center", enableSorting: false, cell: () => <Missing /> },
    { key: "total_spent", header: "Total Spent", align: "right", enableSorting: false, cell: () => <Missing /> },
    { key: "loyalty_points", header: "Points", align: "center", enableSorting: true,
      cell: (value) => <span className="font-mono">{Number(value)}</span> },
    { key: "loyalty_tier", header: "Tier", align: "center", enableSorting: false, cell: () => <Missing /> },
    { key: "credit_balance", header: "Credit Balance", align: "right", enableSorting: false, cell: () => <Missing /> },
    { key: "last_visit", header: "Last Visit", align: "center", enableSorting: false, cell: () => <Missing /> },
    { key: "status", header: "Status", align: "center",
      cell: (value) => <Badge variant={value === "Active" ? "outline" : "secondary"}>{String(value)}</Badge> },
  ];

  const actions: TableAction<CustomerRow>[] = [
    { type: "view", label: "View Profile", onClick: setSelectedCustomer },
    { type: "edit", label: "Edit Customer", onClick: setEditing, disabled: (row) => !canEditContacts || !row.is_active },
    { type: "custom", label: "Purchase History", icon: <ShoppingBag className="size-4" />,
      onClick: setHistoryCustomer },
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 md:gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Customer Directory</h2>
        <p className="text-sm text-muted-foreground">Manage customer information, loyalty rewards, and purchasing activity.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MetricCard title="Total Customers" value={error ? "—" : String(rows.length)} description={error ? "Customer information unavailable" : `${active} active customers`} icon={<Users className="size-5" />} />
        <MetricCard title="New This Month" value="—" description="Recent customers unavailable" icon={<UserPlus className="size-5" />} />
        <MetricCard title="Loyalty Members" value={error ? "—" : String(loyalty)} description="Customers with loyalty points" icon={<Star className="size-5" />} />
        <MetricCard title="Average Customer Value" value="—" description="Purchasing totals unavailable" icon={<Banknote className="size-5" />} />
      </section>
      <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-2">
        <MetricCard title="Credit Customers" value="—" description="Customers currently holding unpaid balances" icon={<Wallet className="size-5" />} />
        <MetricCard title="Outstanding Credit" value="—" description="Unpaid customer balances unavailable" icon={<Banknote className="size-5" />} />
      </section>

      <Card>
        <CardContent className="min-w-0 px-3 pb-4 sm:px-4 md:px-6 md:pb-6">
          <DataTable<CustomerRow>
            title="Customer Directory"
            description="View and manage your customers."
            data={rows}
            fields={fields}
            actions={actions}
            enableGlobalSearch
            searchPlaceholder="Search customers..."
            pageSize={10}
            onRowClick={setSelectedCustomer}
            emptyMessage={error ?? "No customers found."}
            toolbarActions={
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled title="Customer import is not connected">
                  <Upload className="size-4" /> Import
                </Button>
                <Button type="button" variant="outline" disabled title="Customer export is not connected">
                  <Download className="size-4" /> Export
                </Button>
                <Button type="button" disabled title="Customer creation is not connected">
                  <Plus className="size-4" /> Add Customer
                </Button>
              </div>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={selectedCustomer !== null} onOpenChange={(open) => { if (!open) setSelectedCustomer(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Profile</DialogTitle>
            <DialogDescription>Review customer information and available activity.</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">{selectedCustomer.name}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">{selectedCustomer.customer_type}</Badge>
                      <Badge variant={selectedCustomer.is_active ? "outline" : "secondary"}>
                        {selectedCustomer.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">Customer ID: {selectedCustomer.id}</span>
                </div>
                <Separator />
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-center gap-2 text-sm"><Mail className="size-4 text-muted-foreground" />{selectedCustomer.email || "No email"}</div>
                  <div className="flex items-center gap-2 text-sm"><Phone className="size-4 text-muted-foreground" />{selectedCustomer.phone || "No phone"}</div>
                  <div className="flex items-start gap-2 text-sm md:col-span-2"><MapPin className="mt-0.5 size-4 text-muted-foreground" />{selectedCustomer.address || "No address"}</div>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  {([
                    ["Purchases", "—"],
                    ["Total Spent", "—"],
                    ["Points", String(selectedCustomer.loyalty_points)],
                    ["Credit Limit", "—"],
                    ["Opening Balance", "—"],
                    ["Outstanding Balance", "—"],
                    ["Last Visit", "—"],
                  ] as const).map(([label, value]) =>
                    <div className="flex justify-between gap-4 text-sm" key={label}>
                      <span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span>
                    </div>)}
                </div>
                <Separator />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="flex-1" disabled={!canEditContacts||!selectedCustomer.is_active}
                    onClick={()=>{setEditing(selectedCustomer);setSelectedCustomer(null);}}>Edit Customer</Button>
                  <Button className="flex-1" onClick={() => { setHistoryCustomer(selectedCustomer); setSelectedCustomer(null); }}>
                    <ShoppingBag className="size-4" /> Purchase History
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </DialogContent>
      </Dialog>

      {editing&&<ContactEditDialog key={editing.id} contact={editing} entity="customer"
        onClose={()=>setEditing(null)}/>}
      <Dialog open={historyCustomer !== null} onOpenChange={(open) => { if (!open) setHistoryCustomer(null); }}>
        <DialogContent className="sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Purchase History — {historyCustomer?.name}</DialogTitle>
            <DialogDescription>No purchase records available.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricCard title="Total Purchases" value="—" description="Purchase records unavailable" icon={<ShoppingBag className="size-5" />} />
            <MetricCard title="Total Spent" value="—" description="Sales records unavailable" icon={<Banknote className="size-5" />} />
            <MetricCard title="Average Purchase" value="—" description="Sales records unavailable" icon={<Star className="size-5" />} />
          </div>
          <Card><CardContent className="p-4 text-sm text-muted-foreground">
            No purchase history available.
          </CardContent></Card>
        </DialogContent>
      </Dialog>
    </div>
  );
}
