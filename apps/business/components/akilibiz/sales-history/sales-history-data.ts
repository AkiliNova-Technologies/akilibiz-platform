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
  summary: SalesSummary | null;
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

const salesLabels: Record<string, string> = {
  "sales.history": "Sales History",
  "sales.records": "Sales records",
  "sales.recordsDescription": "View and manage sales transactions.",
  "sales.totalSales": "Total sales",
  "sales.totalSalesDescription": "Value of completed sales",
  "sales.transactions": "Transactions",
  "sales.transactionsDescription": "Completed transactions",
  "sales.vatCollected": "VAT collected",
  "sales.vatCollectedDescription": "VAT on completed sales",
  "sales.averageSale": "Average sale",
  "sales.averageSaleDescription": "Average completed sale amount",
  "sales.paymentMethod": "Payment method",
  "sales.allPaymentMethods": "All payment methods",
  "sales.status": "Status",
  "sales.allStatuses": "All statuses",
  "sales.completed": "Completed",
  "sales.pending": "Pending",
  "sales.refunded": "Refunded",
  "sales.cancelledStatus": "Cancelled",
  "sales.cashier": "Cashier",
  "sales.invoice": "Invoice",
  "sales.dateTime": "Date and time",
  "sales.payment": "Payment",
  "sales.tax": "Tax",
  "sales.view": "View",
  "sales.printReceipt": "Print receipt",
  "sales.cancelSale": "Cancel sale",
  "sales.tableDescription": "Sales transactions and their payment details",
  "sales.search": "Search sales",
  "sales.empty": "Sales history is unavailable until sales synchronization is connected.",
  "sales.details": "Sale details",
  "sales.detailsDescription": "Review the sale details.",
  "sales.total": "Total",
  "sales.subtotal": "Subtotal",
  "sales.discount": "Discount",
  "sales.items": "Items",
  "sales.fullReceipt": "Full receipt",
  "sales.keepSale": "Keep sale",
  "sales.cancelReason": "Reason for cancellation",
  "sales.cancelReasonHint": "Enter the reason for cancelling this sale",
  "sales.confirmCancellation": "Confirm cancellation",
  "sales.cancelling": "Cancelling…",
  "sales.receiptUnavailable": "Receipt is not available.",
  "sales.staffRequired": "Staff access is required.",
  "sales.reasonRequired": "Enter a cancellation reason.",
  "sales.cancelDescription": "Are you sure you want to cancel sale {number}?",
  "sales.cancelled": "Sale {number} cancelled.",
  "sales.vatNotice": "VAT is recorded for {jurisdiction}.",
  "pos.cash": "Cash",
  "pos.card": "Card",
  "pos.mobileMoney": "Mobile Money",
  "pos.split": "Split",
  "pos.customer": "Customer",
  "pos.items": "Items",
  "pos.total": "Total"
};
export const t = (key: string, values?: TranslationValues) => {
  const label = salesLabels[key] ?? key;
  return label.replace(/\\{(\\w+)\\}/g, (match, field: string) =>
    values?.[field] === undefined ? match : String(values[field]),
  );
};

export const formatSalesCurrency = (value: number, _currency?: string) =>
  new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(value);

export function useSalesHistoryData(): SalesHistoryData {
  const [sales, setSales] = useState<SaleListResponse[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);
  const summary: SalesSummary | null = null;
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
  // Hosted cancellation is unavailable; never mutate local state as if the sale was cancelled.
  const cancelExistingSale = useCallback(async (_id: number, _payload: CancelSalePayload): Promise<SaleDetail | null> => {
    throw new Error("Sale cancellation is unavailable until hosted transactions are connected.");
  }, []);
  const getTaxSettings = useCallback(async (): Promise<void> => {}, []);

  return { sales, selectedSale, summary, loading: false, getSales, getSale, getSalesSummary, refreshSales, clearSale, cancelExistingSale, user, settings, taxSettings, getTaxSettings };
}
