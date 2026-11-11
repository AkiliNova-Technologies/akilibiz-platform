"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import {
  AlertCircle,
  Banknote,
  BarChart3,
  LoaderCircle,
  Package,
  RefreshCw,
} from "lucide-react";
import {
  DataTable,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import {
  formatFinanceCurrency,
  formatFinanceDate,
} from "@/components/akilibiz/finance/finance-overview-data";
import {
  type ReportsOverviewRow,
  useReportsOverviewData,
} from "@/components/akilibiz/reports/reports-overview-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Row = ReportsOverviewRow & TableData;

export default function ReportsOverviewPage() {
  const { overviewRows, overviewSummary, loading, error, loadOverview } =
    useReportsOverviewData();
  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);
  const rows = useMemo<Row[]>(
    () => overviewRows.map((row) => ({ ...row })),
    [overviewRows],
  );
  const fields: TableField<Row>[] = [
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
    { key: "period", header: "Period", align: "center", enableSorting: true },
    {
      key: "total_value",
      header: "Value",
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-medium">
          {formatFinanceCurrency(Number(value))}
        </span>
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
      cell: (value) => formatFinanceDate(String(value)),
    },
  ];
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold">Reports Overview</h2>
          <p className="text-sm text-muted-foreground">
            Review high-level reporting across sales, purchasing, inventory, and
            financial activity.
          </p>
        </div>
        {error ? (
          <Card className="border-destructive/40">
            <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
              <AlertCircle className="size-4" />
              <span>{error}</span>
            </CardContent>
          </Card>
        ) : null}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            title="Sales Reports"
            value={overviewSummary?.total_sales_value != null ? formatFinanceCurrency(overviewSummary.total_sales_value) : "—"}
            description="Completed desktop sales received through synchronization"
            icon={<BarChart3 className="size-5" />}
          />
          <MetricCard
            title="Inventory Reports"
            value={overviewSummary?.total_inventory_value != null ? formatFinanceCurrency(overviewSummary.total_inventory_value) : "—"}
            description="Inventory valuation is not yet verified"
            icon={<Package className="size-5" />}
          />
          <MetricCard
            title="Financial Reports"
            value={overviewSummary?.total_financial_value != null ? formatFinanceCurrency(overviewSummary.total_financial_value) : "—"}
            description="Total recorded income and expense activity, not net profit"
            icon={<Banknote className="size-5" />}
          />
        </section>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/reports/sales">Open Sales Reports</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/reports/purchasing">
              Open Purchasing Reports
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/reports/inventory">
              Open Inventory Reports
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/reports/financial">
              Open Financial Reports
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent>
            <DataTable<Row>
              title="Report Summary Register"
              description="Overview of generated report categories and current reporting values"
              data={rows}
              fields={fields}
              toolbarActions={
                <Button
                  variant="outline"
                  onClick={() => void loadOverview()}
                  disabled size="icon" aria-label="Refresh" title="Refresh">
                  {loading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  
                </Button>
              }
              enableSelection={false}
              enableGlobalSearch
              enableSorting={false}
              pageSize={10}
              loading={loading}
              emptyMessage={
                loading ? "Loading reports..." : "Reporting summaries are unavailable until the hosted reporting service is connected."
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
