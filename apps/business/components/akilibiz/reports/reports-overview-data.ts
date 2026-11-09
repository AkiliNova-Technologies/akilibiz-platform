"use client";

import { useCallback, useState } from "react";

export interface ReportsOverviewRow { id: number; report_name: string; category: string; period: string; total_value: number; entries: number; status: string; updated_at: string; }
export interface ReportsOverviewSummary { total_sales_value: number; total_inventory_value: number; total_financial_value: number; }

const reportRows: ReportsOverviewRow[] = [];

export function useReportsOverviewData() {
  const [overviewRows] = useState<ReportsOverviewRow[]>(reportRows);
  const [overviewSummary] = useState<ReportsOverviewSummary | null>(null);
  const loadOverview = useCallback(async () => overviewRows, [overviewRows]);
  return { overviewRows, overviewSummary, loading: false, error: null as string | null, loadOverview, clearError: () => {} };
}
