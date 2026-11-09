"use client";

import { useState } from "react";
import { Clock3, Plus, RefreshCw, ShieldCheck, UserCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { DataTable, type TableAction, type TableData, type TableField } from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { GrantAccessForm } from "./grant-access-form";
import { deactivateStaffAccess } from "./staff-actions";

export type StaffMember = {
  user_id: string;
  email: string;
  role: "owner" | "manager" | "cashier" | "inventory_staff" | "accountant";
  active: boolean;
};

type StaffRow = StaffMember & TableData & {
  name: null;
  phone: null;
  status: "Active" | "Inactive";
};
const roleLabel = (role: StaffMember["role"]) =>
  role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function StaffDirectory({ members, error }: { members: StaffMember[]; error?: string | null }) {
  const router = useRouter();
  const [selected, setSelected] = useState<StaffRow | null>(null);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [adding, setAdding] = useState(false);
  const rows: StaffRow[] = members.map((member) => ({
    ...member,
    name: null,
    phone: null,
    status: member.active ? "Active" : "Inactive",
  }));
  const active = rows.filter((member) => member.active).length;
  const inactive = rows.length - active;
  const fields: TableField<StaffRow>[] = [
    { key: "name", header: "Name", enableSorting: false,
      cell: () => <span className="text-muted-foreground">—</span> },
    { key: "email", header: "Email", enableSorting: true,
      cell: (value) => <span className="break-all text-sm">{String(value)}</span> },
    { key: "role", header: "Role", align: "center",
      cell: (value) => <Badge variant="outline">{roleLabel(value as StaffMember["role"])}</Badge> },
    { key: "phone", header: "Phone", align: "center", enableSorting: false,
      cell: () => <span className="text-muted-foreground">—</span> },
    { key: "status", header: "Status", align: "center",
      cell: (value) => <Badge variant={value === "Active" ? "outline" : "secondary"}>{String(value)}</Badge> },
  ];
  const actions: TableAction<StaffRow>[] = [
    { type: "view", label: "View Profile", onClick: setSelected },
    { type: "edit", label: "Edit Staff", onClick: setEditing,
      disabled: (row) => row.role === "owner" },
  ];
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 md:gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Staff Directory</h2>
        <p className="text-sm text-muted-foreground">Manage staff members and their access to your business.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <MetricCard title="Total Staff" value={error ? "—" : String(rows.length)}
          description={error ? "Staff records unavailable" : `${active} active, ${inactive} inactive`}
          icon={<Users className="size-5" />} />
        <MetricCard title="Active Staff" value={error ? "—" : String(active)}
          description="Currently active" icon={<UserCheck className="size-5" />} />
        <MetricCard title="Inactive Staff" value={error ? "—" : String(inactive)}
          description="Currently inactive" icon={<Clock3 className="size-5" />} />
        <MetricCard title="System Roles" value="System"
          description="Role-based business access" icon={<ShieldCheck className="size-5" />} />
      </section>
      <Card>
        <CardContent className="min-w-0 px-3 pb-4 sm:px-4 md:px-6 md:pb-6">
          <DataTable<StaffRow>
            title="Staff Management"
            description="View and manage staff accounts and roles."
            data={rows}
            fields={fields}
            actions={actions}
            enableGlobalSearch
            searchPlaceholder="Search staff..."
            pageSize={10}
            onRowClick={setSelected}
            emptyMessage={error ?? "No staff accounts available yet."}
            toolbarActions={
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="icon"
                  aria-label="Refresh staff" title="Refresh staff" onClick={() => router.refresh()}>
                  <RefreshCw className="size-4" />
                </Button>
                <Button type="button" onClick={() => setAdding(true)}>
                  <Plus className="size-4" />Add Staff
                </Button>
              </div>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Staff Profile</DialogTitle>
            <DialogDescription>Review account information and business access.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <Card><CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">{selected.email}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant={selected.active ? "outline" : "secondary"}>{selected.status}</Badge>
                      <Badge variant="outline">{roleLabel(selected.role)}</Badge>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">Staff ID: {selected.user_id}</span>
                </div>
                <Separator />
                <div className="grid gap-3 md:grid-cols-2">
                  {([
                    ["Name", "—"],
                    ["Email", selected.email],
                    ["Phone", "—"],
                    ["Joined", "—"],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3 text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="break-all font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </CardContent></Card>
              {selected.role !== "owner" ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => {
                    setEditing(selected);
                    setSelected(null);
                  }}>Edit Staff</Button>
                  {selected.active ? (
                    <form action={deactivateStaffAccess} className="flex-1">
                      <input type="hidden" name="user_id" value={selected.user_id} />
                      <Button type="submit" variant="outline" className="w-full">Remove Access</Button>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Staff</DialogTitle>
            <DialogDescription>Grant a business role to an existing AkiliBiz account.</DialogDescription>
          </DialogHeader>
          <GrantAccessForm />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Staff</DialogTitle>
            <DialogDescription>Update this staff member's business role.</DialogDescription>
          </DialogHeader>
          {editing && editing.role !== "owner" ? (
            <GrantAccessForm key={editing.user_id} initialEmail={editing.email} initialRole={editing.role} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
