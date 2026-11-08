import * as React from "react";
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
  IconArrowDown,
  IconArrowUp,
  IconLoader2,
  IconRefresh,
  IconReportMoney,
  IconWallet,
} from "@tabler/icons-react";
import MetricCard from "@/components/metric-card";
import { Button } from "@/components/ui/button";
import { useReduxReports } from "@/hooks/useReduxReports";

// ============================================================================
// TYPES
// ============================================================================

interface ProfitLossRow extends TableData {
  id: number;
  period: string;
  revenue: number;
  cost_of_sales: number;
  gross_profit: number;
  operating_expenses: number;
  net_profit: number;
  margin_percent: number;
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

export default function ReportsProfitLossPage() {
  const {
    profitLossRows,
    profitLossSummary,
    loading,
    error,
    loadProfitLossReports,
    clearError,
    currentQuery,
  } = useReduxReports();

  React.useEffect(() => {
    loadProfitLossReports(currentQuery).catch(console.error);
  }, [loadProfitLossReports, currentQuery]);

  React.useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const rows: ProfitLossRow[] = React.useMemo(
    () =>
      profitLossRows.map((row) => ({
        id: row.id,
        period: row.period,
        revenue: row.revenue,
        cost_of_sales: row.cost_of_sales,
        gross_profit: row.gross_profit,
        operating_expenses: row.operating_expenses,
        net_profit: row.net_profit,
        margin_percent: row.margin_percent,
        status: row.status,
        updated_at: row.updated_at,
      })),
    [profitLossRows],
  );

  const totalRevenue = profitLossSummary?.total_revenue ?? 0;
  const totalCostOfSales = profitLossSummary?.total_cost_of_sales ?? 0;
  const totalOperatingExpenses = profitLossSummary?.total_operating_expenses ?? 0;
  const totalNetProfit = profitLossSummary?.total_net_profit ?? 0;

  const fields: TableField<ProfitLossRow>[] = [
    {
      key: "period",
      header: "Period",
      enableSorting: true,
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: "revenue",
      header: "Revenue",
      align: "right",
      enableSorting: true,
      cell: (value) => <span>{formatCurrency(Number(value))}</span>,
    },
    {
      key: "cost_of_sales",
      header: "Cost of Sales",
      align: "right",
      enableSorting: true,
      cell: (value) => <span>{formatCurrency(Number(value))}</span>,
    },
    {
      key: "gross_profit",
      header: "Gross Profit",
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-medium">{formatCurrency(Number(value))}</span>
      ),
    },
    {
      key: "operating_expenses",
      header: "Operating Expenses",
      align: "right",
      enableSorting: true,
      cell: (value) => <span>{formatCurrency(Number(value))}</span>,
    },
    {
      key: "net_profit",
      header: "Net Profit",
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-semibold">
          {formatCurrency(Number(value))}
        </span>
      ),
    },
    {
      key: "margin_percent",
      header: "Margin",
      align: "center",
      enableSorting: true,
      cell: (value) => <span>{Number(value).toFixed(1)}%</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) =>
        value === "Finalized" ? (
          <Badge variant="outline">Profitable</Badge>
        ) : value === "Loss" ? (
          <Badge variant="destructive">Loss</Badge>
        ) : (
          <Badge variant="secondary">Break-even</Badge>
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
      <SiteHeader label="Profit & Loss" />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-6 md:px-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Profit & Loss</h2>
              <p className="text-sm text-muted-foreground">
                Review business profitability across reporting periods using revenue, cost of sales, and operating expenses.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => loadProfitLossReports(currentQuery)}
              disabled={loading}
            >
              {loading && <IconLoader2 className="mr-2 size-4 animate-spin" />}
              <IconRefresh className="size-4" />
              Refresh
            </Button>
          </div>

          {error && (
            <Card className="border-destructive/40">
              <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
                <IconAlertCircle className="size-4" />
                {error}
              </CardContent>
            </Card>
          )}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Revenue"
              value={formatCurrency(totalRevenue)}
              description="Total reported business revenue"
              icon={<IconArrowUp className="size-5" />}
            />

            <MetricCard
              title="Cost of Sales"
              value={formatCurrency(totalCostOfSales)}
              description="Direct cost tied to goods sold"
              icon={<IconArrowDown className="size-5" />}
            />

            <MetricCard
              title="Operating Expenses"
              value={formatCurrency(totalOperatingExpenses)}
              description="Running costs outside direct stock cost"
              icon={<IconWallet className="size-5" />}
            />

            <MetricCard
              title="Net Profit"
              value={formatCurrency(totalNetProfit)}
              description="Bottom-line result after all major costs"
              icon={<IconReportMoney className="size-5" />}
            />
          </section>

          <Card>
            <CardContent>
              <DataTable<ProfitLossRow>
                title="Profit & Loss Register"
                description="Track profitability across reporting periods"
                data={rows}
                fields={fields}
                enableGlobalSearch
                searchPlaceholder="Search profit and loss reports..."
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