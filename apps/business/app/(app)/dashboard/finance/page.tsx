"use client";

import { useEffect, useMemo } from "react";
import { ArrowDown, ArrowUp, Banknote, WalletCards } from "lucide-react";
import {
  DataTable,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  formatFinanceCurrency,
  formatFinanceDate,
  type FinanceOverviewTransaction,
  useFinanceOverviewData,
} from "@/components/akilibiz/finance/finance-overview-data";

type FinanceRow = FinanceOverviewTransaction & TableData;

function TypeBadge({
  type,
}: {
  type: FinanceOverviewTransaction["entry_type"];
}) {
  return (
    <Badge variant={type === "Income" ? "outline" : "secondary"}>{type}</Badge>
  );
}

export default function FinanceOverviewPage() {
  const { overviewSummary, overviewTransactions, loading, refreshOverview } =
    useFinanceOverviewData();
  useEffect(() => {
    void refreshOverview({ limit: 20 });
  }, [refreshOverview]);
  const rows = useMemo<FinanceRow[]>(
    () => overviewTransactions.map((transaction) => ({ ...transaction })),
    [overviewTransactions],
  );
  const fields: TableField<FinanceRow>[] = [
    {
      key: "reference",
      header: "Reference",
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "entry_type",
      header: "Type",
      align: "center",
      cell: (value) => (
        <TypeBadge type={value as FinanceOverviewTransaction["entry_type"]} />
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
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {String(value)
            .replaceAll("_", " ")
            .replace(/\b\w/g, (character) => character.toUpperCase())}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      align: "center",
      enableSorting: true,
      cell: (value) => (
        <span className="text-sm text-muted-foreground">
          {formatFinanceDate(String(value))}
        </span>
      ),
    },
  ];
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold">Financial Overview</h2>
          <p className="text-sm text-muted-foreground">
            Monitor income, expenses, and overall business financial health.
          </p>
        </div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Income"
            value={formatFinanceCurrency(overviewSummary.total_income)}
            description="Revenue generated"
            icon={<ArrowUp className="size-5" />}
          />
          <MetricCard
            title="Total Expenses"
            value={formatFinanceCurrency(overviewSummary.total_expenses)}
            description="Operational costs"
            icon={<ArrowDown className="size-5" />}
          />
          <MetricCard
            title="Net Balance"
            value={formatFinanceCurrency(overviewSummary.net_balance)}
            description="Profit / Loss position"
            icon={<Banknote className="size-5" />}
          />
          <MetricCard
            title="Cash Position"
            value={formatFinanceCurrency(overviewSummary.cash_position)}
            description="Available working balance"
            icon={<WalletCards className="size-5" />}
          />
        </section>
        <Card>
          <CardContent>
            <DataTable<FinanceRow>
              title="Recent Transactions"
              description="Latest income and expense activities"
              data={rows}
              fields={fields}
              enableGlobalSearch
              searchPlaceholder="Search transactions..."
              pageSize={5}
              emptyMessage={
                loading
                  ? "Loading recent transactions..."
                  : "No finance transactions found."
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
