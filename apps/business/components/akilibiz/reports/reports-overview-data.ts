"use client";

import { useCallback, useMemo, useState } from "react";

export interface ReportsOverviewRow { id: number; report_name: string; category: string; period: string; total_value: number; entries: number; status: string; updated_at: string; }
export interface ReportsOverviewSummary { total_sales_value: number; total_inventory_value: number; total_financial_value: number; }

const reportRows: ReportsOverviewRow[] = [
  { id: 1, report_name: "Sales Report", category: "Sales", period: "Current month", total_value: 735000, entries: 2, status: "Up to Date", updated_at: "2026-09-19" },
  { id: 2, report_name: "Purchasing Report", category: "Purchasing", period: "Current month", total_value: 350000, entries: 1, status: "Up to Date", updated_at: "2026-09-19" },
  { id: 3, report_name: "Inventory Report", category: "Inventory", period: "Current", total_value: 1250000, entries: 22, status: "Up to Date", updated_at: "2026-09-19" },
  { id: 4, report_name: "Financial Report", category: "Finance", period: "Current month", total_value: 550000, entries: 6, status: "Up to Date", updated_at: "2026-09-19" },
];

export function useReportsOverviewData() {
  const [overviewRows] = useState<ReportsOverviewRow[]>(reportRows);
  const overviewSummary = useMemo<ReportsOverviewSummary>(() => ({ total_sales_value: overviewRows.filter((row) => row.category === "Sales").reduce((total, row) => total + row.total_value, 0), total_inventory_value: overviewRows.filter((row) => row.category === "Inventory").reduce((total, row) => total + row.total_value, 0), total_financial_value: overviewRows.filter((row) => row.category === "Finance").reduce((total, row) => total + row.total_value, 0) }), [overviewRows]);
  const loadOverview = useCallback(async () => overviewRows, [overviewRows]);
  return { overviewRows, overviewSummary, loading: false, error: null as string | null, loadOverview, clearError: () => {} };
}
