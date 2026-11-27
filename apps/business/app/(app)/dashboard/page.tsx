"use client";

import * as React from "react";
import {
  Banknote,
  CircleAlert,
  Inbox,
  Info,
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

import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
const money = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(value);
const Empty = ({ title, kind = "empty" }: { title: string; kind?: "empty" | "info" | "error" }) => {
  const Icon = kind === "error" ? CircleAlert : kind === "info" ? Info : Inbox;
  return (
    <div role={kind === "error" ? "alert" : "status"} className="flex min-h-28 w-full min-w-0 flex-col items-center justify-center gap-2 px-4 py-5 text-center">
      <span aria-hidden="true" className={`mb-2 inline-flex size-11 items-center justify-center rounded-2xl border bg-muted ${kind === "error" ? "text-destructive" : "text-primary"}`}>
        <Icon className="size-5" />
      </span>
      <h3 className="max-w-lg text-sm font-semibold text-foreground sm:text-base">{title}</h3>
    </div>
  );
};
const dateBefore = (to: string, days: number) => {
  const date = new Date(`${to}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date.toISOString().slice(0, 10);
};

export default function DashboardPage() {
  const { t } = useI18n();
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
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      // A new date range must not retain old-business-period figures while
      // loading, or show stale figures if the new request fails.
      setLoading(true); setError(null); setD(null);
      void getDashboardOverview({
      date_from: appliedPeriod.from,
      date_to: appliedPeriod.to,
    })
      .then((result) => { if (active) setD(result); })
      .catch((cause) => {
        if (active) {
          setD(null);
          setError(cause instanceof Error ? cause.message : "Dashboard data is unavailable.");
        }
      })
        .finally(() => { if (active) setLoading(false); });
    });
    return () => { active = false; };
  }, [appliedPeriod]);
  const pendingValue = loading ? "—" : "Unavailable";
  const pendingDescription = loading
    ? "Loading business data"
    : (error ?? "Business data unavailable");
  const pendingKind = error ? "error" : "info";
  const exactValue = (
    value: number | null | undefined,
    formatter: (value: number) => string = String,
  ) => (value == null ? pendingValue : formatter(value));
  const selectWindow = (value: string) => {
    setWindowDays(value);
    if (value === "custom") return;
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
            {t("dashboard.overview")}
          </h2>
          <p className="text-sm text-muted-foreground">
            UTC period: {d?.date_from_utc ?? appliedPeriod.from} {t("dashboard.periodTo")}{" "}
            {d?.date_to_utc ?? appliedPeriod.to}.
          </p>
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title={t("dashboard.completedSales")}
            value={exactValue(d?.completed_sales_total_ugx, money)}
            description={
              d
                ? d.completed_sales_total_ugx == null
                  ? "Completed sales data unavailable"
                  : `${d.completed_order_count} completed sales`
                : pendingDescription
            }
            icon={<Banknote className="size-5" />}
          />
          <MetricCard
            title="Net Profit"
            value={pendingValue}
            description={d ? "Profit data unavailable" : pendingDescription}
            icon={<ReceiptText className="size-5" />}
          />
          <MetricCard
            title={t("dashboard.verifiedInventory")}
            value={
              d?.inventory_value_ugx == null
                ? pendingValue
                : money(d.inventory_value_ugx)
            }
            description={
              d
                ? d.inventory_unvalued_count > 0
                  ? `${d.inventory_unvalued_count} items missing cost records`
                  : "Based on recorded costs"
                : pendingDescription
            }
            icon={<Package className="size-5" />}
          />
          <MetricCard
            title={t("dashboard.customers")}
            value={exactValue(d?.customers_count)}
            description={d ? "Customer records" : pendingDescription}
            icon={<Users className="size-5" />}
          />
        </section>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title={t("nav.suppliers")}
            value={exactValue(d?.suppliers_count)}
            description={d ? "Supplier records" : pendingDescription}
            icon={<Truck className="size-5" />}
          />
          <MetricCard
            title={t("dashboard.productsInStock")}
            value={exactValue(d?.stock_on_hand_product_count)}
            description={
              d?.stock_on_hand_product_count != null
                ? `${d.low_stock_product_count ?? "—"} low · ${d.out_of_stock_product_count ?? "—"} out`
                : pendingDescription
            }
            icon={<Package className="size-5" />}
          />
          <MetricCard
            title={t("dashboard.receivables")}
            value={exactValue(d?.open_receivables_ugx, money)}
            description={
              d ? "Outstanding customer balances unavailable" : pendingDescription
            }
            icon={<UserRound className="size-5" />}
          />
          <MetricCard
            title="Supplier payables"
            value={exactValue(d?.open_payables_ugx, money)}
            description={
              d ? "Outstanding supplier balances unavailable" : pendingDescription
            }
            icon={<ClipboardList className="size-5" />}
          />
        </section>
        <section>
          <Card className="mt-4">
            <CardContent className="grid gap-4 px-4 md:grid-cols-4 md:items-end">
              <DateRangePicker
                id="dashboard-overview-date-range"
                label={t("dashboard.dateRange")}
                from={from}
                to={to}
                onRangeChange={(nextFrom, nextTo) => {
                  setFrom(nextFrom);
                  setTo(nextTo);
                  setWindowDays("custom");
                }}
                numberOfMonths={1}
              />
              <div className="grid gap-2">
                <Label>{t("dashboard.observationWindow")}</Label>
                <Select value={windowDays} onValueChange={selectWindow}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">{t("dashboard.customRange")}</SelectItem>
                    <SelectItem value="today">{t("dashboard.today")}</SelectItem>
                    <SelectItem value="7">{t("dashboard.last7")}</SelectItem>
                    <SelectItem value="30">{t("dashboard.last30")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button
                  className="h-11 w-full md:w-auto"
                  onClick={() => setAppliedPeriod({ from, to })}
                  disabled={loading || !from || !to || from > to}
                >
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {t("dashboard.applyPeriod")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-[1.7fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.recentSales")}</CardTitle>
              <CardDescription>{t("dashboard.latestCompleted")}</CardDescription>
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
                  <Empty title="No completed sales for this period" />
                )
              ) : (
                <Empty kind={pendingKind} title={pendingDescription} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.financialSnapshot")}</CardTitle>
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
                  <Empty title="No payment records for this period" />
                )
              ) : (
                <Empty kind={pendingKind} title={pendingDescription} />
              )}
              <Separator />
              <p>
                {t("dashboard.averageTransaction")}{" "}
                {!d || d.average_transaction_ugx == null
                  ? pendingValue
                  : money(d.average_transaction_ugx)}
              </p>
              <p>{t("dashboard.peakHour")} {d?.peak_hour_utc ?? t("dashboard.unavailable")}</p>
              <p>
                {t("dashboard.weeklyRevenue")}{" "}
                {exactValue(d?.weekly_completed_sales_ugx, money)}
                {d
                  ? ` · ${d.weekly_period_start_utc} to ${d.weekly_period_end_utc} UTC`
                  : ""}
              </p>
              <p>
                {t("dashboard.monthlyRevenue")}{" "}
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
              <CardTitle>{t("dashboard.topProducts")}</CardTitle>
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
                  <Empty title={t("dashboard.noProductsSold")} />
                )
              ) : (
                <Empty kind={pendingKind} title={pendingDescription} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.staffPerformance")}</CardTitle>
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
                  <Empty title="No staff sales activity" />
                )
              ) : (
                <Empty kind={pendingKind} title={pendingDescription} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.businessAlerts")}</CardTitle>
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
                {d?.peak_hour_utc
                  ? `Busiest hour: ${d.peak_hour_utc}`
                  : "No sales activity recorded for this period"}
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
              Completed sale summary
            </DialogDescription>
          </DialogHeader>
          <p>{sale && money(sale.total_amount_ugx)}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
