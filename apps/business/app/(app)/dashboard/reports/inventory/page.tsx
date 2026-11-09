"use client";

import { useMemo, useState } from "react";
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
  type InventoryMovement,
  type InventoryStockOnHand,
  type InventoryValuationRow,
  useReportsInventoryData,
} from "@/components/akilibiz/reports/reports-inventory-data";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type StockRow = {
  product: string;
  category: string;
  quantity: number;
  reorder: number;
  status: string;
  source: InventoryStockOnHand;
} & TableData;
type MoveRow = {
  date: string;
  type: string;
  movement: number;
  balance: number;
  reversal: string;
  source: InventoryMovement;
} & TableData;
type ValueRow = {
  product: string;
  quantity: number;
  cost: number | null;
  value: number | null;
  exception: string;
  source: InventoryValuationRow;
} & TableData;
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
  const {
    stockOnHand,
    movements,
    valuation,
    valuationSummary,
    getInventoryStockOnHand,
    getInventoryMovementHistory,
    getInventoryValuationSummary,
    getInventoryProductDrillDown,
  } = useReportsInventoryData();
  const [tab, setTab] = useState("stock");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const stock = useMemo<StockRow[]>(
    () =>
      stockOnHand.map((source) => ({
        id: source.product_id,
        product: source.product_name,
        category: source.category_name,
        quantity: source.quantity_on_hand_milli,
        reorder: source.reorder_level_milli,
        status: source.stock_status,
        source,
      })),
    [stockOnHand],
  );
  const moves = useMemo<MoveRow[]>(
    () =>
      movements
        .filter(
          (movement) =>
            (!from || movement.movement_date_utc >= from) &&
            (!to || movement.movement_date_utc <= to),
        )
        .map((source) => ({
          id: source.id,
          date: source.movement_date_utc,
          type: source.movement_type,
          movement: source.signed_quantity_milli,
          balance: source.running_balance_milli,
          reversal: source.reversal_status,
          source,
        })),
    [from, movements, to],
  );
  const values = useMemo<ValueRow[]>(
    () =>
      valuation.map((source) => ({
        id: source.product_id,
        product: source.product_name,
        quantity: source.quantity_milli,
        cost: source.weighted_average_cost_ugx,
        value: source.value_ugx,
        exception: source.exception ?? "Unvalued",
        source,
      })),
    [valuation],
  );
  const stockFields: TableField<StockRow>[] = [
    { key: "product", header: "Product" },
    { key: "category", header: "Category" },
    {
      key: "quantity",
      header: "On hand",
      align: "right",
      cell: (value) => qty(Number(value)),
    },
    {
      key: "reorder",
      header: "Reorder",
      align: "right",
      cell: (value) => qty(Number(value)),
    },
    {
      key: "status",
      header: "Status",
      cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
  ];
  const moveFields: TableField<MoveRow>[] = [
    { key: "date", header: "UTC date" },
    { key: "type", header: "Type" },
    {
      key: "movement",
      header: "Signed movement",
      align: "right",
      cell: (value) => qty(Number(value)),
    },
    {
      key: "balance",
      header: "Running balance",
      align: "right",
      cell: (value) => qty(Number(value)),
    },
    {
      key: "reversal",
      header: "Reversal",
      cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
  ];
  const valueFields: TableField<ValueRow>[] = [
    { key: "product", header: "Product" },
    {
      key: "quantity",
      header: "Quantity",
      align: "right",
      cell: (value) => qty(Number(value)),
    },
    {
      key: "cost",
      header: "Weighted avg.",
      align: "right",
      cell: (value) => (value === null ? "Unvalued" : ugx(Number(value))),
    },
    {
      key: "value",
      header: "Value",
      align: "right",
      cell: (value) => (value === null ? "Unvalued" : ugx(Number(value))),
    },
    { key: "exception", header: "Exception" },
  ];
  const open = (id: number) => setSelected(id);
  const refresh = () => {
    if (tab === "stock") void getInventoryStockOnHand();
    else if (tab === "movements") void getInventoryMovementHistory();
    else void getInventoryValuationSummary();
  };
  const productDetail =
    selected === null
      ? null
      : (stockOnHand.find((row) => row.product_id === selected)?.product ??
        null);
  const action = (getId: (row: any) => number): TableAction<any>[] => [
    {
      type: "view",
      label: "View product position",
      onClick: (row) => open(getId(row)),
    },
  ];
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold">Inventory Reports</h2>
            <p className="text-sm text-muted-foreground">
              Stock, movement and valuation information for your inventory.
            </p>
          </div>
          <Tabs value={tab} onValueChange={setTab}>
            <div className="min-w-0 overflow-x-auto pb-1" aria-label="Inventory report sections">
              <TabsList className="h-auto min-w-max justify-start gap-1 rounded-full bg-card p-1.5">
                <TabsTrigger value="stock">Stock Overview</TabsTrigger>
                <TabsTrigger value="movements">Movements</TabsTrigger>
                <TabsTrigger value="valuation">Valuation</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="stock">
              <section className="mb-4 grid gap-4 md:grid-cols-2">
                <MetricCard
                  title="Products shown"
                  value="—"
                  description="On-hand stock in current register"
                  icon={<Eye className="size-5" />}
                />
                <MetricCard
                  title="Low or out of stock"
                  value="—"
                  description="Current stock status"
                  icon={<Eye className="size-5" />}
                />
              </section>
              <Card>
                <CardContent>
                  <DataTable<StockRow>
                    data={stock}
                    fields={stockFields}
                    title="Stock on hand"
                    actions={action((row: StockRow) => row.source.product_id)}
                    onRowClick={(row) => open(row.source.product_id)}
                    toolbarActions={
                      <Button variant="outline" onClick={refresh} size="icon" aria-label="Refresh" title="Refresh" disabled>
                        <RefreshCw className="size-4" />
                        
                      </Button>
                    }
                    enableSelection={false}
                    enableGlobalSearch
                    enableSorting={false}
                    loading={false}
                    emptyMessage="Inventory reporting is unavailable until verified stock data is connected."
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
                      disabled={!draftFrom || !draftTo}>
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
                      }}>
                      Clear period
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <DataTable<MoveRow>
                    data={moves}
                    fields={moveFields}
                    title="Movement history"
                    actions={action((row: MoveRow) => row.source.product_id)}
                    onRowClick={(row) => open(row.source.product_id)}
                    toolbarActions={
                      <Button variant="outline" onClick={refresh} size="icon" aria-label="Refresh" title="Refresh" disabled>
                        <RefreshCw className="size-4" />
                        
                      </Button>
                    }
                    enableSelection={false}
                    enableGlobalSearch
                    enableSorting={false}
                    loading={false}
                    emptyMessage="Stock movement reporting is unavailable until the hosted movement ledger is connected."
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="valuation">
              <section className="mb-4 grid gap-4 md:grid-cols-2">
                <MetricCard
                  title="Valuation total"
                  value={valuationSummary ? ugx(valuationSummary.total_value_ugx) : "—"}
                  description="Valued stock"
                  icon={<Eye className="size-5" />}
                />
                <MetricCard
                  title="Unvalued stock"
                  value={valuationSummary ? String(valuationSummary.unvalued_stock_count) : "—"}
                  description="Stock without a current value"
                  icon={<Eye className="size-5" />}
                />
              </section>
              <Card>
                <CardContent>
                  <DataTable<ValueRow>
                    data={values}
                    fields={valueFields}
                    title="Current valuation"
                    actions={action((row: ValueRow) => row.source.product_id)}
                    onRowClick={(row) => open(row.source.product_id)}
                    toolbarActions={
                      <Button variant="outline" onClick={refresh} size="icon" aria-label="Refresh" title="Refresh" disabled>
                        <RefreshCw className="size-4" />
                        
                      </Button>
                    }
                    enableSelection={false}
                    enableGlobalSearch
                    enableSorting={false}
                    loading={false}
                    emptyMessage="Inventory valuation is unavailable until verified costing data is connected."
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Dialog
        open={selected !== null}
        onOpenChange={(openDialog) => !openDialog && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product position</DialogTitle>
            <DialogDescription>
              Review current stock, movements, and valuation information.
            </DialogDescription>
          </DialogHeader>
          {productDetail ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <span className="text-muted-foreground">Product</span>
              <span>{productDetail.product_name}</span>
              <span className="text-muted-foreground">SKU</span>
              <span>{productDetail.sku}</span>
              <span className="text-muted-foreground">Category</span>
              <span>{productDetail.category_name}</span>
              <span className="text-muted-foreground">On hand</span>
              <span>
                {productDetail.quantity_on_hand} {productDetail.stock_unit}
              </span>
              <span className="text-muted-foreground">Reorder level</span>
              <span>
                {productDetail.min_stock_level} {productDetail.stock_unit}
              </span>
              <span className="text-muted-foreground">Stock value</span>
              <span>
                {productDetail.inventory_cost_value === null
                  ? "Unvalued"
                  : ugx(productDetail.inventory_cost_value)}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Product detail is unavailable.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
