"use client";

import * as React from "react";
import {
  Banknote,
  ClipboardList,
  Loader2,
  Package,
  ReceiptText,
  Truck,
  UserRound,
  Users,
} from "lucide-react";
import { DateRangePicker } from "@/components/akilibiz/date-range-picker";
import {
  getDashboardOverview,
  type DashboardOverview,
} from "@/components/akilibiz/dashboard/dashboard-data";
import MetricCard from "@/components/akilibiz/metric-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const money = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(value);
const Empty = ({ title }: { title: string }) => (
  <div className="flex min-h-[130px] items-center justify-center text-sm text-muted-foreground">
    {title}
  </div>
);
const dateBefore = (to: string, days: number) => {
  const date = new Date(`${to}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date.toISOString().slice(0, 10);
};

export default function DashboardPage() {
  const day = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [from, setFrom] = React.useState(day);
  const [to, setTo] = React.useState(day);
  const [windowDays, setWindowDays] = React.useState("today");
  const [appliedPeriod, setAppliedPeriod] = React.useState({
    from: day,
    to: day,
  });
  const [d, setD] = React.useState<DashboardOverview | null>(null);
  const [sale, setSale] = React.useState<
    DashboardOverview["recent_sales"][number] | null
  >(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    void getDashboardOverview({
      date_from: appliedPeriod.from,
      date_to: appliedPeriod.to,
    })
      .then(setD)
      .catch((cause) =>
        setError(
          cause instanceof Error
            ? cause.message
            : "Dashboard data is unavailable.",
        ),
      )
      .finally(() => setLoading(false));
  }, [appliedPeriod]);
  const pendingValue = loading ? "—" : "Unavailable";
  const pendingDescription = loading
    ? "Loading backend data"
    : (error ?? "Backend data unavailable");
  const exactValue = (
    value: number | null | undefined,
    formatter: (value: number) => string = String,
  ) => (value == null ? pendingValue : formatter(value));
  const selectWindow = (value: string) => {
    setWindowDays(value);
    const end = to || day;
    if (value === "today") {
      setFrom(end);
      setTo(end);
      return;
    }
    if (value === "7" || value === "30")
      setFrom(dateBefore(end, Number(value)));
  };
  return (
    <div className="min-h-screen">
      <main className="flex flex-col gap-6">
        <section>
          <h2 className="text-2xl font-semibold tracking-tight">
            Business Overview
          </h2>
          <p className="text-sm text-muted-foreground">
            UTC period: {d?.date_from_utc ?? appliedPeriod.from} to{" "}
            {d?.date_to_utc ?? appliedPeriod.to}. Read-only operational data.
          </p>
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Revenue in selected period"
            value={exactValue(d?.completed_sales_total_ugx, money)}
            description={
              d
                ? "Sales and payments not synchronized yet"
                : pendingDescription
            }
            icon={<Banknote className="size-5" />}
          />
          <MetricCard
            title="Net Profit"
            value="Unavailable"
            description="COGS and expense policy unavailable"
            icon={<ReceiptText className="size-5" />}
          />
          <MetricCard
            title="Inventory Value"
            value={
              d?.inventory_value_ugx == null
                ? "Unavailable"
                : money(d.inventory_value_ugx)
            }
            description={
              d
                ? `${d.inventory_unvalued_count} unvalued exceptions`
                : pendingDescription
            }
            icon={<Package className="size-5" />}
          />
          <MetricCard
            title="Customers"
            value={exactValue(d?.customers_count)}
            description={d ? "Persisted customer records" : pendingDescription}
            icon={<Users className="size-5" />}
          />
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Suppliers"
            value={exactValue(d?.suppliers_count)}
            description="Uploaded supplier contact records"
            icon={<Truck className="size-5" />}
          />
          <MetricCard
            title="Stock on hand"
            value={exactValue(d?.stock_on_hand_product_count)}
            description={
              d?.stock_on_hand_product_count != null
                ? `${d.low_stock_product_count ?? "—"} low · ${d.out_of_stock_product_count ?? "—"} out`
                : "Stock snapshot not uploaded yet"
            }
            icon={<Package className="size-5" />}
          />
          <MetricCard
            title="Receivables"
            value={exactValue(d?.open_receivables_ugx, money)}
            description={
              d ? "Receivables not synchronized yet" : pendingDescription
            }
            icon={<UserRound className="size-5" />}
          />
          <MetricCard
            title="Supplier Payables"
            value={exactValue(d?.open_payables_ugx, money)}
            description={
              d ? "Payables not synchronized yet" : pendingDescription
            }
            icon={<ClipboardList className="size-5" />}
          />
        </section>
        <section>
          <Card className="mt-4">
            <CardContent className="grid gap-4 px-4 md:grid-cols-4 md:items-end">
              <DateRangePicker
                id="dashboard-overview-date-range"
                label="Date range (UTC)"
                from={from}
                to={to}
                onRangeChange={(nextFrom, nextTo) => {
                  setFrom(nextFrom);
                  setTo(nextTo);
                }}
              />
              <div className="grid gap-2">
                <Label>Observation window</Label>
                <Select value={windowDays} onValueChange={selectWindow}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="7">Last 7 UTC days</SelectItem>
                    <SelectItem value="30">Last 30 UTC days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button
                  className="h-11 w-full md:w-auto"
                  onClick={() => {
                    setLoading(true);
                    setAppliedPeriod({ from, to });
                  }}
                  disabled={loading || !from || !to}
                >
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Apply period
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1.7fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>Latest completed sales</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {d ? (
                d.recent_sales.length ? (
                  d.recent_sales.map((x) => (
                    <button
                      key={x.id}
                      onClick={() => setSale(x)}
                      className="flex w-full justify-between rounded-xl border p-4 text-left"
                      type="button"
                    >
                      <span>
                        <b>{x.sale_number}</b>
                        <span className="block text-sm text-muted-foreground">
                          {x.customer} · {x.cashier}
                        </span>
                      </span>
                      <b>{money(x.total_amount_ugx)}</b>
                    </button>
                  ))
                ) : (
                  <Empty title="Sales transactions have not been synchronized yet" />
                )
              ) : (
                <Empty title={pendingDescription} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Financial Snapshot</CardTitle>
              <CardDescription>
                Recorded payment behaviour, not cash flow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {d ? (
                d.payment_methods.length ? (
                  d.payment_methods.map((x) => (
                    <div key={x.payment_method}>
                      <div className="flex justify-between text-sm">
                        <span>{x.payment_method}</span>
                        <span>{money(x.total_amount_ugx)}</span>
                      </div>
                      <Progress
                        value={x.share_basis_points / 100}
                        className="mt-2 h-2"
                      />
                    </div>
                  ))
                ) : (
                  <Empty title="Waiting for payments data" />
                )
              ) : (
                <Empty title={pendingDescription} />
              )}
              <Separator />
              <p>
                Average transaction:{" "}
                {!d || d.average_transaction_ugx == null
                  ? "Unavailable"
                  : money(d.average_transaction_ugx)}
              </p>
              <p>Peak hour: {d?.peak_hour_utc ?? "Unavailable"}</p>
              <p>
                Weekly revenue:{" "}
                {exactValue(d?.weekly_completed_sales_ugx, money)}
                {d
                  ? ` · ${d.weekly_period_start_utc} to ${d.weekly_period_end_utc} UTC`
                  : ""}
              </p>
              <p>
                Monthly revenue:{" "}
                {exactValue(d?.monthly_completed_sales_ugx, money)}
                {d
                  ? ` · ${d.monthly_period_start_utc} to ${d.monthly_period_end_utc} UTC`
                  : ""}
              </p>
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              {d ? (
                d.top_products.length ? (
                  d.top_products.map((x) => (
                    <div key={x.product_id} className="mb-3">
                      <div className="flex justify-between">
                        <span>{x.product_name}</span>
                        <b>{money(x.revenue_ugx)}</b>
                      </div>
                      <Progress
                        value={x.share_basis_points / 100}
                        className="mt-2 h-1.5"
                      />
                    </div>
                  ))
                ) : (
                  <Empty title="No items sold yet" />
                )
              ) : (
                <Empty title={pendingDescription} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
            </CardHeader>
            <CardContent>
              {d ? (
                d.staff_performance.length ? (
                  d.staff_performance.map((x) => (
                    <div
                      key={x.staff_id}
                      className="mb-2 rounded-xl border p-3"
                    >
                      {x.staff_name}
                      <span className="float-right">
                        {money(x.revenue_ugx)}
                      </span>
                    </div>
                  ))
                ) : (
                  <Empty title="No attributed staff activity" />
                )
              ) : (
                <Empty title={pendingDescription} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Business Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p>{exactValue(d?.low_stock_product_count)} low-stock products</p>
              <p>
                {exactValue(d?.out_of_stock_product_count)} out-of-stock
                products
              </p>
              <p>
                {exactValue(d?.open_payables_ugx, money)} supplier payable
                balance
              </p>
              <p className="text-sm text-muted-foreground">
                Peak activity unavailable until a backend grouping is supplied.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>
      <Dialog open={!!sale} onOpenChange={() => setSale(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{sale?.sale_number}</DialogTitle>
            <DialogDescription>
              Structured completed-sale summary
            </DialogDescription>
          </DialogHeader>
          <p>{sale && money(sale.total_amount_ugx)}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
