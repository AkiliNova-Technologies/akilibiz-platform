import * as React from "react";
import {
  IconAlertCircle,
  IconLoader2,
  IconReceipt2,
  IconRefresh,
  IconTruck,
} from "@tabler/icons-react";
import { Eye } from "lucide-react";
import {
  DataTable,
  type TableData,
  type TableField,
} from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import MetricCard from "@/components/metric-card";
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
  getGoodsReceivedRegister,
  type GoodsReceivedRegisterRow,
} from "@/services/tauri/reports";

interface ReceiptRow extends TableData {
  receipt_number: string;
  receipt_date_utc: string;
  supplier_name: string;
  total_amount_ugx: number;
  tax_amount_ugx: number;
  status: string;
  source: GoodsReceivedRegisterRow;
}
const money = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(value);
export default function ReportsPurchasingPage() {
  const [rows, setRows] = React.useState<ReceiptRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<ReceiptRow | null>(null);
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [draftDateFrom, setDraftDateFrom] = React.useState("");
  const [draftDateTo, setDraftDateTo] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await getGoodsReceivedRegister({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        skip: 0,
        limit: 100,
      });
      setRows(
        items.map((receipt) => ({
          id: receipt.id,
          receipt_number: receipt.receipt_number,
          receipt_date_utc: receipt.receipt_date_utc,
          supplier_name: receipt.supplier_name,
          total_amount_ugx: receipt.total_amount_ugx,
          tax_amount_ugx: receipt.tax_amount_ugx,
          status: `${receipt.status} · ${receipt.reversal_status}`,
          source: receipt,
        })),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Failed to load purchasing report.",
      );
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const fields: TableField<ReceiptRow>[] = [
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
  const posted = rows
    .filter((row) => row.source.status === "posted")
    .reduce((total, row) => total + row.total_amount_ugx, 0);

  return (
    <>
      <SiteHeader label="Purchasing Reports" />
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-6 md:px-6">
          <div>
            <h2 className="text-2xl font-semibold">Purchasing Reports</h2>
            <p className="text-sm text-muted-foreground">
              Read-only goods-received and supplier purchasing records. Voided
              receipts remain visible.
            </p>
          </div>
          {error && (
            <Card className="border-destructive/40">
              <CardContent className="flex items-center gap-2 p-4 text-sm text-destructive">
                <IconAlertCircle className="size-4" />
                {error}
              </CardContent>
            </Card>
          )}
          <section className="grid gap-4 md:grid-cols-2">
            <MetricCard
              title="Posted receipts"
              value={money(posted)}
              description="Exact UGX from posted goods receipts"
              icon={<IconReceipt2 className="size-5" />}
            />
            <MetricCard
              title="Receipt register"
              value={String(rows.length)}
              description="Posted and voided receipts remain traceable"
              icon={<IconTruck className="size-5" />}
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
                numberOfMonths={1}
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
                  disabled={loading || !draftDateFrom || !draftDateTo}>
                  {loading && (
                    <IconLoader2 className="mr-2 size-4 animate-spin" />
                  )}
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
                  }}
                  disabled={loading}>
                  Clear period
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="px-6 pb-6">
              <DataTable<ReceiptRow>
                title="Goods Received Register"
                description="Authoritative posted and voided receipt history."
                data={rows}
                fields={fields}
                actions={[
                  {
                    type: "view",
                    label: "View receipt detail",
                    icon: <Eye className="size-4" />,
                    onClick: setSelected,
                  },
                ]}
                onRowClick={setSelected}
                toolbarActions={
                  <>
                    <Button
                      variant="outline"
                      onClick={() => void load()}
                      disabled={loading}>
                      {loading && (
                        <IconLoader2 className="mr-2 size-4 animate-spin" />
                      )}
                      <IconRefresh className="size-4" />
                      Refresh
                    </Button>
                  </>
                }
                enableSelection={false}
                enableGlobalSearch={true}
                enableSorting={false}
                pageSize={10}
                loading={loading}
                emptyMessage="No goods receipts are available."
              />
            </CardContent>
          </Card>
        </div>
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Goods receipt detail</DialogTitle>
            <DialogDescription>
              Read-only receipt record. Void and reversal status is retained.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              {[
                ["Receipt", selected.receipt_number],
                ["Supplier", selected.supplier_name],
                ["Date", selected.receipt_date_utc],
                ["Total", money(selected.total_amount_ugx)],
                ["VAT", money(selected.tax_amount_ugx)],
                ["Status", selected.status],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
