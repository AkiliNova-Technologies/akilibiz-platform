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
import { FinancialMirrorStatus } from "@/components/akilibiz/finance/financial-mirror-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
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
  const { t } = useI18n();
  const { cashFlowEntries, cashFlowSummary, loading, error, lastSuccessfulSync, isStale, refreshCashFlow } =
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
      header: t("finance.reference"),
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "flow_type",
      header: t("finance.type"),
      align: "center",
      cell: (value) =>
        value === "Inflow" ? (
          <Badge variant="outline">{t("finance.cashflow.inflow")}</Badge>
        ) : (
          <Badge variant="secondary">{t("finance.cashflow.outflow")}</Badge>
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
      cell: (value) => methodLabel(String(value)),
    },
    {
      key: "date",
      header: t("finance.date"),
      align: "center",
      enableSorting: true,
      cell: (value) => formatFinanceDate(String(value)),
    },
  ];
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold">{t("finance.cashflow.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("finance.cashflow.description")}
          </p>
        </div>
        <FinancialMirrorStatus loading={loading} error={error} lastSuccessfulSync={lastSuccessfulSync} isStale={isStale} />
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
            title={t("finance.cashflow.totalInflow")}
            value={cashFlowSummary ? formatFinanceCurrency(cashFlowSummary.total_inflow) : "—"}
            description={t("finance.cashflow.totalInflowDescription")}
            icon={<ArrowUp className="size-5" />}
          />
          <MetricCard
            title={t("finance.cashflow.totalOutflow")}
            value={cashFlowSummary ? formatFinanceCurrency(cashFlowSummary.total_outflow) : "—"}
            description={t("finance.cashflow.totalOutflowDescription")}
            icon={<ArrowDown className="size-5" />}
          />
          <MetricCard
            title={t("finance.cashflow.net")}
            value={cashFlowSummary ? formatFinanceCurrency(cashFlowSummary.net_cash_flow) : "—"}
            description={t("finance.cashflow.netDescription")}
            icon={<Banknote className="size-5" />}
          />
          <MetricCard
            title={t("finance.cashflow.transactions")}
            value={cashFlowSummary ? String(cashFlowSummary.transaction_count) : "—"}
            description={t("finance.cashflow.transactionsDescription")}
            icon={<WalletCards className="size-5" />}
          />
        </section>
        <Card>
          <CardContent>
            <DataTable<Row>
              title={t("finance.cashflow.register")}
              description={t("finance.cashflow.registerDescription")}
              data={rows}
              fields={fields}
              enableGlobalSearch
              searchPlaceholder={t("finance.cashflow.search")}
              pageSize={10}
              loading={loading}
              emptyMessage={
                loading ? "Loading cash flow..." : "No cash flow records available."
              }
              toolbarActions={
                <Button
                  variant="outline"
                  onClick={() => void refreshCashFlow()}
                  disabled size="icon" aria-label={t("finance.cashflow.refresh")} title={t("finance.cashflow.refresh")}>
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
