import * as React from "react";
import { Eye, Loader2 } from "lucide-react";
import {
  DataTable,
  type TableData,
  type TableField,
} from "@/components/data-table";
import MetricCard from "@/components/metric-card";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DateRangePicker } from "@/components/date-range-picker";
import { ReportPeriodSelect } from "@/components/report-period-select";
import {
  getSaleReportDrillDown,
  getSalesRegister,
  type SalesRegisterRow,
} from "@/services/tauri/reports";
import { IconRefresh } from "@tabler/icons-react";

interface Row extends TableData {
  sale_number: string;
  sale_date_utc: string;
  customer: string;
  total: number;
  paid: number;
  balance: number;
  status: string;
  source: SalesRegisterRow;
}
const ugx = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(value);
const detail = (value: unknown): React.ReactNode =>
  typeof value === "object" && value !== null ? (
    <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  ) : (
    String(value ?? "Unavailable")
  );

export default function ReportsSalesPage() {
  const [rows, setRows] = React.useState<Row[]>([]),
    [loading, setLoading] = React.useState(false),
    [error, setError] = React.useState<string | null>(null),
    [from, setFrom] = React.useState(""),
    [to, setTo] = React.useState(""),
    [draftFrom, setDraftFrom] = React.useState(""),
    [draftTo, setDraftTo] = React.useState(""),
    [selected, setSelected] = React.useState<Row | null>(null),
    [drill, setDrill] = React.useState<Record<string, unknown> | null>(null),
    [drillError, setDrillError] = React.useState<string | null>(null),
    [drillLoading, setDrillLoading] = React.useState(false);
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getSalesRegister({
        date_from: from || undefined,
        date_to: to || undefined,
        skip: 0,
        limit: 100,
      });
      setRows(
        result.map((source) => ({
          id: source.id,
          sale_number: source.sale_number,
          sale_date_utc: source.sale_date_utc,
          customer: source.customer_name ?? "Walk-in customer",
          total: source.total_amount_ugx,
          paid: source.amount_paid_ugx,
          balance: source.balance_due_ugx,
          status: `${source.status} · ${source.reversal_status}`,
          source,
        })),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load sales register.",
      );
    } finally {
      setLoading(false);
    }
  }, [from, to]);
  React.useEffect(() => {
    void load();
  }, [load]);
  const open = async (row: Row) => {
    setSelected(row);
    setDrill(null);
    setDrillError(null);
    setDrillLoading(true);
    try {
      setDrill(await getSaleReportDrillDown(row.source.id));
    } catch (caught) {
      setDrillError(
        caught instanceof Error
          ? caught.message
          : "Sale detail is unavailable.",
      );
    } finally {
      setDrillLoading(false);
    }
  };
  const fields: TableField<Row>[] = [
    {
      key: "sale_number",
      header: "Sale",
      cell: (v) => <span className="font-medium">{String(v)}</span>,
    },
    { key: "sale_date_utc", header: "UTC date" },
    { key: "customer", header: "Customer" },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (v) => ugx(Number(v)),
    },
    {
      key: "paid",
      header: "Paid",
      align: "right",
      cell: (v) => ugx(Number(v)),
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      cell: (v) => ugx(Number(v)),
    },
    {
      key: "status",
      header: "Status",
      cell: (v) => <Badge variant="outline">{String(v)}</Badge>,
    },
  ];
  const period =
    from || to
      ? `${from || "All"} to ${to || "All"} UTC`
      : "All available UTC dates";
  return (
    <>
      <SiteHeader label="Sales Reports" />
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-6 md:px-6">
          <div>
            <h2 className="text-2xl font-semibold">Sales Reports</h2>
            <p className="text-sm text-muted-foreground">
              Authoritative sales register for {period}. Cancelled and reversal
              history remains visible.
            </p>
          </div>
          {error && (
            <Card className="border-destructive/40">
              <CardContent className="p-4 text-sm text-destructive">
                {error}
              </CardContent>
            </Card>
          )}
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Sales shown"
              value={String(rows.length)}
              description={period}
              icon={<Eye className="size-5" />}
            />
            <MetricCard
              title="Total billed"
              value={ugx(rows.reduce((n, row) => n + row.total, 0))}
              description="Exact UGX in this returned register"
              icon={<Eye className="size-5" />}
            />
            <MetricCard
              title="Outstanding"
              value={ugx(rows.reduce((n, row) => n + row.balance, 0))}
              description="Exact reported balance"
              icon={<Eye className="size-5" />}
            />
          </section>
          <Card>
            <CardContent className="grid gap-4 px-4 md:grid-cols-4 md:items-end">
              <DateRangePicker
                id="sales-report-date-range"
                label="Date range (UTC)"
                from={draftFrom}
                to={draftTo}
                onRangeChange={(nextFrom, nextTo) => {
                  setDraftFrom(nextFrom);
                  setDraftTo(nextTo);
                }}
                numberOfMonths={1}
              />
              <ReportPeriodSelect
                id="sales-report-period"
                selectedEndDate={draftTo}
                onRangeChange={(nextFrom, nextTo) => {
                  setDraftFrom(nextFrom);
                  setDraftTo(nextTo);
                }}
              />
              <div className="md:col-span-2">
                <Button
                  className="h-11 w-full md:w-auto"
                  onClick={() => {
                    setFrom(draftFrom);
                    setTo(draftTo);
                  }}
                  disabled={loading || !draftFrom || !draftTo}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Apply period
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <DataTable<Row>
                title="Sales Register"
                helpText="Shows the authoritative sales register for the selected UTC period, including cancelled and reversal history."
                description="Stable backend order; select a row for persisted sale detail."
                data={rows}
                fields={fields}
                actions={[
                  { type: "view", label: "View sale detail", onClick: open },
                ]}
                onRowClick={open}
                toolbarActions={
                  <Button
                    variant="outline"
                    onClick={() => void load()}
                    disabled={loading}>
                    {loading && (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    )}
                    <IconRefresh className="size-4" />
                    Refresh
                  </Button>
                }
                enableSelection={false}
                enableGlobalSearch={true}
                enableSorting={false}
                loading={loading}
                emptyMessage="No sales match the selected UTC period."
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sale detail</DialogTitle>
            <DialogDescription>
              Persisted header, lines, payments, tax snapshot, and
              cancellation/reversal state.
            </DialogDescription>
          </DialogHeader>
          {drillLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading persisted sale detail…
            </p>
          ) : drillError ? (
            <p className="text-sm text-muted-foreground">{drillError}</p>
          ) : drill ? (
            <div className="space-y-3 text-sm">
              {Object.entries(drill).map(([key, value]) => (
                <div key={key}>
                  <p className="mb-1 font-medium">{key}</p>
                  {detail(value)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unavailable.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
