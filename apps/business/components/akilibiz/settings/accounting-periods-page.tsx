"use client";

import * as React from "react";
import { toast } from "sonner";
import { History, RefreshCw } from "lucide-react";

import {
  type AccountingPeriod,
  useBrowserAccountingPeriods,
} from "@/components/akilibiz/settings/accounting-periods-data";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const date = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("en-UG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const defaults = () => {
  const year = new Date().getFullYear();
  return { from: `${year}-01-01`, to: `${year}-12-31` };
};

export function AccountingPeriodsPage() {
  const store = useBrowserAccountingPeriods();
  const periodEnd = (period: AccountingPeriod) => period.dateTo === "9999-12-31" && period.state === "open" ? "Ongoing" : date(period.dateTo);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [target, setTarget] = React.useState<AccountingPeriod | null>(null);
  const [detail, setDetail] = React.useState<AccountingPeriod | null>(null);
  const [reason, setReason] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const openCreate = () => {
    const values = defaults();
    setFrom(values.from);
    setTo(values.to);
    setError(null);
    setCreateOpen(true);
  };
  const create = async () => {
    if (!from || !to) {
      setError("Choose a start and end date.");
      return;
    }
    if (from > to) {
      setError("The end date must be on or after the start date.");
      return;
    }
    await store.create(from, to);
    setCreateOpen(false);
    toast.success("Accounting period created.");
  };
  const changeState = async () => {
    if (!target || !reason.trim()) return;
    const state = target.state === "open" ? "closed" : "open";
    await store.setState(target.id, state, reason.trim());
    setTarget(null);
    setReason("");
    toast.success(
      state === "closed"
        ? "Accounting period closed."
        : "Accounting period reopened.",
    );
  };
  const action = target?.state === "open" ? "Close" : "Reopen";
  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-8xl space-y-6">
        <div className="space-y-1 pt-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Accounting Periods
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Closing a period stops new entries dated in that period. Record
            corrections in an open period.
          </p>
        </div>
        {store.error && <p role="alert" className="text-sm text-destructive">{store.error}</p>}
        <p className="text-xs text-muted-foreground">Accounting periods are synchronized from the desktop. Changes must currently be made in the desktop application.</p>
        <Card>
          <CardHeader>
            <CardTitle>Accounting periods</CardTitle>
            <CardDescription>Dates use UTC calendar dates.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => void store.refresh()} disabled={store.loading}>
              <RefreshCw className="mr-2 size-4" /> Refresh periods
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Periods</CardTitle>
            <CardDescription>
              Review period status and activity before changing it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {store.loading && store.periods.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Loading accounting periods…
              </p>
            ) : store.periods.length === 0 ? (
              <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No accounting periods have been synchronized for this business.
              </p>
            ) : (
              <div className="space-y-3">
                {store.periods.map((period) => (
                  <div key={period.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">
                          {date(period.dateFrom)} to {periodEnd(period)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {period.state === "closed"
                            ? `Closed — ${period.history.at(-1)?.reason}`
                            : "Open for entries"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant={
                            period.state === "closed" ? "secondary" : "outline"
                          }>
                          {period.state === "closed" ? "Closed" : "Open"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetail(period)}>
                          <History className="mr-1 size-3.5" />
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant={
                            period.state === "open" ? "destructive" : "outline"
                          }
                          onClick={() => {
                            setReason("");
                            setTarget(period);
                          }}
                          disabled
                          title="Change accounting periods in the desktop application">
                          {period.state === "open"
                            ? "Close period"
                            : "Reopen period"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create accounting period</DialogTitle>
            <DialogDescription>
              Use the calendar year unless your business uses another accounting
              period.
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="grid gap-3">
            <Label htmlFor="period-from">Start date (UTC)</Label>
            <Input
              id="period-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
            <Label htmlFor="period-to">End date (UTC)</Label>
            <Input
              id="period-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled title="Accounting period creation is not connected" onClick={() => void create()}>
              Create period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) {
            setTarget(null);
            setReason("");
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{action} accounting period?</DialogTitle>
            <DialogDescription>
              {target?.state === "open"
                ? `Closing this period stops new entries dated from ${target && date(target.dateFrom)} to ${target && date(target.dateTo)}. To fix a past mistake, record the correction in an open period.`
                : "Reopening allows new entries dated in this period. Confirm that this is necessary before continuing."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="period-reason">
              Reason for {action.toLowerCase()}
            </Label>
            <Input
              id="period-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={
                target?.state === "open"
                  ? "e.g. June books reviewed"
                  : "e.g. Correction needed"
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={target?.state === "open" ? "destructive" : "default"}
              disabled title="Accounting period status changes are not connected"
              onClick={() => void changeState()}>
              {action} period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={detail !== null}
        onOpenChange={(open) => !open && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Period details</DialogTitle>
            <DialogDescription>
              {detail && `${date(detail.dateFrom)} to ${periodEnd(detail)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {detail?.history.map((item, index) => (
              <div
                key={`${item.at}-${index}`}
                className="rounded-md border p-3">
                <p className="font-medium">{item.action}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(item.at).toLocaleString("en-UG")}
                  {item.reason ? ` — ${item.reason}` : ""}
                </p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setDetail(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
