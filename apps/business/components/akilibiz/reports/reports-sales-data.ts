"use client";

import { useCallback, useState } from "react";
import { loadAllFinancialMirrorRows, type FinancialMirrorRow } from "@/components/akilibiz/finance/financial-mirror-client";
import { mapHostedSale, saleDetailFromRows } from "@/components/akilibiz/sales-history/hosted-sales-mapper";
import type { SaleListResponse } from "@/components/akilibiz/sales-history/sales-history-data";
import { dateWithinRange, verifiedSalePaymentOutcome } from "./sales-report-validation";

export interface SalesRegisterRow { id: number; sale_number: string; sale_date_utc: string; status: string; customer_name: string | null; total_amount_ugx: number; amount_paid_ugx: number; balance_due_ugx: number; tax_amount_ugx: number; currency_code: string; reversal_status: string; }
export interface SalesReportQuery { date_from?: string; date_to?: string; skip?: number; limit?: number; }
export interface SaleReportDrillDown { sale: SalesRegisterRow; items: Array<{ name: string; quantity: number; unit_price_ugx: number; line_total_ugx: number }>; payments: Array<{ method: string; amount_ugx: number; reference: string }>; tax_amount_ugx: number; }

function registerRow(sale: SaleListResponse, source: FinancialMirrorRow): SalesRegisterRow | null {
  const outcome = verifiedSalePaymentOutcome(sale,source);
  if (!outcome) return null;
  const {paid,balance} = outcome;
  return {
    id: sale.id, sale_number: sale.sale_number, sale_date_utc: sale.created_at,
    status: sale.status, customer_name: sale.customer_name, total_amount_ugx: sale.total_amount,
    amount_paid_ugx: paid, balance_due_ugx: balance, tax_amount_ugx: sale.tax_amount,
    currency_code: "UGX", reversal_status: sale.status === "refunded" ? "refunded" : "none",
  };
}

export function useReportsSalesData() {
  const [sales, setSales] = useState<SalesRegisterRow[]>([]);
  const [rawSales, setRawSales] = useState<Array<{ sale: SaleListResponse; register: SalesRegisterRow }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getSalesRegister = useCallback(async (query: SalesReportQuery) => {
    setLoading(true);
    setError(null);
    try {
      const mirror = await loadAllFinancialMirrorRows("sales");
      const parsed = mirror.map(mapHostedSale);
      const invalid = parsed.filter(row => !row).length;
      const mapped = parsed.flatMap((sale, index) => {
        if (!sale) return [];
        const register = registerRow(sale, mirror[index]);
        return register ? [{ sale, register }] : [];
      });
      const filtered=mapped.filter(row=>
        dateWithinRange(row.register.sale_date_utc,query.date_from,query.date_to));
      const skip=Math.max(0,query.skip??0);
      const limit=Math.max(0,query.limit??filtered.length);
      const visible=filtered.slice(skip,skip+limit);
      setRawSales(visible);
      setSales(visible.map(row=>row.register));
      const omitted = mirror.length - mapped.length;
      if (omitted || invalid) setError(`${omitted} sales were not included because their synchronized payment facts could not be verified.`);
      return visible.map(row=>row.register);
    } catch (reason) {
      setRawSales([]);
      setSales([]);
      setError(reason instanceof Error ? reason.message : "Synchronized sales report is unavailable.");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);
  const getSaleReportDrillDown = useCallback(async (saleId: number): Promise<SaleReportDrillDown | null> => {
    const original = rawSales.find(s => s.sale.id === saleId);
    if (!original) return null;
    try {
      const [rows, paymentsMirror] = await Promise.all([
        loadAllFinancialMirrorRows("sale_items"),
        loadAllFinancialMirrorRows("sale_payments"),
      ]);
      const detail = saleDetailFromRows(original.sale, rows);
      if (!detail) { setError("Full sale item details have not synchronized."); return null; }
      const payments = paymentsMirror.filter(row => row.record.sale_id === saleId).map(row => {
        const r = row.record;
        const amount = r.amount_ugx ?? r.amount;
        if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 0 ||
            typeof r.payment_method !== "string" || !r.payment_method.trim()) return null;
        return {
          method: r.payment_method, amount_ugx: amount,
          reference: typeof r.payment_reference === "string" ? r.payment_reference : "",
        };
      });
      if (payments.some(p => p === null) ||
          payments.reduce((sum,p) => sum + (p?.amount_ugx ?? 0),0) !== original.register.amount_paid_ugx) {
        setError("Synchronized sale payment details are incomplete or do not reconcile.");
        return null;
      }
      return {
        sale: original.register,
        items: detail.items.map(item => ({ name: item.name, quantity: item.quantity,
          unit_price_ugx: item.unit_price, line_total_ugx: item.line_total })),
        payments: payments.filter((p): p is NonNullable<typeof p> => p !== null),
        tax_amount_ugx: detail.tax_amount,
      };
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sale report details could not be loaded.");
      return null;
    }
  }, [rawSales]);
  return { sales, getSalesRegister, getSaleReportDrillDown, loading, error };
}
