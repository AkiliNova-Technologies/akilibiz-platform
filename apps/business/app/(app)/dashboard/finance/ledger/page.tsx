"use client";

import { useEffect, useMemo } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  CircleDollarSign,
  LoaderCircle,
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
  type LedgerRow,
  useFinanceLedgerData,
} from "@/components/akilibiz/finance/finance-ledger-data";
import { FinancialMirrorStatus } from "@/components/akilibiz/finance/financial-mirror-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
type Row = LedgerRow & TableData;

export default function FinanceLedgerPage() {
  const { t } = useI18n();
  const { ledgerEntries, ledgerSummary, loading, error, lastSuccessfulSync, isStale, refreshLedger } =
    useFinanceLedgerData();
  useEffect(() => {
    void refreshLedger();
  }, [refreshLedger]);
  const rows = useMemo<Row[]>(
    () => ledgerEntries.map((entry) => ({ ...entry })),
    [ledgerEntries],
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
      key: "entry_type",
      header: t("finance.ledger.entryType"),
      align: "center",
      cell: (value) =>
        value === "Credit" ? (
          <Badge variant="outline">{t("finance.ledger.credit")}</Badge>
        ) : (
          <Badge variant="secondary">{t("finance.ledger.debit")}</Badge>
        ),
    },
    { key: "source", header: t("finance.ledger.source"), align: "center", enableSorting: true },
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
    { key: "account", header: t("finance.ledger.account"), align: "center", enableSorting: true },
    {
      key: "recorded_by",
      header: t("finance.ledger.recordedBy"),
      align: "center",
      enableSorting: true,
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
          <h2 className="text-2xl font-semibold">{t("finance.ledger.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("finance.ledger.description")}
          </p>
        </div>
        <FinancialMirrorStatus loading={loading} error={error} lastSuccessfulSync={lastSuccessfulSync} isStale={isStale} />
        <p className="text-xs text-muted-foreground">
          This register shows individual debit and credit journal lines. The desktop finance
          register shows operational payments and transactions, so their row counts differ.
          Staff names are taken from business-scoped desktop journal attribution.
        </p>
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
            title={t("finance.ledger.totalCredits")}
            value={ledgerSummary ? formatFinanceCurrency(ledgerSummary.total_credits) : "—"}
            description={t("finance.ledger.totalCreditsDescription")}
            icon={<ArrowUp className="size-5" />}
          />
          <MetricCard
            title={t("finance.ledger.totalDebits")}
            value={ledgerSummary ? formatFinanceCurrency(ledgerSummary.total_debits) : "—"}
            description={t("finance.ledger.totalDebitsDescription")}
            icon={<ArrowDown className="size-5" />}
          />
          <MetricCard
            title={t("finance.ledger.net")}
            value={ledgerSummary ? formatFinanceCurrency(ledgerSummary.net_position) : "—"}
            description={t("finance.ledger.netDescription")}
            icon={<CircleDollarSign className="size-5" />}
          />
          <MetricCard
            title={t("finance.ledger.entries")}
            value={ledgerSummary ? String(ledgerSummary.total_entries) : "—"}
            description={t("finance.ledger.entriesDescription")}
            icon={<BookOpen className="size-5" />}
          />
        </section>
        <Card>
          <CardContent>
            <DataTable<Row>
              title={t("finance.ledger.register")}
              description={t("finance.ledger.registerDescription")}
              data={rows}
              fields={fields}
              enableGlobalSearch
              searchPlaceholder={t("finance.ledger.search")}
              pageSize={10}
              loading={loading}
              emptyMessage={
                loading
                  ? "Loading ledger entries..."
                  : error ? "Ledger could not be loaded." : "No journal entries available."
              }
              toolbarActions={
                <Button
                  variant="outline"
                  onClick={() => void refreshLedger()}
                  disabled={loading} size="icon" aria-label={t("finance.ledger.refresh")} title={t("finance.ledger.refresh")}>
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
