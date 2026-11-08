"use client";

import { useCallback, useState } from "react";
import { type SaleDetail, type SaleListResponse } from "@/components/akilibiz/sales-history/sales-history-data";

const purchaseSales: SaleDetail[] = [
  { id: 101, sale_number: "INV-0101", customer_name: "Amina Nansubuga", customer_phone: "+256 701 234 567", cashier_name: "AkiliBiz Staff", items_count: 2, subtotal: 78000, discount_amount: 0, tax_amount: 0, tax_classification: null, tax_rate: null, total_amount: 78000, payment_method: "cash", status: "completed", created_at: "2026-09-15T09:30:00Z", items: [{ id: 1, name: "Arabica coffee", product_name: "Arabica coffee", sku: "COF-250", stock_unit: "pack", quantity: 2, unit_price: 39000, line_total: 78000, discount_amount: 0, tax_amount: 0, tax_classification: null, tax_rate: null }] },
  { id: 102, sale_number: "INV-0102", customer_name: "Kampala Office Supplies", customer_phone: "+256 772 456 789", cashier_name: "AkiliBiz Staff", items_count: 3, subtotal: 180000, discount_amount: 0, tax_amount: 0, tax_classification: null, tax_rate: null, total_amount: 180000, payment_method: "mobile_money", status: "completed", created_at: "2026-09-12T13:00:00Z", items: [{ id: 2, name: "Office supplies", product_name: "Office supplies", sku: "OFF-100", stock_unit: "unit", quantity: 3, unit_price: 60000, line_total: 180000, discount_amount: 0, tax_amount: 0, tax_classification: null, tax_rate: null }] },
];

export function useCustomerPurchaseHistoryData() {
  const [sales] = useState<SaleDetail[]>(purchaseSales);
  const getSales = useCallback(async (): Promise<SaleListResponse[]> => sales, [sales]);
  const getSale = useCallback(async (id: number): Promise<SaleDetail | null> => sales.find((sale) => sale.id === id) ?? null, [sales]);
  return { sales, loading: false, getSales, getSale };
}
