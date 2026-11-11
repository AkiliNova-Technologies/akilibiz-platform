"use client";

import { useCallback, useState } from "react";
import { loadAllFinancialMirrorRows } from "@/components/akilibiz/finance/financial-mirror-client";
import { mapHostedSale, saleDetailFromRows } from "@/components/akilibiz/sales-history/hosted-sales-mapper";
import type { SaleListResponse } from "@/components/akilibiz/sales-history/sales-history-data";

export interface SalesRegisterRow { id: number; sale_number: string; sale_date_utc: string; status: string; customer_name: string | null; total_amount_ugx: number; amount_paid_ugx: number; balance_due_ugx: number; tax_amount_ugx: number; currency_code: string; reversal_status: string; }
export interface SalesReportQuery { date_from?: string; date_to?: string; skip?: number; limit?: number; }
export interface SaleReportDrillDown { sale: SalesRegisterRow; items: Array<{ name: string; quantity: number; unit_price_ugx: number; line_total_ugx: number }>; payments: Array<{ method: string; amount_ugx: number; reference: string }>; tax_amount_ugx: number; }

function registerRow(sale: SaleListResponse): SalesRegisterRow {
  const paid = Math.min(sale.total_amount, sale.total_amount);
  return {
    id: sale.id, sale_number: sale.sale_number, sale_date_utc: sale.created_at,
    status: sale.status, customer_name: sale.customer_name, total_amount_ugx: sale.total_amount,
    amount_paid_ugx: paid, balance_due_ugx: 0, tax_amount_ugx: sale.tax_amount,
    currency_code: "UGX", reversal_status: sale.status === "refunded" ? "refunded" : "none",
  };
}

export function useReportsSalesData() {
  const [sales, setSales] = useState<SalesRegisterRow[]>([]);
  const [rawSales, setRawSales] = useState<SaleListResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getSalesRegister = useCallback(async (query: SalesReportQuery) => {
    setLoading(true);
    setError(null);
    try {
      const mirror = await loadAllFinancialMirrorRows("sales");
      const parsed = mirror.map(mapHostedSale);
      const invalid = parsed.filter(row => !row).length;
      const mapped = parsed.filter((row): row is SaleListResponse => row !== null);
      setRawSales(mapped);
      setSales(mapped.map(registerRow));
      if (invalid) setError(`${invalid} sales were not included because their synchronized totals are incomplete.`);
      return mapped.map(registerRow).filter(s => (!query.date_from || s.sale_date_utc >= query.date_from) &&
        (!query.date_to || s.sale_date_utc.slice(0,10) <= query.date_to))
        .slice(query.skip ?? 0, (query.skip ?? 0) + (query.limit ?? mapped.length));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Synchronized sales report is unavailable.");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  const getSaleReportDrillDown = useCallback(async (saleId: number): Promise<SaleReportDrillDown | null> => {
    const original = rawSales.find(s => s.id === saleId);
    if (!original) return null;
    try {
      const rows = await loadAllFinancialMirrorRows("sale_items");
      const detail = saleDetailFromRows(original, rows);
      if (!detail) { setError("Full sale item details have not synchronized."); return null; }
      return {
        sale: registerRow(original),
        items: detail.items.map(item => ({ name: item.name, quantity: item.quantity,
          unit_price_ugx: item.unit_price, line_total_ugx: item.line_total })),
        payments: [],
        tax_amount_ugx: detail.tax_amount,
      };
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sale report details could not be loaded.");
      return null;
    }
  }, [rawSales]);
  return { sales, getSalesRegister, getSaleReportDrillDown, loading, error };
}
