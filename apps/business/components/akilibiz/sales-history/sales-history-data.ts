"use client";

import { useCallback, useState } from "react";
import { loadAllFinancialMirrorRows } from "@/components/akilibiz/finance/financial-mirror-client";
import { mapHostedSale, saleDetailFromRows } from "./hosted-sales-mapper";

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
  "sales.allCashiers": "All cashiers",
  "sales.phone": "Phone",
  "sales.date": "Date",
  "sales.itemsCount": "Items",
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
  "sales.empty": "No synchronized sales have been received for this business yet.",
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
  return label.replace(/\{(\w+)\}/g, (match, field: string) =>
    values?.[field] === undefined ? match : String(values[field]),
  );
};

export const formatSalesCurrency = (value: number, _currency?: string) =>
  new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(value);

export function useSalesHistoryData(): SalesHistoryData & { error: string | null } {
  const [sales, setSales] = useState<SaleListResponse[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summary: SalesSummary = {
    total_sales_value: sales.filter(s => s.status === "completed").reduce((n, s) => n + s.total_amount, 0),
    transaction_count: sales.filter(s => s.status === "completed").length,
    average_sale_value: 0,
    refunded_count: sales.filter(s => s.status === "refunded").length,
  };
  summary.average_sale_value = summary.transaction_count ? summary.total_sales_value / summary.transaction_count : 0;

  const user: SalesHistoryUser | null = null;
  const settings: SalesHistoryTaxSettings | null = null;
  const taxSettings: SalesHistoryTaxSettings | null = null;
  const getSales = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const mirror = await loadAllFinancialMirrorRows("sales");
      const mapped = mirror.map(mapHostedSale);
      const invalid = mapped.filter(s => s === null).length;
      setSales(mapped.filter((s): s is SaleListResponse => s !== null));
      if (invalid) setError(`${invalid} synchronized sales could not be displayed because their financial details were incomplete.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Synchronized sales could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);
  const getSale = useCallback(async (id: number, _options?: unknown): Promise<SaleDetail | null> => {
    const sale = sales.find(s => s.id === id);
    if (!sale) return null;
    try {
      const lines = await loadAllFinancialMirrorRows("sale_items");
      const detail = saleDetailFromRows(sale, lines);
      if (!detail) {
        setError("The sale's complete item details are not available in the synchronized records.");
        return null;
      }
      setSelectedSale(detail);
      return detail;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sale details could not be loaded.");
      return null;
    }
  }, [sales]);
  const getSalesSummary = useCallback(async (): Promise<void> => {}, []);
  const refreshSales = getSales;
  const clearSale = useCallback((): void => setSelectedSale(null), []);
  const cancelExistingSale = useCallback(async (_id: number, _payload: CancelSalePayload): Promise<never> => {
    throw new Error("Sale cancellation is unavailable until hosted transactions are connected.");
  }, []);
  const getTaxSettings = useCallback(async (): Promise<void> => {}, []);
  return { sales, selectedSale, summary, loading, error, getSales, getSale, getSalesSummary,
    refreshSales, clearSale, cancelExistingSale, user, settings, taxSettings, getTaxSettings };
}
