"use client";

import * as React from "react";

import Link from "next/link";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  AlertCircle,
  ChartLine,
  CreditCard,
  Loader2,
  Package,
  Users,
} from "lucide-react";
import {
  DataTable,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import MetricCard from "@/components/akilibiz/metric-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DateRangePicker } from "@/components/akilibiz/date-range-picker";
import {
  type CustomerBehaviourSummary,
  type PaymentMethodAnalytics,
  type ProductAssociation,
  type ProductVelocity,
  type SalesTrend,
  type StockOutRisk,
  type StockOutRiskSummary,
  type TopCustomer,
} from "@/components/akilibiz/analytics/analytics-data";
import { getAnalyticsData } from "@/components/akilibiz/analytics/analytics-data";

type Granularity = "daily" | "weekly" | "monthly";
type AppliedFilters = { from: string; to: string; granularity: Granularity };
type TrendRow = TableData & { period: string; sales: number; orders: number };
type CustomerRow = TableData & TopCustomer;
type VelocityRow = TableData & ProductVelocity;
type RiskRow = TableData & StockOutRisk;
type PaymentRow = TableData & PaymentMethodAnalytics;
type AssociationRow = TableData & ProductAssociation;

const chartConfig = {
  sales: { label: "Completed sales", color: "var(--chart-1)" },
} satisfies ChartConfig;

const todayUtc = () => new Date().toISOString().slice(0, 10);
const dateBefore = (to: string, days: number) => {
  const date = new Date(`${to}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date.toISOString().slice(0, 10);
};
const formatUgx = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(value);
const formatQuantity = (milli: number) =>
  new Intl.NumberFormat("en-UG", { maximumFractionDigits: 3 }).format(
    milli / 1000,
  );
const formatPeriodDate = (isoDate: string) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
};
const periodLabel = (filters: AppliedFilters) =>
  `${formatPeriodDate(filters.from)} – ${formatPeriodDate(filters.to)} (UTC)`;

const tableOptions = {
  enableSelection: false,
  enableSorting: false,
  enableGlobalSearch: true,
  enableColumnVisibility: false,
  enableDragDrop: false,
  enableExport: false,
  enablePagination: true,
  pageSize: 5,
  pageSizeOptions: [5, 10, 20],
};

export default function AnalyticsPage() {
  const initialTo = React.useMemo(() => todayUtc(), []);
  const [from, setFrom] = React.useState(() => dateBefore(initialTo, 30));
  const [to, setTo] = React.useState(initialTo);
  const [windowDays, setWindowDays] = React.useState("30");
  const [granularity, setGranularity] = React.useState<Granularity>("daily");
  const [filters, setFilters] = React.useState<AppliedFilters>({
    from: dateBefore(initialTo, 30),
    to: initialTo,
    granularity: "daily",
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [trend, setTrend] = React.useState<SalesTrend | null>(null);
  const [customers, setCustomers] =
    React.useState<CustomerBehaviourSummary | null>(null);
  const [topCustomers, setTopCustomers] = React.useState<TopCustomer[]>([]);
  const [velocity, setVelocity] = React.useState<ProductVelocity[]>([]);
  const [stockRisk, setStockRisk] = React.useState<StockOutRisk[]>([]);
  const [stockRiskSummary, setStockRiskSummary] =
    React.useState<StockOutRiskSummary | null>(null);
  const [payments, setPayments] = React.useState<PaymentMethodAnalytics[]>([]);
  const [associations, setAssociations] = React.useState<ProductAssociation[]>(
    [],
  );

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setTrend(null);
    setCustomers(null);
    setTopCustomers([]);
    setVelocity([]);
    setStockRisk([]);
    setStockRiskSummary(null);
    setPayments([]);
    setAssociations([]);
    const analyticsQuery = {
      date_from: filters.from,
      date_to: filters.to,
      granularity: filters.granularity,
    };
    const customerQuery = {
      date_from: filters.from,
      date_to: filters.to,
      skip: 0,
      limit: 100,
    };
    try {
      const [
        salesTrend,
        customerSummary,
        customerRows,
        velocityRows,
        riskReport,
        paymentRows,
        associationRows,
      ] = await Promise.all([
        getAnalyticsData().then((data) => data.salesTrend),
        getAnalyticsData().then((data) => data.customerSummary),
        getAnalyticsData().then((data) => data.customerRows),
        getAnalyticsData().then((data) => data.velocityRows),
        getAnalyticsData().then((data) => data.riskReport),
        getAnalyticsData().then((data) => data.paymentRows),
        getAnalyticsData().then((data) => data.associationRows),
      ]);
      setTrend(salesTrend);
      setCustomers(customerSummary);
      setTopCustomers(customerRows);
      setVelocity(velocityRows);
      setStockRisk(riskReport.rows);
      setStockRiskSummary(riskReport.summary);
      setPayments(paymentRows);
      setAssociations(associationRows);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Business Insights are unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const applyFilters = () => {
    setFilters({ from, to, granularity });
  };
  const selectTrendGranularity = (value: string) => {
    if (value !== "daily" && value !== "weekly" && value !== "monthly") return;

    const nextGranularity = value as Granularity;
    setGranularity(nextGranularity);
    setFilters((current) => ({ ...current, granularity: nextGranularity }));
  };
  const selectWindow = (value: string) => {
    setWindowDays(value);
    setFrom(dateBefore(to, Number(value)));
  };
  const selectDateRange = (nextFrom: string, nextTo: string) => {
    setFrom(nextFrom);
    setTo(nextTo);
  };

  const trendRows: TrendRow[] = (trend?.current ?? []).map((point) => ({
    id: point.period_utc,
    period: point.period_utc,
    sales: point.total_ugx,
    orders: point.transaction_count,
  }));
  const customerRows: CustomerRow[] = topCustomers.map((row) => ({
    id: row.customer_id,
    ...row,
  }));
  const velocityRows: VelocityRow[] = velocity.map((row) => ({
    id: row.product_id,
    ...row,
  }));
  const riskRows: RiskRow[] = stockRisk.map((row) => ({
    id: row.product_id,
    ...row,
  }));
  const paymentRows: PaymentRow[] = payments.map((row) => ({
    id: row.payment_method,
    ...row,
  }));
  const associationRows: AssociationRow[] = associations.map((row, index) => ({
    id: `${row.product_a_id}-${row.product_b_id}-${index}`,
    ...row,
  }));
  const topPayment = payments[0];

  const trendFields: TableField<TrendRow>[] = [
    { key: "period", header: "UTC period" },
    {
      key: "sales",
      header: "Completed sales",
      align: "right",
      cell: (value) => formatUgx(Number(value)),
    },
    { key: "orders", header: "Orders", align: "right" },
  ];
  const customerFields: TableField<CustomerRow>[] = [
    { key: "customer_reference", header: "Customer" },
    { key: "order_count", header: "Orders", align: "right" },
    {
      key: "sales_total_ugx",
      header: "Completed sales",
      align: "right",
      cell: (value) => formatUgx(Number(value)),
    },
    {
      key: "most_recent_completed_sale_date_utc",
      header: "Most recent UTC sale",
    },
  ];
  const velocityFields: TableField<VelocityRow>[] = [
    { key: "product_name", header: "Product" },
    {
      key: "quantity_milli",
      header: "Quantity sold",
      align: "right",
      cell: (value) => formatQuantity(Number(value)),
    },
    {
      key: "revenue_ugx",
      header: "Completed-sale value",
      align: "right",
      cell: (value) => formatUgx(Number(value)),
    },
    {
      key: "classification",
      header: "Status",
      cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
  ];
  const riskFields: TableField<RiskRow>[] = [
    { key: "product_name", header: "Product" },
    {
      key: "current_stock_milli",
      header: "On hand",
      align: "right",
      cell: (value) => formatQuantity(Number(value)),
    },
    {
      key: "sold_quantity_milli",
      header: "Sold",
      align: "right",
      cell: (value) => formatQuantity(Number(value)),
    },
    {
      key: "estimated_days_remaining",
      header: "Estimated days",
      align: "right",
      cell: (value) => (value === null ? "Unavailable" : String(value)),
    },
    {
      key: "confidence",
      header: "Status",
      cell: (value) => (
        <Badge variant="outline">{String(value).replaceAll("_", " ")}</Badge>
      ),
    },
  ];
  const paymentFields: TableField<PaymentRow>[] = [
    { key: "payment_method", header: "Payment method" },
    { key: "payment_count", header: "Recorded payments", align: "right" },
    {
      key: "total_amount_ugx",
      header: "Recorded amount",
      align: "right",
      cell: (value) => formatUgx(Number(value)),
    },
    {
      key: "status",
      header: "Status",
      cell: (value) => (
        <Badge variant="outline">{String(value).replaceAll("_", " ")}</Badge>
      ),
    },
  ];
  const associationFields: TableField<AssociationRow>[] = [
    {
      key: "product_a_name",
      header: "Product A",
      cell: (value) => String(value) || "—",
    },
    {
      key: "product_b_name",
      header: "Product B",
      cell: (value) => String(value) || "—",
    },
    {
      key: "copurchase_order_count",
      header: "Co-purchase orders",
      align: "right",
    },
    {
      key: "support_basis_points",
      header: "Support",
      align: "right",
      cell: (value) => `${String(value)} bp`,
    },
    {
      key: "status",
      header: "Status",
      cell: (value) => (
        <Badge variant="outline">{String(value).replaceAll("_", " ")}</Badge>
      ),
    },
  ];

  return (
    <>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold">Business Insights</h2>
            <p className="text-sm text-muted-foreground">
              Sales performance and business activity.
            </p>
          </div>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-5">
            <MetricCard
              title="Selected-period sales"
              value={
                customers
                  ? formatUgx(customers.completed_sales_total_ugx)
                  : loading
                    ? "—"
                    : "Unavailable"
              }
              description={
                customers
                  ? `${customers.completed_order_count} completed orders · ${periodLabel(filters)}`
                  : loading
                    ? "Loading backend summary"
                    : "Backend summary unavailable"
              }
              icon={<ChartLine className="size-5" />}
            />
            <MetricCard
              title="Period comparison"
              value={
                trend
                  ? formatUgx(trend.absolute_change_ugx)
                  : loading
                    ? "—"
                    : "Unavailable"
              }
              description={
                !trend
                  ? loading
                    ? "Loading backend comparison"
                    : "Backend comparison unavailable"
                  : trend.percentage_change_basis_points === null
                    ? "Prior equivalent period has no sales"
                    : `${trend.percentage_change_basis_points} basis points vs prior equivalent period`
              }
              icon={<ChartLine className="size-5" />}
            />
            <MetricCard
              title="Customer behaviour"
              value={
                customers
                  ? String(customers.completed_customer_count)
                  : loading
                    ? "—"
                    : "Unavailable"
              }
              description={
                customers
                  ? `${customers.returning_customer_count} returning customers in selected UTC period`
                  : loading
                    ? "Loading backend summary"
                    : "Backend summary unavailable"
              }
              icon={<Users className="size-5" />}
            />
            <MetricCard
              title="Payment methods"
              value={topPayment?.payment_method ?? "Unavailable"}
              description={
                topPayment
                  ? `${formatUgx(topPayment.total_amount_ugx)} · ${topPayment.status.replaceAll("_", " ")}`
                  : "No recorded completed-sale payments"
              }
              icon={<CreditCard className="size-5" />}
            />
            <MetricCard
              title="Stock-out risk"
              value={
                stockRiskSummary
                  ? String(stockRiskSummary.out_of_stock_product_count)
                  : loading
                    ? "—"
                    : "Unavailable"
              }
              description={
                stockRiskSummary
                  ? `${stockRiskSummary.insufficient_data_product_count} insufficient-data products · ${stockRiskSummary.status.replaceAll("_", " ")}`
                  : loading
                    ? "Loading backend risk summary"
                    : "Backend risk summary unavailable"
              }
              icon={<Package className="size-5" />}
            />
          </section>

          <Card>
            <CardContent className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 md:items-end xl:grid-cols-4">
              <DateRangePicker
                id="analytics-date-range"
                label="Date range (UTC)"
                from={from}
                to={to}
                onRangeChange={selectDateRange}
                className="min-w-0 sm:col-span-2 xl:col-span-1"
              />
              <div className="grid min-w-0 gap-2">
                <Label>Observation window</Label>
                <Select value={windowDays} onValueChange={selectWindow}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 UTC days</SelectItem>
                    <SelectItem value="30">Last 30 UTC days</SelectItem>
                    <SelectItem value="90">Last 90 UTC days</SelectItem>
                    <SelectItem value="366">Last 366 UTC days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid min-w-0 gap-2">
                <Label>Trend grouping</Label>
                <Select
                  value={granularity}
                  onValueChange={selectTrendGranularity}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex min-w-0 sm:col-span-2 xl:col-span-1">
                <Button
                  onClick={applyFilters}
                  className="h-11 w-full sm:w-auto"
                  disabled={loading || !from || !to}
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                  Apply period
                </Button>
              </div>
            </CardContent>
          </Card>

          {error ? (
            <Card>
              <CardContent className="flex items-center gap-2 p-4 text-sm">
                <AlertCircle className="size-4 text-muted-foreground" />
                {error}
              </CardContent>
            </Card>
          ) : null}

          <Tabs defaultValue="sales-customers" className="min-w-0">
            <TabsList className="mb-4 h-auto w-full flex-wrap justify-start gap-1">
              <TabsTrigger value="sales-customers">
                Sales &amp; Customers
              </TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="payments-products">
                Payments &amp; Products
              </TabsTrigger>
            </TabsList>
            <TabsContent value="sales-customers" className="space-y-4">
              <Card className="@container/card">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold tracking-tight">
                    Sales Trend
                  </CardTitle>
                  <CardDescription>
                    Completed sales · {periodLabel(filters)}
                  </CardDescription>
                  <CardAction>
                    <ToggleGroup
                      type="single"
                      value={filters.granularity}
                      onValueChange={selectTrendGranularity}
                      variant="outline"
                      size="sm"
                      spacing={0}
                      className="hidden @[620px]/card:flex"
                      aria-label="Sales trend grouping"
                    >
                      <ToggleGroupItem value="daily">Daily</ToggleGroupItem>
                      <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
                      <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
                    </ToggleGroup>
                    <Select
                      value={filters.granularity}
                      onValueChange={selectTrendGranularity}
                    >
                      <SelectTrigger
                        className="w-28 @[620px]/card:hidden"
                        size="sm"
                        aria-label="Sales trend grouping"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardAction>
                </CardHeader>
                <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                  {loading ? (
                    <div className="flex h-[260px] items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="size-4 animate-spin" />
                      Loading completed sales trend…
                    </div>
                  ) : error ? (
                    <div className="flex h-[260px] items-center justify-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="size-4" />
                      The completed sales trend is unavailable for the selected
                      UTC period.
                    </div>
                  ) : trendRows.length ? (
                    <ChartContainer
                      config={chartConfig}
                      className="aspect-auto h-[260px] w-full"
                    >
                      <AreaChart accessibilityLayer data={trendRows}>
                        <defs>
                          <linearGradient
                            id="sales-trend-fill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--color-sales)"
                              stopOpacity={0.32}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--color-sales)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="period"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          minTickGap={32}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              indicator="line"
                              labelFormatter={(label) => String(label)}
                              formatter={(value, _name, item) => (
                                <div className="flex w-full items-center justify-between gap-4">
                                  <span>Completed sales</span>
                                  <span className="font-mono font-medium tabular-nums">
                                    {formatUgx(Number(value))}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {Number(item.payload.orders)} orders
                                  </span>
                                </div>
                              )}
                            />
                          }
                        />
                        <Area
                          dataKey="sales"
                          type="natural"
                          fill="url(#sales-trend-fill)"
                          stroke="var(--color-sales)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex h-[260px] items-center justify-center">
                      <p className="max-w-sm text-center text-sm text-muted-foreground">
                        No completed sales are available for the selected UTC
                        period. The trend requires completed-sale observations.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
                <Card>
                  <CardContent className="px-6 pb-6">
                    <DataTable<TrendRow>
                      title="Trend periods"
                      description={`Total completed sales for each ${filters.granularity} period, ${periodLabel(filters)}.`}
                      data={trendRows}
                      fields={trendFields}
                      emptyMessage="No completed-sale trend periods are available."
                      {...tableOptions}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="px-6 pb-6">
                    <DataTable<CustomerRow>
                      title="Top customers"
                      description={`Customers ranked by completed-order value, ${periodLabel(filters)}.`}
                      data={customerRows}
                      fields={customerFields}
                      emptyMessage="No completed customer sales are available for this period."
                      toolbarActions={
                        <Button asChild variant="outline" size="lg">
                          <Link href="/dashboard/reports/sales">
                            Open sales detail
                          </Link>
                        </Button>
                      }
                      {...tableOptions}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="inventory" className="space-y-4">
              <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
                <Card>
                  <CardContent className="px-6 pb-6">
                    <DataTable<VelocityRow>
                      title="Product velocity"
                      description={`How fast each product is selling, ${periodLabel(filters)}. Status compares it to your fastest-selling product.`}
                      data={velocityRows}
                      fields={velocityFields}
                      emptyMessage="No product velocity data is available for this period."
                      toolbarActions={
                        <Button asChild variant="outline" size="lg">
                          <Link href="/dashboard/reports/inventory">
                            Open inventory detail
                          </Link>
                        </Button>
                      }
                      {...tableOptions}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="px-6 pb-6">
                    <DataTable<RiskRow>
                      title="Stock-out risk"
                      description={`Estimated days of stock left based on sales pace, ${periodLabel(filters)}. "Unavailable" means there isn't enough sales history yet to estimate.`}
                      data={riskRows}
                      fields={riskFields}
                      emptyMessage="No stock-out risk rows are available for this period."
                      toolbarActions={
                        <Button asChild variant="outline" size="lg">
                          <Link href="/dashboard/reports/inventory">
                            Open inventory detail
                          </Link>
                        </Button>
                      }
                      {...tableOptions}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="payments-products" className="space-y-4">
              <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2">
                <Card>
                  <CardContent className="px-6 pb-6">
                    <DataTable<PaymentRow>
                      title="Payment methods"
                      description={`Payments recorded against completed sales, ${periodLabel(filters)}.`}
                      data={paymentRows}
                      fields={paymentFields}
                      emptyMessage="No recorded completed-sale payments are available for this period."
                      toolbarActions={
                        <Button asChild variant="outline" size="lg">
                          <Link href="/dashboard/reports/sales">
                            Open sales detail
                          </Link>
                        </Button>
                      }
                      {...tableOptions}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="px-6 pb-6">
                    <DataTable<AssociationRow>
                      title="Frequently bought together"
                      description={`Product pairs often bought in the same order, ${periodLabel(filters)}. Support shows how often that pairing happens, out of 10,000 orders.`}
                      data={associationRows}
                      fields={associationFields}
                      emptyMessage="No product associations are available for this period."
                      toolbarActions={
                        <Button asChild variant="outline" size="lg">
                          <Link href="/dashboard/reports/sales">
                            Open sales detail
                          </Link>
                        </Button>
                      }
                      {...tableOptions}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
