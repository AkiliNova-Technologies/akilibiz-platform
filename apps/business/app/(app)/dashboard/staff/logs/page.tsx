"use client";

import { useState } from "react";
import { Activity, AlertTriangle, Check, Eye, ShieldAlert } from "lucide-react";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import {
  type ActivityLog,
  type ActivityLogStatus,
  useActivityLogsData,
} from "@/components/akilibiz/staff/activity-logs-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
type Row = ActivityLog & TableData;
const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
function StatusBadge({ status }: { status: ActivityLogStatus }) {
  return (
    <Badge
      variant={
        status === "Failed"
          ? "destructive"
          : status === "Warning"
            ? "secondary"
            : "outline"
      }>
      {status}
    </Badge>
  );
}

export default function StaffActivityLogsPage() {
  const { t } = useI18n();
  const { logs, summary, loading } = useActivityLogsData();
  const [selected, setSelected] = useState<Row | null>(null);
  const fields: TableField<Row>[] = [
    {
      key: "user_name",
      header: t("common.user"),
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "role",
      header: t("staff.role"),
      align: "center",
      cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
    { key: "action", header: t("activityUi.action"), enableSorting: true },
    {
      key: "module",
      header: t("activityUi.module"),
      align: "center",
      cell: (value) => <Badge variant="secondary">{String(value)}</Badge>,
    },
    { key: "target", header: t("activityUi.target"), align: "center" },
    {
      key: "status",
      header: t("reports.status"),
      align: "center",
      cell: (value) => <StatusBadge status={value as ActivityLogStatus} />,
    },
    {
      key: "created_at",
      header: t("inventory.dateTime"),
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(String(value))}
        </span>
      ),
    },
  ];
  const actions: TableAction<Row>[] = [
    {
      type: "custom",
      label: t("reports.view"),
      icon: <Eye className="size-4" />,
      onClick: setSelected,
    },
  ];
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("nav.activityLogs")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("activityUi.description")}
            </p>
          </div>
          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title={t("activityUi.total")}
              value={summary ? String(summary.total_logs) : "—"}
              description={t("activityUi.totalDescription")}
              icon={<Activity className="size-5" />}
            />
            <MetricCard
              title={t("activityUi.successful")}
              value={summary ? String(summary.successful_logs) : "—"}
              description={t("activityUi.successfulDescription")}
              icon={<Check className="size-5" />}
            />
            <MetricCard
              title={t("activityUi.failed")}
              value={summary ? String(summary.failed_logs) : "—"}
              description={t("activityUi.failedDescription")}
              icon={<ShieldAlert className="size-5" />}
            />
            <MetricCard
              title={t("activityUi.warnings")}
              value={summary ? String(summary.warning_logs) : "—"}
              description={t("activityUi.warningsDescription")}
              icon={<AlertTriangle className="size-5" />}
            />
          </section>
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<Row>
                title={t("activityUi.register")}
                description={t("activityUi.registerDescription")}
                data={logs as Row[]}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                emptyMessage={
                  loading
                    ? t("activityUi.loading")
                    : t("activityUi.empty")
                }
                searchPlaceholder={t("activityUi.search")}
                pageSize={10}
                onRowClick={setSelected}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("activityUi.details")}</DialogTitle>
            <DialogDescription>
              {t("activityUi.detailsDescription")}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <Card>
              <CardContent className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold">
                      {selected.user_name}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline">{selected.role}</Badge>
                      <StatusBadge status={selected.status} />
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Log ID: {selected.id}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("activityUi.action")}</span>
                    <span>{selected.action}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("activityUi.module")}</span>
                    <span>{selected.module}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("activityUi.target")}</span>
                    <span>{selected.target}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("activityUi.ip")}</span>
                    <span>{selected.ip_address}</span>
                  </div>
                  <div className="flex justify-between text-sm md:col-span-2">
                    <span className="text-muted-foreground">{t("inventory.dateTime")}</span>
                    <span>{formatDateTime(selected.created_at)}</span>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="mb-1 text-sm text-muted-foreground">{t("activityUi.detailsLabel")}</p>
                  <p className="text-sm">{selected.details}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
