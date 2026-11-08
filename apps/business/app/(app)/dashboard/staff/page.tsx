"use client";

import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Clock3,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { StaffSheet } from "@/components/akilibiz/staff/staff-sheet";
import {
  type StaffMember,
  useStaffData,
} from "@/components/akilibiz/staff/staff-data";
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
import { Separator } from "@/components/ui/separator";

type Row = {
  name: string;
  email: string;
  role: string;
  phone: string;
  status: "Active" | "Inactive";
  staff: StaffMember;
} & TableData;

export default function StaffPage() {
  const { staff, roles, getStaff, addStaff, editStaff, setActive } =
    useStaffData();
  const [viewOpen, setViewOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const rows = useMemo<Row[]>(
    () =>
      staff.map((member) => ({
        id: member.id,
        name: member.full_name || member.username,
        email: member.email ?? "Not available",
        role: member.role_name,
        phone: member.phone || "Not available",
        status: member.is_active ? "Active" : "Inactive",
        staff: member,
      })),
    [staff],
  );
  const view = (member: StaffMember) => {
    setSelected(member);
    setViewOpen(true);
  };
  const edit = (member: StaffMember) => {
    setSelected(member);
    setEditOpen(true);
  };
  const changeStatus = async (member: StaffMember) => {
    await setActive(member.id, !member.is_active);
    toast.success(
      `${member.full_name || member.username} ${member.is_active ? "deactivated" : "activated"}`,
    );
  };
  const active = staff.filter((member) => member.is_active).length;
  const fields: TableField<Row>[] = [
    {
      key: "name",
      header: "Name",
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    { key: "email", header: "Email", align: "center" },
    {
      key: "role",
      header: "Role",
      align: "center",
      cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
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
    { type: "view", label: "View profile", onClick: (row) => view(row.staff) },
    {
      type: "edit",
      label: "Edit staff member",
      onClick: (row) => edit(row.staff),
    },
    {
      type: "custom",
      label: "Change account status",
      icon: <BadgeCheck className="size-4" />,
      onClick: (row) => void changeStatus(row.staff),
    },
  ];
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Staff Directory
            </h2>
            <p className="text-sm text-muted-foreground">
              Manage staff profiles, roles, and account status.
            </p>
          </div>
          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="Total Staff"
              value={String(staff.length)}
              description={`${active} active, ${staff.length - active} inactive`}
              icon={<Users className="size-5" />}
            />
            <MetricCard
              title="Active Staff"
              value={String(active)}
              description="Currently active accounts"
              icon={<UserCheck className="size-5" />}
            />
            <MetricCard
              title="Inactive Staff"
              value={String(staff.length - active)}
              description="Currently inactive accounts"
              icon={<Clock3 className="size-5" />}
            />
            <MetricCard
              title="Roles Loaded"
              value="System"
              description="Roles available for staff assignments"
              icon={<BadgeCheck className="size-5" />}
            />
          </section>
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<Row>
                title="Staff Management"
                description="Manage staff profiles, roles, and account status."
                data={rows}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder="Search staff..."
                pageSize={10}
                onRowClick={(row) => view(row.staff)}
                emptyMessage="No staff members found."
                toolbarActions={
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        void getStaff();
                        toast.success("Staff directory refreshed");
                      }}>
                      <RefreshCw className="mr-2 size-4" />
                      Refresh
                    </Button>
                    <Button
                      onClick={() => {
                        setSelected(null);
                        setAddOpen(true);
                      }}>
                      <Plus className="mr-2 size-4" />
                      Add Staff
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Staff Profile</DialogTitle>
            <DialogDescription>
              Review staff profile details and account status.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {selected.full_name || selected.username}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge
                          variant={
                            selected.is_active ? "outline" : "secondary"
                          }>
                          {selected.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{selected.role_name}</Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Staff ID: {selected.id}
                    </div>
                  </div>
                  <Separator />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="size-4 text-muted-foreground" />
                        <span>{selected.email ?? "Not available"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="size-4 text-muted-foreground" />
                        <span>{selected.phone || "Not available"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Joined</span>
                        <span>
                          {new Date(selected.created_at).toLocaleDateString(
                            "en-UG",
                            { year: "numeric", month: "short", day: "numeric" },
                          )}
                        </span>
                      </div>
                      {selected.notes ? (
                        <div>
                          <p className="text-sm text-muted-foreground">Notes</p>
                          <p className="text-sm">{selected.notes}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setViewOpen(false);
                  edit(selected);
                }}>
                Edit Staff Member
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <StaffSheet
        key={`add-${addOpen}`}
        open={addOpen}
        onOpenChange={setAddOpen}
        isEdit={false}
        initialData={null}
        roles={roles}
        onSubmit={(payload) =>
          addStaff({ ...payload, username: payload.username ?? "" })
        }
      />
      <StaffSheet
        key={`edit-${selected?.id ?? "none"}-${editOpen}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        isEdit
        initialData={selected}
        roles={roles}
        onSubmit={(payload) =>
          selected ? editStaff(selected.id, payload) : Promise.resolve(null)
        }
      />
    </>
  );
}
