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
import { FinancialMirrorStatus } from "@/components/akilibiz/finance/financial-mirror-status";

import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
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
  const { t } = useI18n();
  const { overviewSummary, overviewTransactions, loading, error, lastSuccessfulSync, isStale, refreshOverview } =
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
      header: t("finance.reference"),
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "entry_type",
      header: t("finance.type"),
      align: "center",
      cell: (value) => (
        <TypeBadge type={value as FinanceOverviewTransaction["entry_type"]} />
      ),
    },
    {
      key: "category",
      header: t("finance.category"),
      align: "center",
      enableSorting: true,
    },
    {
      key: "amount",
      header: t("finance.amount"),
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
      header: t("finance.method"),
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
      header: t("sales.date"),
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
          <h2 className="text-2xl font-semibold">{t("financeHome.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("financeHome.description")}
          </p>
        </div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title={t("income.total")}
            value={overviewSummary ? formatFinanceCurrency(overviewSummary.total_income) : "—"}
            description={t("financeHome.revenue")}
            icon={<ArrowUp className="size-5" />}
          />
          <MetricCard
            title={t("financeHome.totalExpenses")}
            value={overviewSummary ? formatFinanceCurrency(overviewSummary.total_expenses) : "—"}
            description={t("financeHome.costs")}
            icon={<ArrowDown className="size-5" />}
          />
          <MetricCard
            title={t("finance.netBalance")}
            value={overviewSummary ? formatFinanceCurrency(overviewSummary.net_balance) : "—"}
            description="Profit / Loss position"
            icon={<Banknote className="size-5" />}
          />
          <MetricCard
            title={t("finance.cashPosition")}
            value={overviewSummary ? formatFinanceCurrency(overviewSummary.cash_position) : "—"}
            description="Available working balance"
            icon={<WalletCards className="size-5" />}
          />
        </section>
        <FinancialMirrorStatus loading={loading} error={error} lastSuccessfulSync={lastSuccessfulSync} isStale={isStale} />
        <Card>
          <CardContent>
            <DataTable<FinanceRow>
              title={t("finance.transactions")}
              description={t("financeHome.transactionsDescription")}
              data={rows}
              fields={fields}
              enableGlobalSearch
              searchPlaceholder={t("financeHome.search")}
              pageSize={5}
              emptyMessage={
                loading
                  ? t("financeHome.loading")
                  : "No finance transactions available."
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
