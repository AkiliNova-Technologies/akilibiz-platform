"use client";

import { useEffect, useMemo } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Banknote,
  LoaderCircle,
  RefreshCw,
  WalletCards,
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
  type CashFlowRow,
  useFinanceCashFlowData,
} from "@/components/akilibiz/finance/finance-cashflow-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Row = CashFlowRow & TableData;
const methodLabel = (method: string) =>
  ({
    cash: "Cash",
    bank_transfer: "Bank Transfer",
    mobile_money: "Mobile Money",
    card: "Card",
    cheque: "Cheque",
    other: "Other",
  })[method] ?? method;

export default function FinanceCashFlowPage() {
  const { cashFlowEntries, cashFlowSummary, loading, error, refreshCashFlow } =
    useFinanceCashFlowData();
  useEffect(() => {
    void refreshCashFlow();
  }, [refreshCashFlow]);
  const rows = useMemo<Row[]>(
    () => cashFlowEntries.map((entry) => ({ ...entry })),
    [cashFlowEntries],
  );
  const fields: TableField<Row>[] = [
    {
      key: "reference",
      header: "Reference",
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "flow_type",
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
        <span className="font-medium">
          {formatFinanceCurrency(Number(value))}
        </span>
      ),
    },
    {
      key: "method",
      header: "Method",
      align: "center",
      cell: (value) => methodLabel(String(value)),
    },
    {
      key: "date",
      header: "Date",
      align: "center",
      enableSorting: true,
      cell: (value) => formatFinanceDate(String(value)),
    },
  ];
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold">Cash Flow</h2>
          <p className="text-sm text-muted-foreground">
            Monitor money flowing into and out of the business over time.
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
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Inflow"
            value={cashFlowSummary ? formatFinanceCurrency(cashFlowSummary.total_inflow) : "—"}
            description="All recorded incoming cash movements"
            icon={<ArrowUp className="size-5" />}
          />
          <MetricCard
            title="Total Outflow"
            value={cashFlowSummary ? formatFinanceCurrency(cashFlowSummary.total_outflow) : "—"}
            description="All recorded outgoing cash movements"
            icon={<ArrowDown className="size-5" />}
          />
          <MetricCard
            title="Net Cash Flow"
            value={cashFlowSummary ? formatFinanceCurrency(cashFlowSummary.net_cash_flow) : "—"}
            description="Difference between inflow and outflow"
            icon={<Banknote className="size-5" />}
          />
          <MetricCard
            title="Transactions"
            value={cashFlowSummary ? String(cashFlowSummary.transaction_count) : "—"}
            description="Cash movement entries in current view"
            icon={<WalletCards className="size-5" />}
          />
        </section>
        <Card>
          <CardContent>
            <DataTable<Row>
              title="Cash Movement Register"
              description="Track cash inflows and outflows across operations"
              data={rows}
              fields={fields}
              enableGlobalSearch
              searchPlaceholder="Search cash flow..."
              pageSize={10}
              loading={loading}
              emptyMessage={
                loading ? "Loading cash flow..." : "Cash flow records are unavailable until the hosted finance ledger is connected."
              }
              toolbarActions={
                <Button
                  variant="outline"
                  onClick={() => void refreshCashFlow()}
                  disabled size="icon" aria-label="Refresh" title="Refresh">
                  {loading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  
                </Button>
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
