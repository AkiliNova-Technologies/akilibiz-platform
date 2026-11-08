import * as React from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IconActivity,
  IconAlertTriangle,
  IconCheck,
  IconEye,
  IconShieldLock,
} from "@tabler/icons-react";
import { Separator } from "@/components/ui/separator";
import { useReduxActivityLogs } from "@/hooks/useReduxActivityLogs";

// ============================================================================
// TYPES
// ============================================================================

type LogStatus = "Success" | "Failed" | "Warning";
type LogModule =
  | "Authentication"
  | "POS"
  | "Products"
  | "Inventory"
  | "Customers"
  | "Suppliers"
  | "Finance"
  | "Reports"
  | "Settings"
  | "Staff";

interface ActivityLogRow extends TableData {
  id: number;
  user_name: string;
  role: string;
  action: string;
  module: LogModule;
  target: string;
  status: LogStatus;
  ip_address: string;
  created_at: string;
  details: string;
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusBadge(status: LogStatus) {
  switch (status) {
    case "Success":
      return <Badge variant="outline">Success</Badge>;
    case "Failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "Warning":
      return <Badge variant="secondary">Warning</Badge>;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StaffActivityLogsPage() {
  const { logs, summary, loading, getLogs, getSummary } =
    useReduxActivityLogs();

  const [selectedLog, setSelectedLog] = React.useState<ActivityLogRow | null>(
    null,
  );
  const [viewOpen, setViewOpen] = React.useState(false);

  React.useEffect(() => {
  void getLogs();
  void getSummary();
}, [getLogs, getSummary]);

  const totalLogs = summary?.total_logs ?? logs.length;
const successfulLogs = summary?.successful_logs ?? logs.filter(l => l.status === "Success").length;
const failedLogs = summary?.failed_logs ?? logs.filter(l => l.status === "Failed").length;
const warningLogs = summary?.warning_logs ?? logs.filter(l => l.status === "Warning").length;

  const fields: TableField<ActivityLogRow>[] = [
    {
      key: "user_name",
      header: "User",
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "role",
      header: "Role",
      align: "center",
      cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
    {
      key: "action",
      header: "Action",
      enableSorting: true,
    },
    {
      key: "module",
      header: "Module",
      align: "center",
      cell: (value) => <Badge variant="secondary">{String(value)}</Badge>,
    },
    {
      key: "target",
      header: "Target",
      align: "center",
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) => getStatusBadge(value as LogStatus),
    },
    {
      key: "created_at",
      header: "Date & Time",
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(String(value))}
        </span>
      ),
    },
  ];

  const actions: TableAction<ActivityLogRow>[] = [
    {
      type: "custom",
      label: "View",
      icon: <IconEye className="size-4" />,
      onClick: (row) => {
        setSelectedLog(row);
        setViewOpen(true);
      },
    },
  ];

  return (
    <>
      <SiteHeader label="Activity Logs" />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-4 md:px-6 md:pb-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Activity Logs
            </h2>
            <p className="text-sm text-muted-foreground">
              Monitor user actions, failed attempts, and operational activity
              across the system.
            </p>
          </div>

          <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard
              title="Total Logs"
              value={String(totalLogs)}
              description="Recorded user activity entries"
              icon={<IconActivity className="size-5" />}
            />

            <MetricCard
              title="Successful Actions"
              value={String(successfulLogs)}
              description="Completed actions without issues"
              icon={<IconCheck className="size-5" />}
            />

            <MetricCard
              title="Failed Actions"
              value={String(failedLogs)}
              description="Failed attempts or blocked operations"
              icon={<IconShieldLock className="size-5" />}
            />

            <MetricCard
              title="Warnings"
              value={String(warningLogs)}
              description="Actions requiring review or attention"
              icon={<IconAlertTriangle className="size-5" />}
            />
          </section>

          <Card className="">
            <CardContent className="px-6 pb-6">
              <DataTable<ActivityLogRow>
                title="System Activity Register"
                description="Track staff actions, system access, and operational events"
                data={logs as ActivityLogRow[]}
                fields={fields}
                actions={actions}
                enableGlobalSearch
                emptyMessage={loading ? "Loading activity logs..." : "No activity logs found."}
                searchPlaceholder="Search logs by user, action, module, or target..."
                pageSize={10}
                onRowClick={(row) => {
                  setSelectedLog(row);
                  setViewOpen(true);
                }}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Activity Log Details</DialogTitle>
            <DialogDescription>
              Review the selected user activity record.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <Card>
                <CardContent className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {selectedLog.user_name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">{selectedLog.role}</Badge>
                        {getStatusBadge(selectedLog.status)}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Log ID: {selectedLog.id}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Action</span>
                      <span>{selectedLog.action}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Module</span>
                      <span>{selectedLog.module}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Target</span>
                      <span>{selectedLog.target}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IP Address</span>
                      <span>{selectedLog.ip_address}</span>
                    </div>
                    <div className="flex justify-between text-sm md:col-span-2">
                      <span className="text-muted-foreground">Date & Time</span>
                      <span>{formatDateTime(selectedLog.created_at)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="mb-1 text-sm text-muted-foreground">
                      Details
                    </p>
                    <p className="text-sm">{selectedLog.details}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
