import * as React from "react";
import { Link } from "react-router-dom";
import {
  DataTable,
  type TableField,
  type TableData,
} from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconAlertCircle,
  IconChartBar,
  IconCash,
  IconLoader2,
  IconPackage,
  IconRefresh,
} from "@tabler/icons-react";
import MetricCard from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { useReduxReports } from "@/hooks/useReduxReports";

// ============================================================================
// TYPES
// ============================================================================

interface ReportSummaryRow extends TableData {
  id: number;
  report_name: string;
  category: string;
  period: string;
  total_value: number;
  entries: number;
  status: string;
  updated_at: string;
}

// ============================================================================
// UTILS
// ============================================================================

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ReportsOverviewPage() {
  const {
    overviewRows,
    overviewSummary,
    loading,
    error,
    loadOverview,
    clearError,
  } = useReduxReports();

  React.useEffect(() => {
    loadOverview().catch(console.error);
  }, [loadOverview]);

  React.useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const rows: ReportSummaryRow[] = React.useMemo(
    () =>
      overviewRows.map((row) => ({
        id: row.id,
        report_name: row.report_name,
        category: row.category,
        period: row.period,
        total_value: row.total_value,
        entries: row.entries,
        status: row.status,
        updated_at: row.updated_at,
      })),
    [overviewRows],
  );

  const totalSalesValue = overviewSummary?.total_sales_value ?? 0;
  const inventoryValue = overviewSummary?.total_inventory_value ?? 0;
  const financialValue = overviewSummary?.total_financial_value ?? 0;

  const fields: TableField<ReportSummaryRow>[] = [
    {
      key: "report_name",
      header: "Report",
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "category",
      header: "Category",
      align: "center",
      cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
    {
      key: "period",
      header: "Period",
      align: "center",
      enableSorting: true,
    },
    {
      key: "total_value",
      header: "Value",
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-medium">{formatCurrency(Number(value))}</span>
      ),
    },
    {
      key: "entries",
      header: "Entries",
      align: "center",
      enableSorting: true,
      cell: (value) => <Badge variant="secondary">{Number(value)}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) =>
        String(value) === "Up to Date" ? (
          <Badge variant="outline">Up to Date</Badge>
        ) : (
          <Badge variant="secondary">{String(value)}</Badge>
        ),
    },
    {
      key: "updated_at",
      header: "Last Updated",
      align: "center",
      enableSorting: true,
      cell: (value) =>
        new Date(String(value)).toLocaleDateString("en-UG", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
    },
  ];

  return (
    <>
      <SiteHeader label="Reports Overview" />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-6 md:px-6">
          <div>
            <div>
              <h2 className="text-2xl font-semibold">Reports Overview</h2>
              <p className="text-sm text-muted-foreground">
                Review high-level reporting across sales, purchasing, inventory,
                and financial activity.
              </p>
            </div>
          </div>

          {error ? (
            <Card className="border-destructive/40">
              <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
                <IconAlertCircle className="size-4" />
                <span>{error}</span>
              </CardContent>
            </Card>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title="Sales Reports"
              value={formatCurrency(totalSalesValue)}
              description="Current reported sales value"
              icon={<IconChartBar className="size-5" />}
            />

            <MetricCard
              title="Inventory Reports"
              value={formatCurrency(inventoryValue)}
              description="Reported inventory value"
              icon={<IconPackage className="size-5" />}
            />

            <MetricCard
              title="Financial Reports"
              value={formatCurrency(financialValue)}
              description="Reported financial activity"
              icon={<IconCash className="size-5" />}
            />

          </section>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link to="/dashboard/reports/sales">Open Sales Reports</Link></Button>
            <Button asChild variant="outline"><Link to="/dashboard/reports/purchasing">Open Purchasing Reports</Link></Button>
            <Button asChild variant="outline"><Link to="/dashboard/reports/inventory">Open Inventory Reports</Link></Button>
            <Button asChild variant="outline"><Link to="/dashboard/reports/financial">Open Financial Reports</Link></Button>
          </div>

          <Card>
            <CardContent>
              <DataTable<ReportSummaryRow>
                title="Report Summary Register"
                description="Overview of generated report categories and current reporting values"
                data={rows}
                fields={fields}
                toolbarActions={
                  <Button
                    variant="outline"
                    onClick={() => loadOverview().catch(console.error)}
                    disabled={loading}
                  >
                    {loading ? <IconLoader2 className="mr-2 size-4 animate-spin" /> : null}
                    <IconRefresh className="size-4" />
                    Refresh
                  </Button>
                }
                enableSelection={false}
                enableGlobalSearch={true}
                enableSorting={false}
                pageSize={10}
                loading={loading}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
