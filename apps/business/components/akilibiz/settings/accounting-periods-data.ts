"use client";

import { useCallback, useMemo, useState } from "react";

export type AccountingPeriod = {
  id: string;
  dateFrom: string;
  dateTo: string;
  state: "open" | "closed";
  history: Array<{
    action: "Created" | "Closed" | "Reopened";
    at: string;
    reason?: string;
  }>;
};
const unavailable = (): never => {
  throw new Error("Accounting-period changes are unavailable until the hosted accounting service is connected.");
};

export function useBrowserAccountingPeriods() {
  const [periods] = useState<AccountingPeriod[]>([]);
  const [loading] = useState(false);
  const create = useCallback(async (_dateFrom: string, _dateTo: string): Promise<never> => unavailable(), []);
  const setState = useCallback(async (_id: string, _state: AccountingPeriod["state"], _reason: string): Promise<never> => unavailable(), []);
  const closed = useMemo(() => periods.filter((period) => period.state === "closed").length, [periods]);
  const open = useMemo(() => periods.filter((period) => period.state === "open").length, [periods]);
  return { closed, create, loading, open, periods, setState };
}
