import * as React from "react";
import {
  DataTable,
  type TableField,
  type TableData,
} from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useReduxFinance } from "@/hooks/useReduxFinance";
import type { CashFlowRow as BackendCashFlowRow } from "@/services/tauri/finance";

// ============================================================================
// TYPES
// ============================================================================

type CashFlowType = "Inflow" | "Outflow";

interface CashFlowRow extends TableData {
  id: number;
  reference: string;
  type: CashFlowType;
  category: string;
  amount: number;
  method: string;
  date: string;
  description: string;
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

function paymentMethodToLabel(method: string): string {
  switch (method) {
    case "cash":
      return "Cash";
    case "bank_transfer":
      return "Bank Transfer";
    case "mobile_money":
      return "Mobile Money";
    case "card":
      return "Card";
    case "cheque":
      return "Cheque";
    case "other":
      return "Other";
    default:
      return method;
  }
}

function mapCashFlowRows(rows: BackendCashFlowRow[]): CashFlowRow[] {
  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    type: row.flow_type,
    category: row.category,
    amount: row.amount,
    method: row.method ?? "",
    date: row.date,
    description: row.description ?? "",
  }));
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FinanceCashFlowPage() {
  const {
    cashFlowEntries,
    cashFlowSummary,
    loading,
    error,
    refreshCashFlow,
    clearError,
  } = useReduxFinance();

  React.useEffect(() => {
    refreshCashFlow().catch(console.error);
  }, [refreshCashFlow]);

  React.useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const rows = React.useMemo(
    () => mapCashFlowRows(cashFlowEntries),
    [cashFlowEntries],
  );

  const totalInflow = cashFlowSummary?.total_inflow ?? 0;
  const totalOutflow = cashFlowSummary?.total_outflow ?? 0;
  const netCashFlow = cashFlowSummary?.net_cash_flow ?? 0;
  const transactionCount = cashFlowSummary?.transaction_count ?? 0;

  const fields: TableField<CashFlowRow>[] = [
    {
      key: "reference",
      header: "Reference",
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      align: "center",
      cell: (value) =>
        value === "Inflow" ? (
          <Badge variant="outline">Inflow</Badge>
        ) : (
          <Badge variant="secondary">Outflow</Badge>
        ),
    },
    {
      key: "category",
      header: "Category",
      align: "center",
      enableSorting: true,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      enableSorting: true,
      cell: (value) => (
        <span className="font-medium">{formatCurrency(Number(value))}</span>
      ),
    },
    {
      key: "method",
      header: "Method",
      align: "center",
      cell: (value) => paymentMethodToLabel(String(value)),
    },
    {
      key: "date",
      header: "Date",
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
      <SiteHeader label="Cash Flow" />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-6 md:px-6">
          <div>
            <h2 className="text-2xl font-semibold">Cash Flow</h2>
            <p className="text-sm text-muted-foreground">
              Monitor money flowing into and out of the business over time.
            </p>
          </div>

          {error && (
            <Card className="border-destructive/40">
              <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
                <IconAlertCircle className="size-4" />
                <span>{error}</span>
              </CardContent>
            </Card>
          )}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total Inflow"
              value={formatCurrency(totalInflow)}
              description="All recorded incoming cash movements"
              icon={<IconArrowUp className="size-5" />}
            />

            <MetricCard
              title="Total Outflow"
              value={formatCurrency(totalOutflow)}
              description="All recorded outgoing cash movements"
              icon={<IconArrowDown className="size-5" />}
            />

            <MetricCard
              title="Net Cash Flow"
              value={formatCurrency(netCashFlow)}
              description="Difference between inflow and outflow"
              icon={<IconReportMoney className="size-5" />}
            />

            <MetricCard
              title="Transactions"
              value={String(transactionCount)}
              description="Cash movement entries in current view"
              icon={<IconWallet className="size-5" />}
            />
          </section>

          <Card>
            <CardContent>
              <DataTable<CashFlowRow>
                title="Cash Movement Register"
                description="Track cash inflows and outflows across operations"
                data={rows}
                fields={fields}
                enableGlobalSearch
                searchPlaceholder="Search cash flow..."
                pageSize={10}
                loading={loading}
                toolbarActions={
                  <Button
                    variant="outline"
                    onClick={() => refreshCashFlow().catch(console.error)}
                    disabled={loading}
                  >
                    {loading ? (
                      <IconLoader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    <IconRefresh className="size-4" />
                    Refresh
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}