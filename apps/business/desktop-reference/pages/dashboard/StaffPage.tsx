import {
  DataTable,
  type TableField,
  type TableAction,
  type TableData,
} from "@/components/data-table";
import MetricCard from "@/components/metric-card";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  IconUsers,
  IconUserCheck,
  IconClock,
  IconCash,
  IconMail,
  IconPhone,
  IconRefresh,
  IconPlus,
} from "@tabler/icons-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useReduxStaff } from "@/hooks/useReduxStaff";
import { StaffSheet } from "@/components/staff-sheet";
import type { Staff } from "@/redux/slices/staffSlice";
import { useI18n } from "@/hooks/useI18n";

// ============================================================================
// TYPES
// ============================================================================

interface StaffRow extends TableData {
  id: number;
  name: string;
  email: string;
  role: string;
  phone: string;
  status: "Active" | "Inactive";
  staff: Staff;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StaffPage() {
  const { t } = useI18n();
  const {
    staff,
    selectedStaff,
    error,
    getStaff,
    getStaffMember,
    getStaffRoles,
    clearError,
  } = useReduxStaff();

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [selectedStaffMember, setSelectedStaffMember] = useState<Staff | null>(
    null,
  );

  useEffect(() => {
    getStaff();
  }, [getStaff]);

  useEffect(() => {
    getStaffRoles();
  }, [getStaffRoles]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const staffRows = useMemo<StaffRow[]>(() => {
    return staff.map((staffMember) => {
      const displayName = staffMember.full_name || staffMember.username;

      return {
        id: staffMember.id,
        name: displayName,
        email: staffMember.email ?? t("staff.notAvailable"),
        role: staffMember.role_name,
        phone: staffMember.phone || t("staff.notAvailable"),
        status: staffMember.is_active ? "Active" : "Inactive",
        staff: staffMember,
      };
    });
  }, [staff, t]);

  const handleView = useCallback(
    async (staffMember: Staff) => {
      setSelectedStaffMember(staffMember);
      await getStaffMember(staffMember.id);
      setViewDialogOpen(true);
    },
    [getStaffMember],
  );

  const handleEdit = useCallback((staffMember: Staff) => {
    setSelectedStaffMember(staffMember);
    setEditSheetOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setSelectedStaffMember(null);
    setAddSheetOpen(true);
  }, []);

  const totalStaff = staff.length;
  const activeStaff = staff.filter((s) => s.is_active).length;
  const inactiveStaff = totalStaff - activeStaff;

  const currentStaff = selectedStaff || selectedStaffMember;

  const staffFields: TableField<StaffRow>[] = useMemo(
    () => [
      {
        key: "name",
        header: t("staff.name"),
        enableSorting: true,
        cell: (value) => <span className="font-medium">{String(value)}</span>,
      },
      {
        key: "email",
        header: t("staff.email"),
        align: "center",
      },
      {
        key: "role",
        header: t("staff.role"),
        align: "center",
        cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
      },
      {
        key: "phone",
        header: t("staff.phone"),
        align: "center",
        cell: (value) => (
          <span className="font-mono text-sm">{String(value)}</span>
        ),
      },
      {
        key: "status",
        header: t("staff.status"),
        align: "center",
        cell: (value) => (
          <Badge variant={String(value) === "Active" ? "outline" : "secondary"}>
            {String(value)}
          </Badge>
        ),
      },
    ],
    [t],
  );

  const staffActions: TableAction<StaffRow>[] = useMemo(
    () => [
      {
        type: "view",
        label: t("staff.viewProfile"),
        onClick: (row) => handleView(row.staff),
      },
      {
        type: "edit",
        label: t("staff.edit"),
        onClick: (row) => handleEdit(row.staff),
      },
    ],
    [handleView, handleEdit, t],
  );

  return (
    <>
      <SiteHeader label={t("staff.management")} />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("staff.directory")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("staff.directoryDescription")}
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title={t("staff.total")}
              value={String(totalStaff)}
              description={`${activeStaff} active, ${inactiveStaff} inactive`}
              icon={<IconUsers className="size-5" />}
            />

            <MetricCard
              title={t("staff.active")}
              value={String(activeStaff)}
              description={t("staff.currentlyActive")}
              icon={<IconUserCheck className="size-5" />}
            />

            <MetricCard
              title={t("staff.inactive")}
              value={String(inactiveStaff)}
              description={t("staff.currentlyInactive")}
              icon={<IconClock className="size-5" />}
            />

            <MetricCard
              title={t("staff.rolesLoaded")}
              value="System"
              description={t("staff.rolesLoadedDescription")}
              icon={<IconCash className="size-5" />}
            />
          </section>

          <Card className="">
            <CardContent className="px-6 pb-6">
              <DataTable<StaffRow>
                title={t("staff.management")}
                description={t("staff.managementDescription")}
                data={staffRows}
                fields={staffFields}
                actions={staffActions}
                enableGlobalSearch
                searchPlaceholder={t("staff.search")}
                pageSize={10}
                onRowClick={(row) => handleView(row.staff)}
                toolbarActions={
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        getStaff();
                        toast.success(t("staff.refreshed"));
                      }}
                    >
                      <IconRefresh className="size-4" />
                      {t("staff.refresh")}
                    </Button>
                    <Button onClick={handleAdd}>
                      <IconPlus className="mr-2 size-4" />
                      {t("staff.add")}
                    </Button>
                  </div>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("staff.profile")}</DialogTitle>
            <DialogDescription>
              {t("staff.profileDescription")}
            </DialogDescription>
          </DialogHeader>

          {currentStaff && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {currentStaff.full_name || currentStaff.username}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge
                          variant={
                            currentStaff.is_active ? "outline" : "secondary"
                          }
                        >
                          {currentStaff.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{currentStaff.role_name}</Badge>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Staff ID: {currentStaff.id}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <IconMail className="size-4 text-muted-foreground" />
                        <span>{currentStaff.email}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <IconPhone className="size-4 text-muted-foreground" />
                        <span>{currentStaff.phone || t("staff.notAvailable")}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("staff.joined")}</span>
                        <span>
                          {new Date(currentStaff.created_at).toLocaleDateString(
                            "en-UG",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            },
                          )}
                        </span>
                      </div>

                    </div>

                    {/* <div className="grid gap-3 sm:grid-cols-2">
                      <Card className="border-border/60">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">
                            Sales Today
                          </p>
                          <p className="text-xl font-semibold">
                            {currentStats.sales_today}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border-border/60">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">
                            Total Sales
                          </p>
                          <p className="text-xl font-semibold">
                            {currentStats.total_sales}
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border-border/60">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">
                            Hours This Week
                          </p>
                          <p className="text-xl font-semibold">
                            {currentStats.hours_this_week}h
                          </p>
                        </CardContent>
                      </Card>

                      <Card className="border-border/60">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground">
                            Efficiency
                          </p>
                          <p className="text-xl font-semibold">
                            {(
                              currentStats.total_sales /
                              (currentStats.hours_this_week || 1)
                            ).toFixed(1)}
                          </p>
                        </CardContent>
                      </Card>
                    </div> */}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleEdit(currentStaff);
                  }}
                >
                  {t("staff.editMember")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <StaffSheet
        open={addSheetOpen}
        onOpenChange={setAddSheetOpen}
        isEdit={false}
        initialData={null}
      />

      <StaffSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        isEdit={true}
        initialData={selectedStaffMember}
      />
    </>
  );
}
