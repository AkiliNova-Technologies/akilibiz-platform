"use client";

import { useCallback, useState } from "react";
import type { PosRiskScore } from "@/components/akilibiz/pos/pos-data";

export type CreditOrderSale = { id: number; sale_number: string; customer_name: string; customer_id: number | null; total_amount: number; amount_paid: number; balance_due: number; payment_status: string; due_date?: string | null; created_at: string; status: string; items_count: number };
export function useCreditOrdersData() { const [sales, setSales] = useState<CreditOrderSale[]>([]); const scores: Record<number, PosRiskScore> = {}; const getSales = useCallback(async (_query?: { limit: number }) => {}, []); const getCustomerRisk = useCallback(async (_id: number) => {}, []); const recordSalePayment = useCallback(async (saleId: number, payment: { amount: number; payment_method: string; payment_reference: string | null; notes: string; idempotency_key: string }) => { setSales((current) => current.map((sale) => sale.id === saleId ? { ...sale, amount_paid: sale.amount_paid + payment.amount, balance_due: sale.balance_due - payment.amount, payment_status: sale.balance_due - payment.amount <= 0 ? "paid" : "partial" } : sale)); return true; }, []); return { sales, getSales, recordSalePayment, loading: false, scores, getCustomerRisk }; }
