"use client";

import { useCallback, useState } from "react";

export type SalePaymentMethod = "cash" | "card" | "mobile_money" | "split";
export type SaleStatus = "completed" | "cancelled" | "refunded" | "pending";
export type SaleListResponse = { id: number; sale_number: string; customer_name: string | null; customer_phone?: string | null; cashier_name: string; items_count: number; subtotal: number; discount_amount: number; tax_amount: number; tax_classification: string | null; tax_rate: number | null; total_amount: number; payment_method: SalePaymentMethod; status: SaleStatus; created_at: string; staff_id?: number };
export type SaleDetailItem = { id: number; name: string; product_name: string; sku: string; stock_unit: string; quantity: number; unit_price: number; line_total: number; discount_amount?: number; tax_amount: number; tax_classification: string | null; tax_rate: number | null };
export type SaleDetail = SaleListResponse & { customer_phone?: string | null; items: SaleDetailItem[]; tax_exclusive_amount?: number | null };
export type SalesSummary = { total_sales_value: number; transaction_count: number; average_sale_value: number; refunded_count: number };
export type SalesHistoryUser = { staff_id: number };
export type SalesHistoryTaxSettings = { vat_registered: boolean; jurisdiction: string };
export type TranslationValues = Record<string, string | number>;
export type CancelSalePayload = { reason: string };

export interface SalesHistoryData {
  sales: SaleListResponse[];
  selectedSale: SaleDetail | null;
  summary: SalesSummary;
  loading: boolean;
  getSales: () => Promise<void>;
  getSale: (id: number, options?: unknown) => Promise<SaleDetail | null>;
  getSalesSummary: () => Promise<void>;
  refreshSales: () => Promise<void>;
  clearSale: () => void;
  cancelExistingSale: (id: number, payload: CancelSalePayload) => Promise<SaleDetail | null>;
  user: SalesHistoryUser | null;
  settings: SalesHistoryTaxSettings | null;
  taxSettings: SalesHistoryTaxSettings | null;
  getTaxSettings: () => Promise<void>;
}

export const t = (key: string, _values?: TranslationValues) =>
  ({ "sales.history": "Sales History", "sales.tax": "Tax" })[key] ?? key;

export const formatSalesCurrency = (value: number, _currency?: string) =>
  new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(value);

export function useSalesHistoryData(): SalesHistoryData {
  const [sales, setSales] = useState<SaleListResponse[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);
  const summary: SalesSummary = { total_sales_value: 0, transaction_count: 0, average_sale_value: 0, refunded_count: 0 };
  const user: SalesHistoryUser | null = null;
  const settings: SalesHistoryTaxSettings | null = null;
  const taxSettings: SalesHistoryTaxSettings | null = null;
  const getSales = useCallback(async (): Promise<void> => {}, []);
  const getSale = useCallback(async (id: number, _options?: unknown): Promise<SaleDetail | null> => {
    const sale = sales.find((row) => row.id === id);
    const detail = sale ? { ...sale, items: [] } : null;
    setSelectedSale(detail);
    return detail;
  }, [sales]);
  const getSalesSummary = useCallback(async (): Promise<void> => {}, []);
  const refreshSales = useCallback(async (): Promise<void> => {}, []);
  const clearSale = useCallback((): void => setSelectedSale(null), []);
  const cancelExistingSale = useCallback(async (id: number, _payload: CancelSalePayload): Promise<SaleDetail | null> => {
    const sale = sales.find((row) => row.id === id);
    if (!sale) return null;

    const cancelledSale: SaleDetail = { ...sale, status: "cancelled", items: [] };
    setSales((rows) => rows.map((row) => (row.id === id ? cancelledSale : row)));
    setSelectedSale(cancelledSale);
    return cancelledSale;
  }, [sales]);
  const getTaxSettings = useCallback(async (): Promise<void> => {}, []);

  return { sales, selectedSale, summary, loading: false, getSales, getSale, getSalesSummary, refreshSales, clearSale, cancelExistingSale, user, settings, taxSettings, getTaxSettings };
}
