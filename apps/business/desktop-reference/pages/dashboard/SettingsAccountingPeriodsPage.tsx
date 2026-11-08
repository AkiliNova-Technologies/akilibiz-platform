import * as React from "react";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermissions } from "@/hooks/usePermissions";
import { tauriFinanceService, type AccountingPeriod } from "@/services/tauri/finance";
import { getErrorMessage } from "@/utils/error-message";

function formatPeriodDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-UG", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString("en-UG", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function currentYearPeriod() {
  const year = new Date().getFullYear();
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export default function SettingsAccountingPeriodsPage() {
  const { can } = usePermissions();
  const canManage = can("finance.period_close");
  const [periods, setPeriods] = React.useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [closeTarget, setCloseTarget] = React.useState<AccountingPeriod | null>(null);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true); setError("");
    try { setPeriods(await tauriFinanceService.getAccountingPeriods()); }
    catch (cause) { setError(getErrorMessage(cause, "Unable to load accounting periods.")); }
    finally { setLoading(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  const create = async () => {
    setSaving(true); setError("");
    try { await tauriFinanceService.createAccountingPeriod({ date_from: from, date_to: to }); setCreateOpen(false); setFrom(""); setTo(""); await load(); }
    catch (cause) { setError(getErrorMessage(cause, "Unable to create accounting period.")); }
    finally { setSaving(false); }
  };
  const close = async () => {
    if (!closeTarget) return;
    setSaving(true); setError("");
    try { await tauriFinanceService.closeAccountingPeriod(closeTarget.id, { reason }); setCloseTarget(null); setReason(""); await load(); }
    catch (cause) { setError(getErrorMessage(cause, "Unable to close accounting period.")); }
    finally { setSaving(false); }
  };
  const openCreate = () => {
    const defaults = currentYearPeriod();
    setFrom(defaults.from);
    setTo(defaults.to);
    setCreateOpen(true);
  };

  return <><SiteHeader label="Accounting Periods" />
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:gap-6 md:p-6 md:pt-0">
      <Card><CardHeader><CardTitle>Accounting periods</CardTitle><CardDescription>Closing a period stops new entries dated in that period. To fix a past mistake, record the correction in an open period.</CardDescription></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3"><Button onClick={openCreate} disabled={!canManage}>Create period</Button>{!canManage && <span className="text-sm text-muted-foreground">You do not have permission to manage accounting periods.</span>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Periods</CardTitle><CardDescription>Dates use UTC calendar dates.</CardDescription></CardHeader><CardContent>
        {error && <div role="alert" className="mb-3 text-sm text-destructive">{error}</div>}
        {loading ? <p className="text-sm text-muted-foreground">Loading accounting periods…</p> : periods.length === 0 ? <p className="text-sm text-muted-foreground">No accounting periods have been created.</p> : <div className="space-y-3">{periods.map((period) => <div key={period.id} className="rounded-md border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-medium">{formatPeriodDate(period.date_from)} to {period.date_to === "9999-12-31" ? "Open-ended" : formatPeriodDate(period.date_to)}</p><p className="mt-1 text-sm text-muted-foreground">{period.state === "closed" ? `Closed by ${period.latest_action_actor_name ?? "unknown"} on ${period.latest_action_at ? formatDateTime(period.latest_action_at) : "an unknown date"}${period.latest_action_reason ? ` — ${period.latest_action_reason}` : ""}` : "Open"}</p></div><div className="flex items-center gap-2"><Badge variant={period.state === "closed" ? "secondary" : "outline"}>{period.state === "closed" ? "Closed" : "Open"}</Badge>{period.state === "open" && <Button size="sm" variant="destructive" disabled={!canManage} onClick={() => setCloseTarget(period)}>Close period</Button>}</div></div></div>)}</div>}
      </CardContent></Card>
    </div>
    <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent><DialogHeader><DialogTitle>Create accounting period</DialogTitle><DialogDescription>Use the calendar year unless your business uses another accounting period.</DialogDescription></DialogHeader><div className="grid gap-3"><Label htmlFor="period-from">Start date (UTC)</Label><Input id="period-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /><Label htmlFor="period-to">End date (UTC)</Label><Input id="period-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button><Button disabled={saving || !from || !to} onClick={() => void create()}>Create period</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!closeTarget} onOpenChange={(open) => { if (!open) { setCloseTarget(null); setReason(""); } }}><DialogContent><DialogHeader><DialogTitle>Close accounting period?</DialogTitle><DialogDescription>Closing this period stops new entries dated from {closeTarget && formatPeriodDate(closeTarget.date_from)} to {closeTarget && (closeTarget.date_to === "9999-12-31" ? "Open-ended" : formatPeriodDate(closeTarget.date_to))}. To fix a past mistake, record the correction in an open period.</DialogDescription></DialogHeader><div className="grid gap-2"><Label htmlFor="close-reason">Reason for closing</Label><Input id="close-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="e.g. June books reviewed" /></div><DialogFooter><Button variant="outline" onClick={() => setCloseTarget(null)}>Cancel</Button><Button variant="destructive" disabled={saving || !reason.trim()} onClick={() => void close()}>Close period</Button></DialogFooter></DialogContent></Dialog>
  </>;
}
