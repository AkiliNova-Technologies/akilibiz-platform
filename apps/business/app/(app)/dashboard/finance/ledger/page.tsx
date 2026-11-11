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

type Row = LedgerRow & TableData;

export default function FinanceLedgerPage() {
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
      header: "Reference",
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "entry_type",
      header: "Entry Type",
      align: "center",
      cell: (value) =>
        value === "Credit" ? (
          <Badge variant="outline">Credit</Badge>
        ) : (
          <Badge variant="secondary">Debit</Badge>
        ),
    },
    { key: "source", header: "Source", align: "center", enableSorting: true },
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
    { key: "account", header: "Account", align: "center", enableSorting: true },
    {
      key: "recorded_by",
      header: "Recorded By",
      align: "center",
      enableSorting: true,
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
          <h2 className="text-2xl font-semibold">Financial Ledger</h2>
          <p className="text-sm text-muted-foreground">
            Review debit and credit entries across the business financial
            record.
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
            title="Total Credits"
            value={ledgerSummary ? formatFinanceCurrency(ledgerSummary.total_credits) : "—"}
            description="All credit-side ledger entries"
            icon={<ArrowUp className="size-5" />}
          />
          <MetricCard
            title="Total Debits"
            value={ledgerSummary ? formatFinanceCurrency(ledgerSummary.total_debits) : "—"}
            description="All debit-side ledger entries"
            icon={<ArrowDown className="size-5" />}
          />
          <MetricCard
            title="Debit / credit difference"
            value={ledgerSummary ? formatFinanceCurrency(ledgerSummary.net_position) : "—"}
            description="Journal entries should balance to zero"
            icon={<CircleDollarSign className="size-5" />}
          />
          <MetricCard
            title="Ledger Entries"
            value={ledgerSummary ? String(ledgerSummary.total_entries) : "—"}
            description="Recorded financial entries"
            icon={<BookOpen className="size-5" />}
          />
        </section>
        <Card>
          <CardContent>
            <DataTable<Row>
              title="Ledger Register"
              description="Trace debit and credit activity across business finance"
              data={rows}
              fields={fields}
              enableGlobalSearch
              searchPlaceholder="Search ledger entries..."
              pageSize={10}
              loading={loading}
              emptyMessage={
                loading
                  ? "Loading ledger entries..."
                  : error ? "Ledger could not be loaded." : "No synchronized journal entries found."
              }
              toolbarActions={
                <Button
                  variant="outline"
                  onClick={() => void refreshLedger()}
                  disabled={loading} size="icon" aria-label="Refresh" title="Refresh">
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
