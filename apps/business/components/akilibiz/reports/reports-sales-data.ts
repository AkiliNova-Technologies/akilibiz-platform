"use client";

import { useCallback, useState } from "react";

export interface SalesRegisterRow { id: number; sale_number: string; sale_date_utc: string; status: string; customer_name: string | null; total_amount_ugx: number; amount_paid_ugx: number; balance_due_ugx: number; tax_amount_ugx: number; currency_code: string; reversal_status: string; }
export interface SalesReportQuery { date_from?: string; date_to?: string; skip?: number; limit?: number; }
export interface SaleReportDrillDown { sale: SalesRegisterRow; items: Array<{ name: string; quantity: number; unit_price_ugx: number; line_total_ugx: number }>; payments: Array<{ method: string; amount_ugx: number; reference: string }>; tax_amount_ugx: number; }

const register: SalesRegisterRow[] = [
  { id: 1, sale_number: "SAL-20260919-001", sale_date_utc: "2026-09-19", status: "Completed", customer_name: "Walk-in customer", total_amount_ugx: 420000, amount_paid_ugx: 420000, balance_due_ugx: 0, tax_amount_ugx: 64068, currency_code: "UGX", reversal_status: "Not reversed" },
  { id: 2, sale_number: "SAL-20260917-002", sale_date_utc: "2026-09-17", status: "Completed", customer_name: "Sarah Namutebi", total_amount_ugx: 315000, amount_paid_ugx: 200000, balance_due_ugx: 115000, tax_amount_ugx: 48051, currency_code: "UGX", reversal_status: "Not reversed" },
];

export function useReportsSalesData() {
  const [sales] = useState<SalesRegisterRow[]>(register);
  const getSalesRegister = useCallback(async (query: SalesReportQuery) => sales.filter((sale) => (!query.date_from || sale.sale_date_utc >= query.date_from) && (!query.date_to || sale.sale_date_utc <= query.date_to)).slice(query.skip ?? 0, (query.skip ?? 0) + (query.limit ?? sales.length)), [sales]);
  const getSaleReportDrillDown = useCallback(async (saleId: number): Promise<SaleReportDrillDown | null> => { const sale = sales.find((item) => item.id === saleId); if (!sale) return null; return { sale, items: [{ name: "Business supplies", quantity: 1, unit_price_ugx: sale.total_amount_ugx, line_total_ugx: sale.total_amount_ugx }], payments: [{ method: sale.amount_paid_ugx === sale.total_amount_ugx ? "Mobile Money" : "Cash", amount_ugx: sale.amount_paid_ugx, reference: sale.sale_number }], tax_amount_ugx: sale.tax_amount_ugx }; }, [sales]);
  return { sales, getSalesRegister, getSaleReportDrillDown };
}
