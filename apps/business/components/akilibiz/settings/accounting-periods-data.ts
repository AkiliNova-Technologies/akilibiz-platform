"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadAllFinancialMirrorRows, type FinancialMirrorRow } from "@/components/akilibiz/finance/financial-mirror-client";

export type AccountingPeriod = {
  id: string;
  dateFrom: string;
  dateTo: string;
  state: "open" | "closed";
  history: Array<{ action: "Created" | "Closed" | "Reopened"; at: string; reason?: string }>;
};

const validDate = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v+"T00:00:00Z"));

export function mapAccountingPeriod(row: FinancialMirrorRow): AccountingPeriod | null {
  const r = row.record;
  if (!validDate(r.date_from) || !validDate(r.date_to) || r.date_from > r.date_to ||
      (r.state !== "open" && r.state !== "closed")) return null;
  const created = typeof r.created_at === "string" && Number.isFinite(Date.parse(r.created_at))
    ? r.created_at : row.capturedAt;
  const history: AccountingPeriod["history"] = [];
  if (Number.isFinite(Date.parse(created))) history.push({ action: "Created", at: created });
  if (r.state === "closed") {
    if (typeof r.closed_at !== "string" || !Number.isFinite(Date.parse(r.closed_at))) return null;
    history.push({
      action: "Closed", at: r.closed_at,
      ...(typeof r.close_reason === "string" && r.close_reason.trim()
        ? { reason: r.close_reason } : {}),
    });
  }
  return {
    id: String(row.localRecordId), dateFrom: r.date_from, dateTo: r.date_to,
    state: r.state, history,
  };
}

const unavailable = (): never => {
  throw new Error("Accounting-period changes are unavailable until the hosted accounting service is connected.");
};

export function useBrowserAccountingPeriods() {
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const records = await loadAllFinancialMirrorRows("accounting_periods");
      const mapped = records.map(mapAccountingPeriod);
      if (mapped.some(v => v === null)) {
        throw new Error("Some synchronized accounting periods contain invalid dates or statuses.");
      }
      setPeriods(mapped.filter((v): v is AccountingPeriod => v !== null));
    } catch (cause) {
      setPeriods([]);
      setError(cause instanceof Error ? cause.message : "Accounting periods could not be loaded.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);
  const create = useCallback(async (_dateFrom: string, _dateTo: string): Promise<never> => unavailable(), []);
  const setState = useCallback(async (_id: string, _state: AccountingPeriod["state"], _reason: string): Promise<never> => unavailable(), []);
  const closed = useMemo(() => periods.filter(p => p.state === "closed").length, [periods]);
  const open = useMemo(() => periods.filter(p => p.state === "open").length, [periods]);
  return { closed, create, loading, error, refresh, open, periods, setState };
}
