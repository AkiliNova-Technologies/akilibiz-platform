"use client";

import { useCallback, useMemo, useState } from "react";

export type AccountingPeriod = { id: string; dateFrom: string; dateTo: string; state: "open" | "closed"; history: Array<{ action: "Created" | "Closed" | "Reopened"; at: string; reason?: string }> };

export function useBrowserAccountingPeriods() {
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [loading, setLoading] = useState(false);
  const create = useCallback(async (dateFrom: string, dateTo: string) => { setLoading(true); try { await Promise.resolve(); setPeriods((items) => [{ id: crypto.randomUUID(), dateFrom, dateTo, state: "open", history: [{ action: "Created", at: new Date().toISOString() }] }, ...items]); } finally { setLoading(false); } }, []);
  const setState = useCallback(async (id: string, state: AccountingPeriod["state"], reason: string) => { setLoading(true); try { await Promise.resolve(); setPeriods((items) => items.map((period) => period.id === id ? { ...period, state, history: [...period.history, { action: state === "closed" ? "Closed" : "Reopened", at: new Date().toISOString(), reason }] } : period)); } finally { setLoading(false); } }, []);
  return { closed: useMemo(() => periods.filter((period) => period.state === "closed").length, [periods]), create, loading, open: useMemo(() => periods.filter((period) => period.state === "open").length, [periods]), periods, setState };
}
