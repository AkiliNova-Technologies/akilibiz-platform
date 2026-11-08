"use client";

import { useCallback, useState } from "react";
import type { PurchaseOrder } from "@/components/akilibiz/suppliers/purchase-orders-data";

export interface GoodsReceivedRegisterRow { id: number; receipt_number: string; receipt_date_utc: string; status: "posted" | "voided"; supplier_name: string; total_amount_ugx: number; tax_amount_ugx: number; currency_code: "UGX"; reversal_status: string; purchase_order?: Pick<PurchaseOrder, "id" | "po_number" | "items_count">; }
export interface PurchasingReportQuery { date_from?: string; date_to?: string; skip?: number; limit?: number; }

const receipts: GoodsReceivedRegisterRow[] = [
  { id: 1, receipt_number: "GRN-20260919-001", receipt_date_utc: "2026-09-19", status: "posted", supplier_name: "Kampala Traders", total_amount_ugx: 350000, tax_amount_ugx: 0, currency_code: "UGX", reversal_status: "Not reversed", purchase_order: { id: 1, po_number: "PO-20260919-001", items_count: 4 } },
];

export function useReportsPurchasingData() {
  const [goodsReceived] = useState<GoodsReceivedRegisterRow[]>(receipts);
  const getGoodsReceivedRegister = useCallback(async (query: PurchasingReportQuery) => goodsReceived.filter((receipt) => (!query.date_from || receipt.receipt_date_utc >= query.date_from) && (!query.date_to || receipt.receipt_date_utc <= query.date_to)).slice(query.skip ?? 0, (query.skip ?? 0) + (query.limit ?? goodsReceived.length)), [goodsReceived]);
  return { goodsReceived, getGoodsReceivedRegister };
}
