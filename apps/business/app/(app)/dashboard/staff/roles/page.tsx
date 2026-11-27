"use client";

import { useMemo, useState } from "react";
import {
  KeyRound,
  LockKeyhole,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
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
import {
  type Permission,
  type StaffAccessRole,
  useStaffRolesData,
} from "@/components/akilibiz/staff/roles-data";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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

import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
type Row = {
  role_name: string;
  users_count: number;
  access_scope: string;
  permissions_count: number;
  status: "Active" | "Inactive";
  role: StaffAccessRole;
} & TableData;
const prettyModule = (module: string) =>
  module
    .replaceAll("_", " ")
    .replaceAll(".", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const group = (permissions: Permission[]) =>
  permissions.reduce<Record<string, Permission[]>>(
    (groups, permission) => ({
      ...groups,
      [permission.module]: [...(groups[permission.module] ?? []), permission],
    }),
    {},
  );

export default function StaffRolesPermissionsPage() {
  const { t } = useI18n();
  const {
    roles,
    permissions,
    summary,
    loading,
    getRole,
    createRole,
    updatePermissions,
    deleteRole,
    refreshRolesPermissions,
  } = useStaffRolesData();
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<StaffAccessRole | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [form, setForm] = useState({
    role_name: "",
    description: "",
    is_active: true,
  });
  const [formError, setFormError] = useState("");
  const rows = useMemo<Row[]>(
    () =>
      roles.map((role) => ({
        id: role.id,
        role_name: role.role_name,
        users_count: role.users_count,
        access_scope: role.access_scope,
        permissions_count: role.permissions.length,
        status: role.status,
        role,
      })),
    [roles],
  );
  const grouped = useMemo(() => group(permissions), [permissions]);
  const view = async (row: Row) => {
    setSelected(await getRole(Number(row.id)));
    setViewOpen(true);
  };
  const edit = async (row: Row) => {
    const role = await getRole(Number(row.id));
    setSelected(role);
    setCodes(role?.permissions ?? []);
    setEditOpen(true);
  };
  const toggle = (code: string) =>
    setCodes((items) =>
      items.includes(code)
        ? items.filter((item) => item !== code)
        : [...items, code],
    );
  const create = async () => {
    if (!form.role_name.trim()) {
      setFormError("Role name is required");
      return;
    }
    const role = await createRole({
      role_name: form.role_name.trim(),
      description: form.description.trim() || null,
      is_active: form.is_active,
    });
    if (!role) {
      setFormError("A role with this name already exists");
      return;
    }
    toast.success("Role created");
    setCreateOpen(false);
    setForm({ role_name: "", description: "", is_active: true });
  };
  const savePermissions = async () => {
    if (!selected) return;
    const role = await updatePermissions(selected.id, codes);
    if (!role) {
      toast.error("Unable to update permissions");
      return;
    }
    setSelected(role);
    setEditOpen(false);
    toast.success("Role permissions updated");
  };
  const confirmDelete = async () => {
    if (!selected) return;
    const removed = await deleteRole(selected.id);
    if (!removed) {
      toast.error("This protected role cannot be deleted");
      return;
    }
    toast.success(`Role "${selected.role_name}" deleted successfully`);
    setDeleteOpen(false);
    setSelected(null);
  };
  const fields: TableField<Row>[] = [
    {
      key: "role_name",
      header: t("staff.role"),
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "users_count",
      header: t("rolesUi.assignedUsers"),
      align: "center",
      enableSorting: true,
      cell: (value) => <Badge variant="secondary">{Number(value)}</Badge>,
    },
    {
      key: "access_scope",
      header: t("rolesUi.accessScope"),
      align: "center",
      cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
    {
      key: "permissions_count",
      header: t("rolesUi.permissions"),
      align: "center",
      enableSorting: true,
      cell: (value) => <span className="font-medium">{Number(value)}</span>,
    },
    {
      key: "status",
      header: t("reports.status"),
      align: "center",
      cell: (value) => (
        <Badge variant={value === "Active" ? "outline" : "secondary"}>
          {String(value)}
        </Badge>
      ),
    },
  ];
  const actions: TableAction<Row>[] = [
    { type: "view", label: t("rolesUi.viewRole"), onClick: (row) => void view(row) },
    {
      type: "edit",
      label: t("rolesUi.edit"),
      onClick: (row) => void edit(row),
    },
    {
      type: "custom",
      label: t("rolesUi.delete"),
      icon: <Trash2 className="size-4" />,
      onClick: (row) => {
        setSelected(row.role);
        setDeleteOpen(true);
      },
      disabled: (row) => row.role.is_system,
    },
  ];
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("roles.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              Control staff access across business areas and manage operational
              permissions.
            </p>
          </div>
          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title={t("rolesUi.total")}
              value={summary ? String(summary.total_roles) : "—"}
              description={summary ? `${summary.active_roles} active roles configured` : "Role records unavailable"}
              icon={<ShieldCheck className="size-5" />}
            />
            <MetricCard
              title={t("rolesUi.assignedUsers")}
              value={summary ? String(summary.total_assigned_users) : "—"}
              description={t("rolesUi.usersDescription")}
              icon={<Users className="size-5" />}
            />
            <MetricCard
              title={t("rolesUi.average")}
              value={summary ? String(summary.average_permissions) : "—"}
              description={t("rolesUi.averageDescription")}
              icon={<KeyRound className="size-5" />}
            />
            <MetricCard
              title={t("rolesUi.accessControl")}
              value="—"
              description="Role details unavailable"
              icon={<LockKeyhole className="size-5" />}
            />
          </section>
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<Row>
                title={t("rolesUi.register")}
                description={t("rolesUi.registerDescription")}
                data={rows}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder={t("rolesUi.search")}
                pageSize={10}
                onRowClick={(row) => void view(row)}
                emptyMessage={loading ? t("rolesUi.loading") : "No roles available."}
                toolbarActions={
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => void refreshRolesPermissions()} size="icon" aria-label={t("pos.refresh")} title={t("pos.refresh")} disabled>
                      <RefreshCw className="size-4" />
                      
                    </Button>
                    <Button
                      disabled title="Role creation unavailable"
                      onClick={() => {
                        setForm({
                          role_name: "",
                          description: "",
                          is_active: true,
                        });
                        setFormError("");
                        setCreateOpen(true);
                      }}>
                      <Plus className="mr-2 size-4" />
                      {t("roles.create")}
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("roles.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role &quot;{selected?.role_name}&quot;?
              {selected && selected.users_count > 0 ? (
                <span className="mt-2 block font-medium text-destructive">
                  Warning: This role has {selected.users_count} assigned user
                  {selected.users_count === 1 ? "" : "s"}.
                </span>
              ) : null}
              <span className="mt-1 block">
                This action deactivates the role and removes its permissions.
                This cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("roles.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmDelete()}>
              {t("roles.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("roles.create")}</DialogTitle>
            <DialogDescription>
              {t("rolesUi.createDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <FieldLabel required>{t("rolesUi.roleName")}</FieldLabel>
              <Input
                value={form.role_name}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    role_name: event.target.value,
                  }));
                  setFormError("");
                }}
                placeholder={t("rolesUi.nameHint")}
                className={formError ? "border-red-500" : ""}
              />
              {formError ? (
                <p className="text-sm text-red-500">{formError}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>{t("finance.description")}</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder={t("rolesUi.descriptionHint")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("reports.status")}</Label>
              <Select
                value={form.is_active ? "Active" : "Inactive"}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    is_active: value === "Active",
                  }))
                }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">{t("common.active")}</SelectItem>
                  <SelectItem value="Inactive">{t("common.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("roles.cancel")}
            </Button>
            <Button disabled title="Role creation unavailable" onClick={() => void create()}>{t("roles.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("rolesUi.details")}</DialogTitle>
            <DialogDescription>
              {t("rolesUi.detailsDescription")}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {selected.role_name}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">{selected.access_scope}</Badge>
                      <Badge
                        variant={
                          selected.status === "Active" ? "outline" : "secondary"
                        }>
                        {selected.status}
                      </Badge>
                      {selected.is_system ? (
                        <Badge variant="secondary">Protected role</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selected.users_count} assigned users
                  </div>
                </div>
                <Separator />
                {Object.entries(
                  group(
                    permissions.filter((permission) =>
                      selected.permissions.includes(permission.code),
                    ),
                  ),
                ).map(([module, modulePermissions]) => (
                  <div key={module} className="space-y-2">
                    <div className="flex justify-between">
                      <h4 className="text-sm font-semibold">
                        {prettyModule(module)}
                      </h4>
                      <Badge variant="outline">
                        {modulePermissions.length} permission
                        {modulePermissions.length === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {modulePermissions.map((permission) => (
                        <div
                          key={permission.code}
                          className="flex items-center justify-between rounded-lg border p-3">
                          <div>
                            <p className="text-sm font-medium">
                              {permission.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {permission.code}
                            </p>
                          </div>
                          <Badge variant="outline">{t("rolesUi.allowed")}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setViewOpen(false);
                if (selected) {
                  setCodes(selected.permissions);
                  setEditOpen(true);
                }
              }}>
              {t("roles.editPermissions")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("roles.editPermissions")}</DialogTitle>
            <DialogDescription>
              Enable or restrict access using permission codes grouped by
              business area.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{selected.role_name}</h3>
                <p className="text-sm text-muted-foreground">
                  {t("rolesUi.adjustDescription")}
                </p>
              </div>
              {selected.is_system ? (
                <p className="rounded border p-3 text-sm text-muted-foreground">
                  This protected role remains available for staff assignments.
                  You can review its permissions here.
                </p>
              ) : null}
              {Object.entries(grouped).map(([module, modulePermissions]) => (
                <div key={module} className="space-y-2">
                  <h4 className="text-sm font-semibold">
                    {prettyModule(module)}
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {modulePermissions.map((permission) => {
                      const enabled = codes.includes(permission.code);
                      return (
                        <button
                          key={permission.code}
                          type="button"
                          onClick={() =>
                            !selected.is_system && toggle(permission.code)
                          }
                          disabled={selected.is_system}
                          className="flex items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-70">
                          <div>
                            <p className="text-sm font-medium">
                              {permission.label}
                            </p>
                            {permission.description ? (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {permission.description}
                              </p>
                            ) : null}
                          </div>
                          <Badge variant={enabled ? "outline" : "secondary"}>
                            {enabled ? t("rolesUi.allowed") : t("rolesUi.blocked")}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  {t("roles.cancel")}
                </Button>
                <Button
                  onClick={() => void savePermissions()}
                  disabled title="Permission editing unavailable">
                  {t("roles.savePermissions")}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
