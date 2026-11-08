import * as React from "react";
import { DataTable, type TableField, type TableData } from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconArrowDown,
  IconArrowUp,
  IconReportMoney,
  IconWallet,
} from "@tabler/icons-react";
import MetricCard from "@/components/metric-card";
import { useReduxFinance } from "@/hooks/useReduxFinance";
import { useI18n } from "@/hooks/useI18n";
import { formatCurrency as formatDisplayCurrency, formatDate as formatDisplayDate } from "@/i18n";

const formatCurrency = formatDisplayCurrency;

// ============================================================================
// TYPES
// ============================================================================

type TransactionType = "Income" | "Expense";

interface FinanceRow extends TableData {
  id: number;
  reference: string;
  type: TransactionType;
  category: string;
  amount: number;
  method: string;
  date: string;
  description: string;
}

// ============================================================================
// UTILS
// ============================================================================

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return formatDisplayDate(date);
}

function getTypeBadge(value: TransactionType) {
  return (
    <Badge variant={value === "Income" ? "outline" : "secondary"}>
      {value}
    </Badge>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FinanceOverviewPage() {
  const { t } = useI18n();
  const {
    overviewSummary,
    overviewTransactions,
    loading,
    refreshOverview,
  } = useReduxFinance();

  React.useEffect(() => {
    void refreshOverview({ limit: 20 });
  }, [refreshOverview]);

  const financeData = React.useMemo<FinanceRow[]>(() => {
    return overviewTransactions.map((transaction) => ({
      id: transaction.id,
      reference: transaction.reference,
      type: transaction.entry_type,
      category: transaction.category,
      amount: transaction.amount,
      method: transaction.method,
      date: transaction.date,
      description: transaction.description || "",
    }));
  }, [overviewTransactions]);

  const totalIncome = overviewSummary?.total_income ?? 0;
  const totalExpenses = overviewSummary?.total_expenses ?? 0;
  const netBalance = overviewSummary?.net_balance ?? 0;
  const cashPosition = overviewSummary?.cash_position ?? 0;

  const fields: TableField<FinanceRow>[] = [
    {
      key: "reference",
      header: t("finance.reference"),
      cell: (value) => (
        <span className="font-mono text-sm">{String(value)}</span>
      ),
    },
    {
      key: "type",
      header: t("finance.type"),
      align: "center",
      cell: (value) => getTypeBadge(value as TransactionType),
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
        <span className="font-medium">{formatCurrency(Number(value))}</span>
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
            .replace(/\b\w/g, (char) => char.toUpperCase())}
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
          {formatDate(String(value))}
        </span>
      ),
    },
  ];

  return (
    <>
      <SiteHeader label="Finance" />

      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-6 md:px-6">
          <div>
            <h2 className="text-2xl font-semibold">Financial Overview</h2>
            <p className="text-sm text-muted-foreground">
              Monitor income, expenses, and overall business financial health.
            </p>
          </div>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total Income"
              value={formatCurrency(totalIncome)}
              description="Revenue generated"
              icon={<IconArrowUp className="size-5" />}
            />

            <MetricCard
              title="Total Expenses"
              value={formatCurrency(totalExpenses)}
              description="Operational costs"
              icon={<IconArrowDown className="size-5" />}
            />

            <MetricCard
              title="Net Balance"
              value={formatCurrency(netBalance)}
              description="Profit / Loss position"
              icon={<IconReportMoney className="size-5" />}
            />

            <MetricCard
              title="Cash Position"
              value={formatCurrency(cashPosition)}
              description="Available working balance"
              icon={<IconWallet className="size-5" />}
            />
          </section>

          <Card>
            <CardContent>
              <DataTable<FinanceRow>
                title="Recent Transactions"
                description="Latest income and expense activities"
                data={financeData}
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
    </>
  );
}
