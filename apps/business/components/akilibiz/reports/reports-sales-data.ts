"use client";

import { useCallback, useState } from "react";

export interface SalesRegisterRow { id: number; sale_number: string; sale_date_utc: string; status: string; customer_name: string | null; total_amount_ugx: number; amount_paid_ugx: number; balance_due_ugx: number; tax_amount_ugx: number; currency_code: string; reversal_status: string; }
export interface SalesReportQuery { date_from?: string; date_to?: string; skip?: number; limit?: number; }
export interface SaleReportDrillDown { sale: SalesRegisterRow; items: Array<{ name: string; quantity: number; unit_price_ugx: number; line_total_ugx: number }>; payments: Array<{ method: string; amount_ugx: number; reference: string }>; tax_amount_ugx: number; }

const register: SalesRegisterRow[] = [];

export function useReportsSalesData() {
  const [sales] = useState<SalesRegisterRow[]>(register);
  const getSalesRegister = useCallback(async (query: SalesReportQuery) => sales.filter((sale) => (!query.date_from || sale.sale_date_utc >= query.date_from) && (!query.date_to || sale.sale_date_utc <= query.date_to)).slice(query.skip ?? 0, (query.skip ?? 0) + (query.limit ?? sales.length)), [sales]);
  const getSaleReportDrillDown = useCallback(async (_saleId: number): Promise<SaleReportDrillDown | null> => null, []);
  return { sales, getSalesRegister, getSaleReportDrillDown };
}
