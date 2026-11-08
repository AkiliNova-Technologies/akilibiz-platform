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
  IconBook2,
  IconLoader2,
  IconRefresh,
  IconReportMoney,
} from "@tabler/icons-react";
import MetricCard from "@/components/metric-card";
import { useReduxFinance } from "@/hooks/useReduxFinance";
import type { LedgerRow as BackendLedgerRow } from "@/services/tauri/finance";

// ============================================================================
// TYPES
// ============================================================================

interface LedgerRow extends TableData {
  id: number;
  reference: string;
  entry_type: "Debit" | "Credit";
  source: string;
  category: string;
  amount: number;
  account: string;
  recorded_by: string;
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

function mapLedgerRows(rows: BackendLedgerRow[]): LedgerRow[] {
  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    entry_type: row.entry_type,
    source: row.source,
    category: row.category,
    amount: row.amount,
    account: row.account,
    recorded_by: row.recorded_by,
    date: row.date,
    description: row.description ?? "",
  }));
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FinanceLedgerPage() {
  const {
    ledgerEntries,
    ledgerSummary,
    loading,
    error,
    refreshLedger,
    clearError,
  } = useReduxFinance();

  React.useEffect(() => {
    refreshLedger().catch(console.error);
  }, [refreshLedger]);

  React.useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const rows = React.useMemo(
    () => mapLedgerRows(ledgerEntries),
    [ledgerEntries],
  );

  const totalCredits = ledgerSummary?.total_credits ?? 0;
  const totalDebits = ledgerSummary?.total_debits ?? 0;
  const netLedgerPosition = ledgerSummary?.net_position ?? 0;
  const totalEntries = ledgerSummary?.total_entries ?? 0;

  const fields: TableField<LedgerRow>[] = [
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
    {
      key: "source",
      header: "Source",
      align: "center",
      enableSorting: true,
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
          {formatCurrency(Number(value))}
        </span>
      ),
    },
    {
      key: "account",
      header: "Account",
      align: "center",
      enableSorting: true,
    },
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
      <SiteHeader label="Ledger" />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-6 md:px-6">
          <div>
            <h2 className="text-2xl font-semibold">Financial Ledger</h2>
            <p className="text-sm text-muted-foreground">
              Review debit and credit entries across the business financial record.
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
              title="Total Credits"
              value={formatCurrency(totalCredits)}
              description="All credit-side ledger entries"
              icon={<IconArrowUp className="size-5" />}
            />

            <MetricCard
              title="Total Debits"
              value={formatCurrency(totalDebits)}
              description="All debit-side ledger entries"
              icon={<IconArrowDown className="size-5" />}
            />

            <MetricCard
              title="Net Position"
              value={formatCurrency(netLedgerPosition)}
              description="Credit less debit balance"
              icon={<IconReportMoney className="size-5" />}
            />

            <MetricCard
              title="Ledger Entries"
              value={String(totalEntries)}
              description="Recorded financial entries"
              icon={<IconBook2 className="size-5" />}
            />
          </section>

          <Card>
            <CardContent>
              <DataTable<LedgerRow>
                title="Ledger Register"
                description="Trace debit and credit activity across business finance"
                data={rows}
                fields={fields}
                enableGlobalSearch
                searchPlaceholder="Search ledger entries..."
                pageSize={10}
                loading={loading}
                toolbarActions={
                  <Button
                    variant="outline"
                    onClick={() => refreshLedger().catch(console.error)}
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