"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import {
  DataTable,
  type TableAction,
  type TableData,
  type TableField,
} from "@/components/akilibiz/data-table";
import { DateRangePicker } from "@/components/akilibiz/date-range-picker";
import { ReportPeriodSelect } from "@/components/akilibiz/reports/report-period-select";
import {
  type FinancialReportEntry,
  type FinancialReportTab,
  useReportsFinancialData,
} from "@/components/akilibiz/reports/reports-financial-data";
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

type Row = FinancialReportEntry & TableData;
const ugx = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(value);
const asOfTabs: FinancialReportTab[] = [
  "trial",
  "detailed-trial",
  "balance-sheet",
];
const tabs: Array<[FinancialReportTab, string]> = [
  ["receivables", "Receivables"],
  ["payables", "Payables"],
  ["tax", "VAT & Tax"],
  ["gross-profit", "Gross Profit"],
  ["profit-loss", "Profit & Loss"],
  ["journals", "Journals"],
  ["trial", "Trial Balance"],
  ["detailed-trial", "Detailed Trial"],
  ["balance-sheet", "Balance Sheet"],
];

export default function ReportsFinancialPage() {
  const {
    entries,
    loading,
    refresh,
  } = useReportsFinancialData();
  const [tab, setTab] = useState<FinancialReportTab>("receivables");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [asOf, setAsOf] = useState("");
  const [draftAsOf, setDraftAsOf] = useState("");
  const [detail, setDetail] = useState<Row | null>(null);
  const rows = useMemo<Row[]>(
    () =>
      entries[tab].map((entry) => ({
        ...entry,
        date:
          entry.date === "Selected period"
            ? `${from || "All"} to ${to || "All"} UTC`
            : asOfTabs.includes(tab) && asOf
              ? asOf
              : entry.date,
      })),
    [asOf, entries, from, tab, to],
  );
  const fields: TableField<Row>[] = [
    { key: "label", header: "Reference" },
    { key: "date", header: "UTC date" },
    {
      key: "amount",
      header: "Balance / gross",
      align: "right",
      cell: (value) => (value === undefined ? "—" : ugx(Number(value))),
    },
    {
      key: "debit",
      header: "Debit",
      align: "right",
      cell: (value) => (value === undefined ? "—" : ugx(Number(value))),
    },
    {
      key: "credit",
      header: "Credit",
      align: "right",
      cell: (value) => (value === undefined ? "—" : ugx(Number(value))),
    },
    {
      key: "status",
      header: "Status",
      cell: (value) => <Badge variant="outline">{String(value ?? "")}</Badge>,
    },
  ];
  const actions: TableAction<Row>[] = [
    { type: "view", label: "View detail", onClick: setDetail },
  ];
  const usesAsOf = asOfTabs.includes(tab);
  const currentTitle =
    tabs.find(([key]) => key === tab)?.[1] ?? "Financial report";
  const apply = () =>
    usesAsOf ? setAsOf(draftAsOf) : (setFrom(draftFrom), setTo(draftTo));
  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold">Financial Reports</h2>
            <p className="text-sm text-muted-foreground">
              Review receivables, payables, tax, profitability, and statement
              information.
            </p>
          </div>
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as FinancialReportTab)}>
            <TabsList className="h-auto flex-wrap justify-start">
              {tabs.map(([key, label]) => (
                <TabsTrigger key={key} value={key}>
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
            {tabs.map(([key, label]) => (
              <TabsContent key={key} value={key}>
                <Card className="mb-4">
                  <CardContent className="grid gap-4 px-4 md:grid-cols-4 md:items-end">
                    {asOfTabs.includes(key) ? (
                      <DateRangePicker
                        id={`financial-report-as-of-${key}`}
                        label="As of date (UTC)"
                        from={draftAsOf}
                        to={draftAsOf}
                        onRangeChange={(_, nextTo) => setDraftAsOf(nextTo)}
                      />
                    ) : (
                      <>
                        <DateRangePicker
                          id={`financial-report-date-range-${key}`}
                          label="Date range (UTC)"
                          from={draftFrom}
                          to={draftTo}
                          onRangeChange={(nextFrom, nextTo) => {
                            setDraftFrom(nextFrom);
                            setDraftTo(nextTo);
                          }}
                        />
                        <ReportPeriodSelect
                          id={`financial-report-period-${key}`}
                          selectedEndDate={draftTo}
                          onRangeChange={(nextFrom, nextTo) => {
                            setDraftFrom(nextFrom);
                            setDraftTo(nextTo);
                          }}
                        />
                      </>
                    )}
                    <div
                      className={`flex gap-2 ${asOfTabs.includes(key) ? "md:col-span-3" : "md:col-span-2"}`}>
                      <Button
                        className="h-11 w-full md:w-auto"
                        onClick={apply}
                        disabled={
                          asOfTabs.includes(key)
                            ? !draftAsOf
                            : !draftFrom || !draftTo
                        }>
                        {loading ? (
                          <LoaderCircle className="mr-2 size-4 animate-spin" />
                        ) : null}
                        {asOfTabs.includes(key)
                          ? "Apply as of date"
                          : "Apply period"}
                      </Button>
                      {!asOfTabs.includes(key) ? (
                        <Button
                          variant="outline"
                          className="h-11"
                          onClick={() => {
                            setDraftFrom("");
                            setDraftTo("");
                            setFrom("");
                            setTo("");
                          }}>
                          Clear period
                        </Button>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent>
                    <DataTable<Row>
                      data={rows}
                      fields={fields}
                      title={label}
                      description={
                        key === "trial"
                          ? "Account balances as of the selected date."
                          : "Select a row to review its supporting information."
                      }
                      actions={actions}
                      onRowClick={setDetail}
                      toolbarActions={
                        <Button
                          variant="outline"
                          onClick={() => void refresh()}
                          disabled={loading}>
                          {loading ? (
                            <LoaderCircle className="size-4 animate-spin" / size="icon" aria-label="Refresh" title="Refresh" disabled>
                          ) : (
                            <RefreshCw className="size-4" />
                          )}
                          
                        </Button>
                      }
                      enableSelection={false}
                      enableGlobalSearch
                      enableSorting={false}
                      loading={loading}
                      emptyMessage="Financial reports are unavailable until the hosted accounting ledger is connected."
                    />
                    <p className="px-4 pb-4 text-sm text-muted-foreground">
                      Financial report totals are unavailable until the hosted accounting ledger is connected.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
      <Dialog
        open={Boolean(detail)}
        onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{currentTitle} detail</DialogTitle>
            <DialogDescription>
              Review the supporting information for this financial record.
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-3 text-sm">
              {Object.entries(detail.detail).map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 border-b pb-2">
                  <span className="text-muted-foreground">
                    {label.replaceAll("_", " ")}
                  </span>
                  <span className="text-right font-medium">
                    {typeof value === "number" && label.endsWith("ugx")
                      ? ugx(value)
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
