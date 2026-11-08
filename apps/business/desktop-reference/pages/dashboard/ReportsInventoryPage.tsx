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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getInventoryMovementHistory,
  getInventoryProductDrillDown,
  getInventoryStockOnHand,
  getInventoryValuationSummary,
  type InventoryMovement,
  type InventoryStockOnHand,
  type InventoryValuationRow,
} from "@/services/tauri/reports";
import { IconRefresh } from "@tabler/icons-react";
interface StockRow extends TableData {
  product: string;
  category: string;
  quantity: number;
  reorder: number;
  status: string;
  source: InventoryStockOnHand;
}
interface MoveRow extends TableData {
  date: string;
  type: string;
  movement: number;
  balance: number;
  reversal: string;
  source: InventoryMovement;
}
interface ValueRow extends TableData {
  product: string;
  quantity: number;
  cost: number | null;
  value: number | null;
  exception: string;
  source: InventoryValuationRow;
}
const qty = (value: number) =>
  new Intl.NumberFormat("en-UG", { maximumFractionDigits: 3 }).format(
    value / 1000,
  );
const ugx = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(value);
export default function ReportsInventoryPage() {
  const [tab, setTab] = React.useState("stock"),
    [stock, setStock] = React.useState<StockRow[]>([]),
    [moves, setMoves] = React.useState<MoveRow[]>([]),
    [values, setValues] = React.useState<ValueRow[]>([]),
    [total, setTotal] = React.useState(0),
    [unvalued, setUnvalued] = React.useState(0),
    [from, setFrom] = React.useState(""),
    [to, setTo] = React.useState(""),
    [draftFrom, setDraftFrom] = React.useState(""),
    [draftTo, setDraftTo] = React.useState(""),
    [loading, setLoading] = React.useState(false),
    [error, setError] = React.useState<string | null>(null),
    [selected, setSelected] = React.useState<number | null>(null),
    [detail, setDetail] = React.useState<Record<string, unknown> | null>(null);
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "stock") {
        const r = await getInventoryStockOnHand({ skip: 0, limit: 100 });
        setStock(
          r.map((source) => ({
            id: source.product_id,
            product: source.product_name,
            category: source.category_name,
            quantity: source.quantity_on_hand_milli,
            reorder: source.reorder_level_milli,
            status: source.stock_status,
            source,
          })),
        );
      } else if (tab === "movements") {
        const r = await getInventoryMovementHistory({
          date_from: from || undefined,
          date_to: to || undefined,
          skip: 0,
          limit: 100,
        });
        setMoves(
          r.map((source) => ({
            id: source.id,
            date: source.movement_date_utc,
            type: source.movement_type,
            movement: source.signed_quantity_milli,
            balance: source.running_balance_milli,
            reversal: source.reversal_status,
            source,
          })),
        );
      } else {
        const r = await getInventoryValuationSummary();
        setTotal(r.total_value_ugx);
        setUnvalued(r.unvalued_stock_count);
        setValues(
          r.rows.map((source) => ({
            id: source.product_id,
            product: source.product_name,
            quantity: source.quantity_milli,
            cost: source.weighted_average_cost_ugx,
            value: source.value_ugx,
            exception: source.exception ?? "Unvalued",
            source,
          })),
        );
      }
    } catch (c) {
      setError(
        c instanceof Error ? c.message : "Inventory report unavailable.",
      );
    } finally {
      setLoading(false);
    }
  }, [tab, from, to]);
  React.useEffect(() => {
    void load();
  }, [load]);
  const open = async (id: number) => {
    setSelected(id);
    setDetail(null);
    try {
      setDetail(await getInventoryProductDrillDown(id));
    } catch (c) {
      setError(c instanceof Error ? c.message : "Product detail unavailable.");
    }
  };
  const stockFields: TableField<StockRow>[] = [
    { key: "product", header: "Product" },
    { key: "category", header: "Category" },
    {
      key: "quantity",
      header: "On hand",
      align: "right",
      cell: (v) => qty(Number(v)),
    },
    {
      key: "reorder",
      header: "Reorder",
      align: "right",
      cell: (v) => qty(Number(v)),
    },
    {
      key: "status",
      header: "Status",
      cell: (v) => <Badge variant="outline">{String(v)}</Badge>,
    },
  ];
  const moveFields: TableField<MoveRow>[] = [
    { key: "date", header: "UTC date" },
    { key: "type", header: "Type" },
    {
      key: "movement",
      header: "Signed movement",
      align: "right",
      cell: (v) => qty(Number(v)),
    },
    {
      key: "balance",
      header: "Running balance",
      align: "right",
      cell: (v) => qty(Number(v)),
    },
    {
      key: "reversal",
      header: "Reversal",
      cell: (v) => <Badge variant="outline">{String(v)}</Badge>,
    },
  ];
  const valueFields: TableField<ValueRow>[] = [
    { key: "product", header: "Product" },
    {
      key: "quantity",
      header: "Quantity",
      align: "right",
      cell: (v) => qty(Number(v)),
    },
    {
      key: "cost",
      header: "Weighted avg.",
      align: "right",
      cell: (v) => (v === null ? "Unvalued" : ugx(Number(v))),
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      cell: (v) => (v === null ? "Unvalued" : ugx(Number(v))),
    },
    { key: "exception", header: "Exception" },
  ];
  return (
    <>
      <SiteHeader label="Inventory Reports" />
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-6 md:px-6">
          <div>
            <h2 className="text-2xl font-semibold">Inventory Reports</h2>
            <p className="text-sm text-muted-foreground">
              Read-only stock, movement and report-only valuation data.
            </p>
          </div>
          {error && (
            <Card className="border-destructive/40">
              <CardContent className="p-4 text-sm text-destructive">
                {error}
              </CardContent>
            </Card>
          )}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="stock">Stock Overview</TabsTrigger>
              <TabsTrigger value="movements">Movements</TabsTrigger>
              <TabsTrigger value="valuation">Valuation</TabsTrigger>
            </TabsList>
            <TabsContent value="stock">
              <section className="mb-4 grid gap-4 md:grid-cols-2">
                <MetricCard
                  title="Products shown"
                  value={String(stock.length)}
                  description="On-hand stock in returned register"
                  icon={<Eye className="size-5" />}
                />
                <MetricCard
                  title="Low or out of stock"
                  value={String(
                    stock.filter((x) => x.status !== "in_stock").length,
                  )}
                  description="Explicit stock status"
                  icon={<Eye className="size-5" />}
                />
              </section>
              <Card>
                <CardContent>
                  <DataTable
                    data={stock}
                    fields={stockFields}
                    title="Stock on hand"
                    actions={[
                      {
                        type: "view",
                        label: "View product position",
                        onClick: (r) => open(r.source.product_id),
                      },
                    ]}
                    onRowClick={(r) => open(r.source.product_id)}
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
                    emptyMessage="No stock records are available."
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="movements">
              <Card className="mb-4">
                <CardContent className="grid gap-4 px-4 md:grid-cols-4 md:items-end">
                  <DateRangePicker
                    id="inventory-movements-date-range"
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
                    id="inventory-movements-period"
                    selectedEndDate={draftTo}
                    onRangeChange={(nextFrom, nextTo) => {
                      setDraftFrom(nextFrom);
                      setDraftTo(nextTo);
                    }}
                  />
                  <div className="flex gap-2 md:col-span-2">
                    <Button
                      className="h-11 w-full md:w-auto"
                      onClick={() => {
                        setFrom(draftFrom);
                        setTo(draftTo);
                      }}
                      disabled={loading || !draftFrom || !draftTo}>
                      {loading && (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      )}
                      Apply period
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-11"
                      onClick={() => {
                        setDraftFrom("");
                        setDraftTo("");
                        setFrom("");
                        setTo("");
                      }}
                      disabled={loading}>
                      Clear period
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <DataTable
                    data={moves}
                    fields={moveFields}
                    title="Movement history"
                    actions={[
                      {
                        type: "view",
                        label: "View product position",
                        onClick: (r) => open(r.source.product_id),
                      },
                    ]}
                    onRowClick={(r) => open(r.source.product_id)}
                    toolbarActions={
                      <Button
                        variant="outline"
                        onClick={() => void load()}
                        disabled={loading}>
                        <IconRefresh className="size-4" />
                        Refresh
                      </Button>
                    }
                    enableSelection={false}
                    enableGlobalSearch={true}
                    enableSorting={false}
                    loading={loading}
                    emptyMessage="No movements match the selected UTC period."
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="valuation">
              <section className="mb-4 grid gap-4 md:grid-cols-2">
                <MetricCard
                  title="Valuation total"
                  value={ugx(total)}
                  description="Representable valued stock only"
                  icon={<Eye className="size-5" />}
                />
                <MetricCard
                  title="Unvalued stock"
                  value={String(unvalued)}
                  description="No historic value is invented"
                  icon={<Eye className="size-5" />}
                />
              </section>
              <Card>
                <CardContent>
                  <DataTable
                    data={values}
                    fields={valueFields}
                    title="Authoritative current valuation"
                    actions={[
                      {
                        type: "view",
                        label: "View product position",
                        onClick: (r) => open(r.source.product_id),
                      },
                    ]}
                    onRowClick={(r) => open(r.source.product_id)}
                    toolbarActions={
                      <Button
                        variant="outline"
                        onClick={() => void load()}
                        disabled={loading}>
                        <IconRefresh className="size-4" />
                        Refresh
                      </Button>
                    }
                    enableSelection={false}
                    enableGlobalSearch={true}
                    enableSorting={false}
                    loading={loading}
                    emptyMessage="No in-stock products require valuation."
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Dialog
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product position</DialogTitle>
            <DialogDescription>
              Current stock, persisted movements, and valuation or unvalued
              reason.
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(detail, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              Loading or unavailable.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
