import * as React from "react";
import { getErrorMessage } from "@/utils/error-message";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/data-table";
import MetricCard from "@/components/metric-card";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import {
  IconKey,
  IconLock,
  IconPlus,
  IconRefresh,
  IconShieldCheck,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { useReduxRolesPermissions } from "@/hooks/useReduxRolesPermissions";
import type {
  Permission,
  RoleDetailResponse,
  RoleResponse,
} from "@/services/tauri/roles-permissions";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";

// ============================================================================
// TYPES
// ============================================================================

interface RoleRow extends TableData {
  id: number;
  role_name: string;
  users_count: number;
  access_scope: string;
  permissions_count: number;
  status: "Active" | "Inactive";
  permissions: string[];
  role: RoleResponse;
}

interface CreateRoleFormData {
  role_name: string;
  description: string;
  is_active: boolean;
}

type ModulePermissionsMap = Record<string, Permission[]>;

// ============================================================================
// UTILS
// ============================================================================

function groupPermissionsByModule(
  permissions: Permission[],
): ModulePermissionsMap {
  return permissions.reduce<ModulePermissionsMap>((acc, permission) => {
    const key = permission.module || "general";
    if (!acc[key]) acc[key] = [];
    acc[key].push(permission);
    return acc;
  }, {});
}

function prettyModuleName(module: string) {
  return module
    .replaceAll("_", " ")
    .replaceAll(".", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StaffRolesPermissionsPage() {
  const { t } = useI18n();
  const {
    roles,
    selectedRole,
    permissions,
    summary,
    loading,
    getRole,
    createRole,
    deleteRole,
    updatePermissions,
    refreshRolesPermissions,
    clearRole,
    clearError,
  } = useReduxRolesPermissions();

  const [viewOpen, setViewOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [selectedRoleRow, setSelectedRoleRow] = React.useState<RoleRow | null>(
    null,
  );
  const [editPermissionCodes, setEditPermissionCodes] = React.useState<
    string[]
  >([]);
  const [createForm, setCreateForm] = React.useState<CreateRoleFormData>({
    role_name: "",
    description: "",
    is_active: true,
  });
  const [createErrors, setCreateErrors] = React.useState<
    Record<string, string>
  >({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    void refreshRolesPermissions();
  }, [refreshRolesPermissions]);

  React.useEffect(() => {
    return () => {
      clearRole();
      clearError();
    };
  }, [clearRole, clearError]);

  const roleRows = React.useMemo<RoleRow[]>(() => {
    return roles.map((role) => ({
      id: role.id,
      role_name: role.role_name,
      users_count: role.users_count,
      access_scope: role.access_scope,
      permissions_count: role.permissions_count,
      status: role.status,
      permissions: role.permissions,
      role,
    }));
  }, [roles]);

  const permissionsByModule = React.useMemo(
    () => groupPermissionsByModule(permissions),
    [permissions],
  );

  const totalRoles = summary?.total_roles ?? roleRows.length;
  const activeRoles =
    summary?.active_roles ??
    roleRows.filter((role) => role.status === "Active").length;
  const totalAssignedUsers =
    summary?.total_assigned_users ??
    roleRows.reduce((sum, role) => sum + role.users_count, 0);
  const averagePermissions =
    summary?.average_permissions ??
    (roleRows.length > 0
      ? Math.round(
          roleRows.reduce((sum, role) => sum + role.permissions_count, 0) /
            roleRows.length,
        )
      : 0);

  const currentRole: RoleDetailResponse | null = selectedRole || null;

  const resetCreateForm = () => {
    setCreateForm({
      role_name: "",
      description: "",
      is_active: true,
    });
    setCreateErrors({});
  };

  const handleCreateRole = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const validateCreateForm = () => {
    const errors: Record<string, string> = {};
    if (!createForm.role_name.trim()) {
      errors.role_name = t("roles.roleNameRequired");
    }
    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitCreate = async () => {
    if (!validateCreateForm()) return;

    setIsSubmitting(true);
    try {
      const created = await createRole({
        role_name: createForm.role_name.trim(),
        description: createForm.description.trim() || null,
        is_active: createForm.is_active,
      });

      if (!created) {
        toast.error(t("roles.createFailed"));
        return;
      }

      toast.success(t("roles.created"));
      setCreateOpen(false);
      resetCreateForm();
      await refreshRolesPermissions();
    } catch (error) {
      console.error("Create role error:", error);
      toast.error(getErrorMessage(error, "Failed to create role"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleView = React.useCallback(
    async (role: RoleRow) => {
      setSelectedRoleRow(role);
      await getRole(role.id);
      setViewOpen(true);
    },
    [getRole],
  );

  const handleEdit = React.useCallback(
    async (role: RoleRow) => {
      setSelectedRoleRow(role);
      const fullRole = await getRole(role.id);
      setEditPermissionCodes(
        fullRole.permissions.map((permission) => permission.code),
      );
      setEditOpen(true);
    },
    [getRole],
  );

  const handleDeleteClick = React.useCallback((role: RoleRow) => {
    setSelectedRoleRow(role);
    setDeleteOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
  if (!selectedRoleRow) return;

  setIsDeleting(true);
  try {
    await deleteRole(selectedRoleRow.id);
    toast.success(`Role "${selectedRoleRow.role_name}" deleted successfully`);
    setDeleteOpen(false);
    setSelectedRoleRow(null);
    await refreshRolesPermissions();
  } catch (error) {
    console.error("Delete role error:", error);
    toast.error(getErrorMessage(error, t("roles.deleteFailed")));
  } finally {
    setIsDeleting(false);
  }
};

  const handleTogglePermission = (code: string) => {
    setEditPermissionCodes((prev) =>
      prev.includes(code)
        ? prev.filter((item) => item !== code)
        : [...prev, code],
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleRow) return;

    try {
      const updated = await updatePermissions(selectedRoleRow.id, {
        permission_codes: editPermissionCodes,
      });

      if (!updated) {
        toast.error(t("roles.updateFailed"));
        return;
      }

      toast.success(t("roles.updated"));
      setEditOpen(false);
      await refreshRolesPermissions();
    } catch (error) {
      console.error("Update permissions error:", error);
      toast.error(getErrorMessage(error, "Failed to update permissions"));
    }
  };

  const handleRefresh = async () => {
    await refreshRolesPermissions();
  };

  const fields: TableField<RoleRow>[] = [
    {
      key: "role_name",
      header: "Role",
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "users_count",
      header: "Assigned Users",
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <Badge variant="secondary" className="bg-input/40">
          {Number(value)}
        </Badge>
      ),
    },
    {
      key: "access_scope",
      header: "Access Scope",
      align: "center",
      cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
    {
      key: "permissions_count",
      header: "Permissions",
      align: "center",
      enableSorting: true,
      cell: (value) => <span className="font-medium">{Number(value)}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) => (
        <Badge variant={String(value) === "Active" ? "outline" : "secondary"}>
          {String(value)}
        </Badge>
      ),
    },
  ];

  const actions: TableAction<RoleRow>[] = [
    {
      type: "view",
      label: "View role",
      onClick: handleView,
    },
    {
      type: "edit",
      label: "Edit permissions",
      onClick: handleEdit,
    },
    {
      type: "custom",
      label: "Delete role",
      icon: <IconTrash className="size-4" />,
      onClick: handleDeleteClick,
      disabled: (row) => row.role_name === "Admin", // Prevent deleting Admin role
    },
  ];

  return (
    <>
      <SiteHeader label={t("roles.title")} />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("roles.title")}
            </h2>
            <p className="text-sm text-muted-foreground">
              Control user access across modules and manage operational
              permissions.
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="Total Roles"
              value={String(totalRoles)}
              description={`${activeRoles} active roles configured`}
              icon={<IconShieldCheck className="size-5" />}
            />

            <MetricCard
              title="Assigned Users"
              value={String(totalAssignedUsers)}
              description="Users mapped to permission roles"
              icon={<IconUsers className="size-5" />}
            />

            <MetricCard
              title="Average Permissions"
              value={String(averagePermissions)}
              description="Average enabled permissions per role"
              icon={<IconKey className="size-5" />}
            />

            <MetricCard
              title="Access Control"
              value="Enabled"
              description="Code-based permission structure active"
              icon={<IconLock className="size-5" />}
            />
          </section>

          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<RoleRow>
                title="Roles Register"
                description="Manage access levels and permission assignments across staff roles"
                data={roleRows}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                searchPlaceholder="Search roles..."
                pageSize={10}
                onRowClick={handleView}
                emptyMessage={loading ? "Loading roles..." : "No roles found."}
                toolbarActions={
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleRefresh}
                      disabled={loading}
                    >
                      <IconRefresh className="size-4" />
                      Refresh
                    </Button>
                    <Button onClick={handleCreateRole}>
                      <IconPlus className="mr-2 size-4" />
                      {t("roles.create")}
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("roles.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "
              {selectedRoleRow?.role_name}"?
              {selectedRoleRow && selectedRoleRow.users_count > 0 && (
                <span className="mt-2 block font-medium text-destructive">
                  Warning: This role has {selectedRoleRow.users_count} assigned
                  user{selectedRoleRow.users_count !== 1 ? "s" : ""}.
                </span>
              )}
              <span className="mt-1 block">
                This action will deactivate the role and remove all its
                permissions. This cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("roles.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("roles.deleting") : t("roles.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Role Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("roles.createTitle")}</DialogTitle>
            <DialogDescription>
              Create a custom role and assign permissions later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <FieldLabel required htmlFor="role_name">Role Name</FieldLabel>
              <Input
                id="role_name"
                required
                value={createForm.role_name}
                onChange={(e) => {
                  setCreateForm((prev) => ({
                    ...prev,
                    role_name: e.target.value,
                  }));
                  if (createErrors.role_name) {
                    setCreateErrors((prev) => {
                      const next = { ...prev };
                      delete next.role_name;
                      return next;
                    });
                  }
                }}
                placeholder="e.g., Sales Manager, Support Agent"
                className={createErrors.role_name ? "border-red-500" : ""}
              />
              {createErrors.role_name && (
                <p className="text-sm text-red-500">{createErrors.role_name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={createForm.description}
                onChange={(e) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Brief description of this role's purpose"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={createForm.is_active ? "Active" : "Inactive"}
                onValueChange={(value) =>
                  setCreateForm((prev) => ({
                    ...prev,
                    is_active: value === "Active",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("roles.cancel")}
            </Button>
            <Button onClick={handleSubmitCreate} disabled={isSubmitting}>
              {isSubmitting ? t("roles.creating") : t("roles.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Role Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-3xl overflow-y-auto max-h-[90vh] hide-scrollbar">
          <DialogHeader>
            <DialogTitle>Role Details</DialogTitle>
            <DialogDescription>
              Review assigned access scope and enabled permissions.
            </DialogDescription>
          </DialogHeader>

          {currentRole && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {currentRole.role_name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          {currentRole.access_scope}
                        </Badge>
                        <Badge
                          variant={
                            currentRole.status === "Active"
                              ? "outline"
                              : "secondary"
                          }
                        >
                          {currentRole.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {currentRole.users_count} assigned users
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    {Object.entries(
                      groupPermissionsByModule(currentRole.permissions),
                    ).map(([module, modulePermissions]) => (
                      <div key={module} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">
                            {prettyModuleName(module)}
                          </h4>
                          <Badge variant="outline">
                            {modulePermissions.length} permission
                            {modulePermissions.length !== 1 ? "s" : ""}
                          </Badge>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          {modulePermissions.map((permission) => (
                            <div
                              key={permission.code}
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium">
                                  {permission.label}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {permission.code}
                                </p>
                              </div>
                              <Badge variant="outline">Allowed</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <DialogFooter className="">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setViewOpen(false);
                  if (selectedRoleRow) {
                    void handleEdit(selectedRoleRow);
                  }
                }}
              >
                {t("roles.editPermissions")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-3xl overflow-y-auto max-h-[90vh] hide-scrollbar">
          <DialogHeader>
            <DialogTitle>{t("roles.editPermissions")}</DialogTitle>
            <DialogDescription>
              Enable or restrict access using permission codes grouped by
              module.
            </DialogDescription>
          </DialogHeader>

          {selectedRoleRow && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{selectedRoleRow.role_name}</h3>
                <p className="text-sm text-muted-foreground">
                  Adjust permission-level access for this role.
                </p>
              </div>

              <div className="space-y-4">
                {Object.entries(permissionsByModule).map(
                  ([module, modulePermissions]) => (
                    <div key={module} className="space-y-2">
                      <h4 className="text-sm font-semibold">
                        {prettyModuleName(module)}
                      </h4>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {modulePermissions.map((permission) => {
                          const enabled = editPermissionCodes.includes(
                            permission.code,
                          );

                          return (
                            <button
                              key={permission.code}
                              type="button"
                              onClick={() =>
                                handleTogglePermission(permission.code)
                              }
                              className="flex items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted/40"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium">
                                  {permission.label}
                                </p>
                                {permission.description && (
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {permission.description}
                                  </p>
                                )}
                              </div>

                              <Badge
                                variant={enabled ? "outline" : "secondary"}
                              >
                                {enabled ? "Allowed" : "Blocked"}
                              </Badge>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ),
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>
                  {t("roles.cancel")}
                </Button>
                <Button onClick={handleSavePermissions}>
                  {t("roles.savePermissions")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
