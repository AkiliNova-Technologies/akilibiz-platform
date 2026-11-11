"use client";
import { useCallback, useState } from "react";
import { loadAllFinancialMirrorRows } from "@/components/akilibiz/finance/financial-mirror-client";
import { mapFinanceTransaction } from "@/components/akilibiz/finance/financial-mirror-mappers";
import { mapHostedSale } from "@/components/akilibiz/sales-history/hosted-sales-mapper";

export interface ReportsOverviewRow {
  id: number; report_name: string; category: string; period: string;
  total_value: number; entries: number; status: string; updated_at: string;
}
export interface ReportsOverviewSummary {
  total_sales_value: number | null;
  total_inventory_value: number | null;
  total_financial_value: number | null;
}

export function useReportsOverviewData() {
  const [overviewRows, setOverviewRows] = useState<ReportsOverviewRow[]>([]);
  const [overviewSummary, setOverviewSummary] = useState<ReportsOverviewSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [salesRows, financeRows] = await Promise.all([
        loadAllFinancialMirrorRows("sales"),
        loadAllFinancialMirrorRows("finance_transactions"),
      ]);
      const sales = salesRows.map(mapHostedSale);
      const transactions = financeRows.map(mapFinanceTransaction);
      if (sales.some(s => s === null) || transactions.some(t => t === null)) {
        throw new Error("Some financial records are incomplete. Report totals cannot be verified.");
      }
      const completed = sales.filter((sale): sale is NonNullable<typeof sale> =>
        sale !== null && sale.status === "completed");
      const posted = transactions.filter((t): t is NonNullable<typeof t> => t !== null);
      const salesValue = completed.reduce((n, sale) => n + sale.total_amount, 0);
      const financeValue = posted.reduce((n, item) => n + item.amount, 0);
      const updatedAt = [...salesRows, ...financeRows]
        .map(row => row.capturedAt).filter(Boolean).sort().at(-1) ?? new Date().toISOString();
      const rows: ReportsOverviewRow[] = [
        { id: 1, report_name: "Sales", category: "Sales",
          period: "All available records", total_value: salesValue,
          entries: completed.length, status: "Available", updated_at: updatedAt },
        { id: 2, report_name: "Recorded financial activity", category: "Finance",
          period: "All available records", total_value: financeValue,
          entries: posted.length, status: "Available", updated_at: updatedAt },
      ];
      setOverviewRows(rows);
      setOverviewSummary({
        total_sales_value: salesValue,
        total_inventory_value: null, // Cost-based valuation has not been qualified.
        total_financial_value: financeValue,
      });
      return rows;
    } catch (reason) {
      setOverviewRows([]);
      setOverviewSummary(null);
      setError(reason instanceof Error ? reason.message : "Reports could not be loaded.");
      return [];
    } finally { setLoading(false); }
  }, []);
  return { overviewRows, overviewSummary, loading, error, loadOverview, clearError: () => setError(null) };
}
