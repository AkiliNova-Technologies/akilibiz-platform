import * as React from "react";
import { Loader2 } from "lucide-react";
import {
  DataTable,
  type TableData,
  type TableField,
} from "@/components/data-table";
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
  getAccountGeneralLedger,
  getAuthoritativeGrossProfit,
  getAuthoritativeProfitLoss,
  getAuthoritativeProfitLossDrillDown,
  getAuthoritativeTrialBalance,
  getAuthoritativeBalanceSheet,
  getAuthoritativeAccountDrillDown,
  getCustomerReceivableDrillDown,
  getJournalEntryDrillDown,
  getJournalRegister,
  getOpenPayables,
  getOpenReceivables,
  getSupplierPayableDrillDown,
  getTaxTransactionDrillDown,
  getTaxTransactionRegister,
  getTrialBalance,
  type JournalRegisterRow,
  type GrossProfitReport,
  type AuthoritativeProfitLossReport,
  type AuthoritativeTrialBalance,
  type AuthoritativeBalanceSheet,
  type PayableRow,
  type ReceivableRow,
  type TaxTransaction,
  type TrialBalance,
} from "@/services/tauri/reports";
import { IconRefresh } from "@tabler/icons-react";
const ugx = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(value);
type AnyRow = TableData & {
  source: unknown;
  label: string;
  date: string;
  debit?: number;
  credit?: number;
  amount?: number;
  status?: string;
};
export default function ReportsFinancialPage() {
  const [tab, setTab] = React.useState("receivables"),
    [rows, setRows] = React.useState<AnyRow[]>([]),
    [trial, setTrial] = React.useState<TrialBalance | null>(null),
    [grossProfit, setGrossProfit] = React.useState<GrossProfitReport | null>(null),
    [profitLoss, setProfitLoss] = React.useState<AuthoritativeProfitLossReport | null>(null),
    [authoritativeTrial, setAuthoritativeTrial] = React.useState<AuthoritativeTrialBalance | null>(null),
    [balanceSheet, setBalanceSheet] = React.useState<AuthoritativeBalanceSheet | null>(null),
    [from, setFrom] = React.useState(""),
    [to, setTo] = React.useState(""),
    [draftFrom, setDraftFrom] = React.useState(""),
    [draftTo, setDraftTo] = React.useState(""),
    [asOf, setAsOf] = React.useState(""),
    [draftAsOf, setDraftAsOf] = React.useState(""),
    [loading, setLoading] = React.useState(false),
    [error, setError] = React.useState<string | null>(null),
    [detail, setDetail] = React.useState<unknown | null>(null),
    [detailSkip, setDetailSkip] = React.useState(0),
    [open, setOpen] = React.useState(false);
  const query = React.useMemo(
    () => ({
      date_from: from || undefined,
      date_to: to || undefined,
      skip: 0,
      limit: 100,
    }),
    [from, to],
  );
  // The date primitives are dependencies; query is recreated from them for each request.
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTrial(null);
      setGrossProfit(null);
      setProfitLoss(null);
      setAuthoritativeTrial(null); setBalanceSheet(null);
      if (tab === "receivables") {
        const r = await getOpenReceivables(query);
        setRows(
          r.map((x) => ({
            id: x.sale_id,
            label: `${x.customer_name} · ${x.sale_number}`,
            date: x.sale_date_utc,
            amount: x.balance_ugx,
            status: `${x.payment_status} · ${x.sale_status} · ${x.due_date ?? "Unknown due date"}`,
            source: x,
          })),
        );
      } else if (tab === "payables") {
        const r = await getOpenPayables(query);
        setRows(
          r.map((x) => ({
            id: x.payable_id,
            label: `${x.supplier_name} · ${x.receipt_number}`,
            date: x.receipt_date_utc,
            amount: x.balance_ugx,
            status: `${x.payment_status} · ${x.receipt_status}`,
            source: x,
          })),
        );
      } else if (tab === "tax") {
        const r = await getTaxTransactionRegister(query);
        setRows(
          r.map((x) => ({
            id: x.fact_id ?? x.snapshot_id,
            label: `${x.source_type} · ${x.source_reference ?? x.source_id} · ${x.fact_classification}`,
            date: x.transaction_date_utc ?? "",
            amount: x.gross_amount_ugx,
            status: `${x.fact_classification} · ${x.source_status}`,
            source: x,
          })),
        );
      } else if (tab === "journals") {
        const r = await getJournalRegister(query);
        setRows(
          r.map((x) => ({
            id: x.id,
            label: x.journal_number,
            date: x.entry_date,
            debit: x.debit_total_ugx,
            credit: x.credit_total_ugx,
            status: x.is_reversal ? "Reversal" : "Posted",
            source: x,
          })),
        );
      } else if (tab === "gross-profit") {
        const r = await getAuthoritativeGrossProfit(query);
        setGrossProfit(r);
        setRows([
          { id: 1, label: "Sales revenue (4000)", date: `${r.date_from_utc} to ${r.date_to_utc}`, amount: r.revenue_ugx, status: r.coverage_status, source: r },
          { id: 2, label: "Cost of goods sold (5000)", date: `${r.date_from_utc} to ${r.date_to_utc}`, amount: r.cogs_ugx, status: `${r.covered_event_count} posted COGS journals`, source: r },
          { id: 3, label: "Gross profit", date: `${r.date_from_utc} to ${r.date_to_utc}`, amount: r.gross_profit_ugx, status: r.excluded_event_count ? "Incomplete coverage" : "Authoritative posted-journal coverage", source: r },
        ]);
      } else if (tab === "profit-loss") {
        if (!from || !to) { setRows([]); return; }
        const r = await getAuthoritativeProfitLoss({ date_from: from, date_to: to });
        setProfitLoss(r);
        setRows(r.revenue_ugx == null ? [] : [
          { id: 1, label: "Sales revenue (4000)", date: `${r.date_from_utc} to ${r.date_to_utc}`, amount: r.revenue_ugx ?? undefined, status: "Posted journals", source: { section: "revenue" } },
          { id: 2, label: "Cost of goods sold (5000)", date: `${r.date_from_utc} to ${r.date_to_utc}`, amount: r.cogs_ugx ?? undefined, status: "Posted journals", source: { section: "cogs" } },
          { id: 3, label: "Gross profit", date: `${r.date_from_utc} to ${r.date_to_utc}`, amount: r.gross_profit_ugx ?? undefined, status: "Derived by backend", source: {} },
          { id: 4, label: "Operating expenses (5100)", date: `${r.date_from_utc} to ${r.date_to_utc}`, amount: r.operating_expenses_ugx ?? undefined, status: "Posted journals", source: { section: "operating_expenses" } },
          { id: 5, label: "Net profit / loss", date: `${r.date_from_utc} to ${r.date_to_utc}`, amount: r.net_profit_loss_ugx ?? undefined, status: "Derived by backend", source: {} },
        ]);
      } else if (tab === "authoritative-trial") {
        if (!asOf) { setRows([]); return; }
        const r=await getAuthoritativeTrialBalance({as_of_date:asOf}); setAuthoritativeTrial(r);
        setRows(r.rows.map((x)=>({id:x.account_id,label:`${x.account_code} · ${x.account_name}`,date:r.as_of_date_utc,debit:x.debit_balance_ugx,credit:x.credit_balance_ugx,status:r.coverage_status,source:x})));
      } else if (tab === "balance-sheet") {
        if (!asOf) { setRows([]); return; }
        const r=await getAuthoritativeBalanceSheet({as_of_date:asOf}); setBalanceSheet(r);
        setRows([...r.assets.map((x,i)=>({id:i+1,label:`Asset · ${x.account_code} · ${x.account_name}`,date:r.as_of_date_utc,amount:x.amount_ugx,status:r.coverage_status,source:x})),...r.liabilities.map((x,i)=>({id:i+100,label:`Liability · ${x.account_code} · ${x.account_name}`,date:r.as_of_date_utc,amount:x.amount_ugx,status:r.coverage_status,source:x})),...r.equity.map((x,i)=>({id:i+200,label:`Equity · ${x.account_code} · ${x.account_name}`,date:r.as_of_date_utc,amount:x.amount_ugx,status:r.coverage_status,source:x}))]);
      } else {
        const r = await getTrialBalance(
          asOf || new Date().toISOString().slice(0, 10),
        );
        setTrial(r);
        setRows(
          r.rows.map((x) => ({
            id: x.account_id,
            label: `${x.account_code} · ${x.account_name}`,
            date: r.as_of_date_utc,
            debit: x.debit_balance_ugx,
            credit: x.credit_balance_ugx,
            status: x.category,
            source: x,
          })),
        );
      }
    } catch (c) {
      setError(
        c instanceof Error ? c.message : "Financial report unavailable.",
      );
    } finally {
      setLoading(false);
    }
    // TODO: Correct this if wrongly done
  }, [tab, query, from, to, asOf]);
  React.useEffect(() => {
    void load();
  }, [load]);
  const view = async (row: AnyRow) => {
    setOpen(true);
    setDetail(null);
    try {
      if (tab === "receivables")
        setDetail(
          await getCustomerReceivableDrillDown(
            (row.source as unknown as ReceivableRow).customer_id,
          ),
        );
      else if (tab === "payables")
        setDetail(
          await getSupplierPayableDrillDown(
            (row.source as unknown as PayableRow).supplier_id,
          ),
        );
      else if (tab === "tax")
        setDetail(
          await getTaxTransactionDrillDown(
            (row.source as unknown as TaxTransaction).snapshot_id,
          ),
        );
      else if (tab === "journals")
        setDetail(
          await getJournalEntryDrillDown(
            (row.source as unknown as JournalRegisterRow).id,
          ),
        );
      else if (tab === "profit-loss" && ["revenue", "cogs", "operating_expenses"].includes(String((row.source as { section?: string }).section))) {
        setDetail(await getAuthoritativeProfitLossDrillDown({ date_from: from, date_to: to, section: (row.source as { section: "revenue" | "cogs" | "operating_expenses" }).section }));
      } else if (tab === "trial") {
        const account = row.source as { account_id: number };
        setDetail({
          account_activity: await getAccountGeneralLedger(
            account.account_id,
            query,
          ),
        });
      } else if (tab === "authoritative-trial" || tab === "balance-sheet") {
        const account = row.source as { account_id: number };
        setDetail({ account_id: account.account_id, lines: await getAuthoritativeAccountDrillDown({ account_id: account.account_id, as_of_date: asOf, skip: 0, limit: 20 }) });
        setDetailSkip(0);
      }
    } catch (c) {
      setDetail({
        unavailable: c instanceof Error ? c.message : "Detail unavailable",
      });
    }
  };
  const fields: TableField<AnyRow>[] = [
    { key: "label", header: "Reference" },
    { key: "date", header: "UTC date" },
    {
      key: "amount",
      header: "Balance / gross",
      align: "right",
      cell: (v) => (v === undefined ? "—" : ugx(Number(v))),
    },
    {
      key: "debit",
      header: "Debit",
      align: "right",
      cell: (v) => (v === undefined ? "—" : ugx(Number(v))),
    },
    {
      key: "credit",
      header: "Credit",
      align: "right",
      cell: (v) => (v === undefined ? "—" : ugx(Number(v))),
    },
    {
      key: "status",
      header: "Status",
      cell: (v) => <Badge variant="outline">{String(v ?? "")}</Badge>,
    },
  ];
  const titles: Record<string, string> = {
    receivables: "Receivables",
    payables: "Payables",
    tax: "VAT & Tax",
    "gross-profit": "Gross Profit",
    "profit-loss": "Authoritative Profit & Loss",
    "authoritative-trial": "Authoritative Trial Balance",
    "balance-sheet": "Authoritative Balance Sheet",
    journals: "Journals",
    trial: "Trial Balance",
  };
  return (
    <>
      <SiteHeader label="Financial Reports" />
      <div className="flex flex-1 flex-col">
        <div className="flex flex-col gap-6 px-4 pb-6 md:px-6">
          <div>
            <h2 className="text-2xl font-semibold">Financial Reports</h2>
            <p className="text-sm text-muted-foreground">
              Read-only authoritative receivable, payable, tax and
              posted-journal reporting.
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
              <TabsTrigger value="receivables">Receivables</TabsTrigger>
              <TabsTrigger value="payables">Payables</TabsTrigger>
              <TabsTrigger value="tax">VAT & Tax</TabsTrigger>
              <TabsTrigger value="gross-profit">Gross Profit</TabsTrigger>
              <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
              <TabsTrigger value="journals">Journals</TabsTrigger>
              <TabsTrigger value="trial">Trial Balance</TabsTrigger>
              <TabsTrigger value="authoritative-trial">Authoritative Trial</TabsTrigger>
              <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
            </TabsList>
            {["receivables", "payables", "tax", "gross-profit", "profit-loss", "journals", "trial", "authoritative-trial", "balance-sheet"].map(
              (key) => (
                <TabsContent key={key} value={key}>
                  <Card className="mb-4">
                    <CardContent className="grid gap-4 px-4 md:grid-cols-4 md:items-end">
                      {["trial", "authoritative-trial", "balance-sheet"].includes(key) ? (
                        <DateRangePicker
                          id="financial-report-as-of"
                          label="As of date (UTC)"
                          from={draftAsOf}
                          to={draftAsOf}
                          onRangeChange={(_, nextTo) => setDraftAsOf(nextTo)}
                          numberOfMonths={1}
                        />
                      ) : (
                        <>
                          <DateRangePicker
                            id="financial-report-date-range"
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
                            id="financial-report-period"
                            selectedEndDate={draftTo}
                            onRangeChange={(nextFrom, nextTo) => {
                              setDraftFrom(nextFrom);
                              setDraftTo(nextTo);
                            }}
                          />
                        </>
                      )}
                      <div
                        className={`flex gap-2 ${key === "trial" ? "md:col-span-3" : "md:col-span-2"}`}>
                        <Button
                          className="h-11 w-full md:w-auto"
                          onClick={() =>
                            ["trial", "authoritative-trial", "balance-sheet"].includes(key)
                              ? setAsOf(draftAsOf)
                              : (setFrom(draftFrom), setTo(draftTo))
                          }
                          disabled={
                            loading ||
                            (["trial", "authoritative-trial", "balance-sheet"].includes(key)
                              ? !draftAsOf
                              : !draftFrom || !draftTo)
                          }>
                          {loading && (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          )}
                          {["trial", "authoritative-trial", "balance-sheet"].includes(key) ? "Apply as of date" : "Apply period"}
                        </Button>
                        {!['trial','authoritative-trial','balance-sheet'].includes(key) && (
                          <Button
                            variant="outline"
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
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent>
                      <DataTable
                        data={rows}
                        fields={fields}
                        title={titles[key]}
                        description={
                          key === "trial"
                            ? "Posted journals available in this database only; no opening balances are inferred."
                            : "Stable backend order; select a row for persisted activity."
                        }
                        actions={[
                          { type: "view", label: "View detail", onClick: view },
                        ]}
                        onRowClick={view}
                        toolbarActions={
                          <>
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
                          </>
                        }
                        enableSelection={false}
                        enableGlobalSearch={true}
                        enableSorting={false}
                        loading={loading}
                        emptyMessage="No authoritative records are available for this selection."
                      />
                      {key === "trial" && trial && (
                        <p className="px-4 pb-4 text-sm text-muted-foreground">
                          Total debit: {ugx(trial.total_debit_ugx)} · Total
                          credit: {ugx(trial.total_credit_ugx)} ·{" "}
                          {trial.balances_equal
                            ? "Balances equal"
                            : "Totals do not balance"}
                        </p>
                      )}
                      {key === "authoritative-trial" && authoritativeTrial && <p className="px-4 pb-4 text-sm text-muted-foreground">{authoritativeTrial.coverage_status === "complete" ? `Total debit: ${ugx(authoritativeTrial.total_debit_ugx ?? 0)} · Total credit: ${ugx(authoritativeTrial.total_credit_ugx ?? 0)} · Balances equal` : `Unavailable/incomplete: ${authoritativeTrial.coverage_reasons.join(" ")}`} Included: {authoritativeTrial.included_source_types.join(", ") || "none"}. Excluded: {authoritativeTrial.excluded_source_types.join(", ")}.</p>}
                      {key === "balance-sheet" && balanceSheet && <p className="px-4 pb-4 text-sm text-muted-foreground">{balanceSheet.coverage_status === "complete" ? `Assets: ${ugx(balanceSheet.total_assets_ugx ?? 0)} · Liabilities + equity: ${ugx(balanceSheet.total_liabilities_and_equity_ugx ?? 0)}` : `Unavailable/incomplete: ${balanceSheet.coverage_reasons.join(" ")}`} No opening balances or retained earnings are inferred.</p>}
                      {key === "gross-profit" && grossProfit && (
                        <p className="px-4 pb-4 text-sm text-muted-foreground">
                          Revenue: {ugx(grossProfit.revenue_ugx)} · COGS: {ugx(grossProfit.cogs_ugx)} · Gross profit: {ugx(grossProfit.gross_profit_ugx)}. Uses posted journal effective dates, inclusive UTC bounds, and account {grossProfit.cogs_account_code} only.
                        </p>
                      )}
                      {key === "profit-loss" && profitLoss && (
                        <div className="space-y-1 px-4 pb-4 text-sm text-muted-foreground">
                          <p>{profitLoss.coverage_complete ? "Authoritative posted-journal coverage." : "Unavailable: selected period has incomplete authoritative coverage."}</p>
                          <p>Included: {profitLoss.included_source_types.join(", ") || "no posted source events"}. Excluded: {profitLoss.excluded_source_types.join(", ")}.</p>
                          {profitLoss.coverage_reasons.map((reason) => <p key={reason}>{reason}</p>)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              ),
            )}
          </Tabs>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{titles[tab]} detail</DialogTitle>
            <DialogDescription>
              Read-only persisted activity and reversal history where available.
            </DialogDescription>
          </DialogHeader>
          {detail ? (
            <div className="space-y-3"><pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(detail, null, 2)}</pre>{["authoritative-trial", "balance-sheet"].includes(tab) && typeof detail === "object" && detail !== null && "account_id" in detail && <div className="flex justify-end gap-2"><Button variant="outline" disabled={detailSkip === 0} onClick={async () => { const next=Math.max(0,detailSkip-20); const accountId=(detail as {account_id:number}).account_id; setDetail({account_id:accountId,lines:await getAuthoritativeAccountDrillDown({account_id:accountId,as_of_date:asOf,skip:next,limit:20})});setDetailSkip(next); }}>Previous</Button><Button variant="outline" onClick={async () => { const next=detailSkip+20; const accountId=(detail as {account_id:number}).account_id; setDetail({account_id:accountId,lines:await getAuthoritativeAccountDrillDown({account_id:accountId,as_of_date:asOf,skip:next,limit:20})});setDetailSkip(next); }}>Next</Button></div>}</div>
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
