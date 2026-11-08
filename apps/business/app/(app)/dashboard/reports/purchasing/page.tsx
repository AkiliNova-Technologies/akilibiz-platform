"use client";

import { useMemo, useState } from "react";
import { Eye, ReceiptText, RefreshCw, Truck } from "lucide-react";
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
  type GoodsReceivedRegisterRow,
  useReportsPurchasingData,
} from "@/components/akilibiz/reports/reports-purchasing-data";
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
  receipt_number: string;
  receipt_date_utc: string;
  supplier_name: string;
  total_amount_ugx: number;
  tax_amount_ugx: number;
  status: string;
  source: GoodsReceivedRegisterRow;
} & TableData;
const money = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(value);

export default function ReportsPurchasingPage() {
  const { goodsReceived, getGoodsReceivedRegister } =
    useReportsPurchasingData();
  const [selected, setSelected] = useState<Row | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const rows = useMemo<Row[]>(
    () =>
      goodsReceived
        .filter(
          (receipt) =>
            (!dateFrom || receipt.receipt_date_utc >= dateFrom) &&
            (!dateTo || receipt.receipt_date_utc <= dateTo),
        )
        .map((source) => ({
          id: source.id,
          receipt_number: source.receipt_number,
          receipt_date_utc: source.receipt_date_utc,
          supplier_name: source.supplier_name,
          total_amount_ugx: source.total_amount_ugx,
          tax_amount_ugx: source.tax_amount_ugx,
          status: `${source.status} · ${source.reversal_status}`,
          source,
        })),
    [dateFrom, dateTo, goodsReceived],
  );
  const posted = rows
    .filter((row) => row.source.status === "posted")
    .reduce((total, row) => total + row.total_amount_ugx, 0);
  const fields: TableField<Row>[] = [
    {
      key: "receipt_number",
      header: "Receipt",
      cell: (value) => <span className="font-medium">{String(value)}</span>,
    },
    { key: "receipt_date_utc", header: "Date" },
    { key: "supplier_name", header: "Supplier" },
    {
      key: "total_amount_ugx",
      header: "Total",
      align: "right",
      cell: (value) => money(Number(value)),
    },
    {
      key: "tax_amount_ugx",
      header: "VAT",
      align: "right",
      cell: (value) => money(Number(value)),
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (value) => <Badge variant="outline">{String(value)}</Badge>,
    },
  ];
  const actions: TableAction<Row>[] = [
    {
      type: "view",
      label: "View receipt detail",
      icon: <Eye className="size-4" />,
      onClick: setSelected,
    },
  ];
  const refresh = () =>
    void getGoodsReceivedRegister({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      skip: 0,
      limit: 100,
    });
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold">Purchasing Reports</h2>
            <p className="text-sm text-muted-foreground">
              Goods-received and supplier purchasing records. Voided receipts
              remain visible.
            </p>
          </div>
          <section className="grid gap-4 md:grid-cols-2">
            <MetricCard
              title="Posted receipts"
              value={money(posted)}
              description="Exact UGX from posted goods receipts"
              icon={<ReceiptText className="size-5" />}
            />
            <MetricCard
              title="Receipt register"
              value={String(rows.length)}
              description="Posted and voided receipts remain traceable"
              icon={<Truck className="size-5" />}
            />
          </section>
          <Card>
            <CardContent className="grid gap-4 px-4 md:grid-cols-4 md:items-end">
              <DateRangePicker
                id="purchasing-report-date-range"
                label="Date range (UTC)"
                from={draftDateFrom}
                to={draftDateTo}
                onRangeChange={(from, to) => {
                  setDraftDateFrom(from);
                  setDraftDateTo(to);
                }}
              />
              <ReportPeriodSelect
                id="purchasing-report-period"
                selectedEndDate={draftDateTo}
                onRangeChange={(from, to) => {
                  setDraftDateFrom(from);
                  setDraftDateTo(to);
                }}
              />
              <div className="flex gap-2 md:col-span-2">
                <Button
                  className="h-11 w-full md:w-auto"
                  onClick={() => {
                    setDateFrom(draftDateFrom);
                    setDateTo(draftDateTo);
                  }}
                  disabled={!draftDateFrom || !draftDateTo}>
                  Apply period
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  onClick={() => {
                    setDraftDateFrom("");
                    setDraftDateTo("");
                    setDateFrom("");
                    setDateTo("");
                  }}>
                  Clear period
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<Row>
                title="Goods Received Register"
                description="Posted and voided receipt history."
                data={rows}
                fields={fields}
                actions={actions}
                onRowClick={setSelected}
                toolbarActions={
                  <Button variant="outline" onClick={refresh}>
                    <RefreshCw className="mr-2 size-4" />
                    Refresh
                  </Button>
                }
                enableSelection={false}
                enableGlobalSearch
                enableSorting={false}
                pageSize={10}
                loading={false}
                emptyMessage="No goods receipts are available."
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Goods receipt detail</DialogTitle>
            <DialogDescription>
              Review the receipt record, including any void or reversal status.
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-3 text-sm">
              {[
                ["Receipt", selected.receipt_number],
                ["Supplier", selected.supplier_name],
                ["Date", selected.receipt_date_utc],
                [
                  "Purchase order",
                  selected.source.purchase_order?.po_number ?? "—",
                ],
                [
                  "Items received",
                  String(selected.source.purchase_order?.items_count ?? "—"),
                ],
                ["Total", money(selected.total_amount_ugx)],
                ["VAT", money(selected.tax_amount_ugx)],
                ["Status", selected.status],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
