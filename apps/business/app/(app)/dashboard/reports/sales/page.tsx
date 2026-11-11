"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw } from "lucide-react";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { DateRangePicker } from "@/components/akilibiz/date-range-picker";
import { ReportPeriodSelect } from "@/components/akilibiz/reports/report-period-select";
import {
  type SaleReportDrillDown,
  type SalesRegisterRow,
  useReportsSalesData,
} from "@/components/akilibiz/reports/reports-sales-data";
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

type Row = {
  sale_number: string;
  sale_date_utc: string;
  customer: string;
  total: number;
  paid: number;
  balance: number;
  status: string;
  source: SalesRegisterRow;
} & TableData;
const ugx = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(value);

export default function ReportsSalesPage() {
  const { sales, getSalesRegister, getSaleReportDrillDown, loading, error } = useReportsSalesData();
  useEffect(() => { void getSalesRegister({ skip: 0, limit: 100 }); }, [getSalesRegister]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);
  const [drill, setDrill] = useState<SaleReportDrillDown | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const rows = useMemo<Row[]>(
    () => sales.filter((sale) => (!from || sale.sale_date_utc >= from) && (!to || sale.sale_date_utc <= to)).map((source) => ({ id: source.id, sale_number: source.sale_number, sale_date_utc: source.sale_date_utc, customer: source.customer_name ?? "Walk-in customer", total: source.total_amount_ugx, paid: source.amount_paid_ugx, balance: source.balance_due_ugx, status: `${source.status} · ${source.reversal_status}`, source })),
    [from, sales, to],
  );
  const refresh = () => void getSalesRegister({ date_from: from || undefined, date_to: to || undefined, skip: 0, limit: 100 });
  const open = async (row: Row) => {
    setSelected(row);
    setDrill(null);
    setDrillLoading(true);
    setDrill(await getSaleReportDrillDown(row.source.id));
    setDrillLoading(false);
  };
  const fields: TableField<Row>[] = [
    {
      key: "sale_number",
      header: "Sale",
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    { key: "sale_date_utc", header: "UTC date" },
    { key: "customer", header: "Customer" },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (value) => ugx(Number(value)),
    },
    {
      key: "paid",
      header: "Paid",
      align: "right",
      cell: (value) => ugx(Number(value)),
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      cell: (value) => ugx(Number(value)),
    },
    {
      key: "status",
      header: "Status",
      cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
  ];
  const actions: TableAction<Row>[] = [
    {
      type: "view",
      label: "View sale detail",
      onClick: (row) => void open(row),
    },
  ];
  const period =
    from || to
      ? `${from || "All"} to ${to || "All"} UTC`
      : "All available UTC dates";
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold">Sales Reports</h2>
            <p className="text-sm text-muted-foreground">
              Sales register for {period}. Cancelled and reversal history
              remains visible.
            </p>
          </div>
          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              title="Sales shown"
              value="—"
              description={period}
              icon={<Eye className="size-5" />}
            />
            <MetricCard
              title="Total billed"
              value="—"
              description="Exact UGX in this returned register"
              icon={<Eye className="size-5" />}
            />
            <MetricCard
              title="Outstanding"
              value="—"
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
                  disabled={!draftFrom || !draftTo}>
                  Apply period
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <DataTable<Row>
                title="Sales Register"
                helpText="Shows the sales register for the selected UTC period, including cancelled and reversal history."
                description="Select a row to review sale detail."
                data={rows}
                fields={fields}
                actions={actions}
                onRowClick={(row) => void open(row)}
                toolbarActions={
                  <Button
                    variant="outline"
                    onClick={refresh} size="icon" aria-label="Refresh" title="Refresh" disabled>
                    <RefreshCw className="size-4" />
                    
                  </Button>
                }
                enableSelection={false}
                enableGlobalSearch
                enableSorting={false}
                loading={false}
                emptyMessage="Sales reporting is unavailable until the hosted sales register is connected."
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(isOpen) => !isOpen && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sale detail</DialogTitle>
            <DialogDescription>
              Review sale items, payments, tax, and cancellation or reversal
              state.
            </DialogDescription>
          </DialogHeader>
          {drillLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading sale detail…
            </p>
          ) : drill ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 rounded border p-3">
                <span>Sale</span>
                <span>{drill.sale.sale_number}</span>
                <span>Customer</span>
                <span>{drill.sale.customer_name ?? "Walk-in customer"}</span>
                <span>Total</span>
                <span>{ugx(drill.sale.total_amount_ugx)}</span>
                <span>Paid / balance</span>
                <span>
                  {ugx(drill.sale.amount_paid_ugx)} /{" "}
                  {ugx(drill.sale.balance_due_ugx)}
                </span>
                <span>Status</span>
                <span>
                  {drill.sale.status} · {drill.sale.reversal_status}
                </span>
              </div>
              <div>
                <p className="mb-2 font-medium">Items</p>
                {drill.items.map((item) => (
                  <div
                    className="flex justify-between border-b py-2"
                    key={item.name}>
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span>{ugx(item.line_total_ugx)}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-2 font-medium">Payments</p>
                {drill.payments.map((payment) => (
                  <div
                    className="flex justify-between border-b py-2"
                    key={payment.reference}>
                    <span>
                      {payment.method} · {payment.reference}
                    </span>
                    <span>{ugx(payment.amount_ugx)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Tax</span>
                <span>{ugx(drill.tax_amount_ugx)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sale detail is unavailable.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
