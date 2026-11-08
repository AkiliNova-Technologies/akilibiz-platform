"use client";

import { useCallback, useMemo, useState } from "react";
import { type CustomerCreditRow, type PurchasePaymentMethod, type RiskLevel, useCustomersData } from "./customers-data";

export interface CreditSale { id: number; sale_number: string; customer_id: number; balance_due: number; status: "completed" | "cancelled"; }
export interface SalePaymentHistoryEntry { id: number; payment_date: string; amount: number; payment_method: PurchasePaymentMethod; payment_reference?: string | null; remaining_balance: number; }
export interface RecordSalePaymentPayload { amount: number; payment_method: PurchasePaymentMethod; payment_reference?: string | null; notes?: string | null; idempotency_key?: string | null; }
const initialSales: CreditSale[] = [{ id: 41, sale_number: "INV-0041", customer_id: 1, balance_due: 25000, status: "completed" }, { id: 42, sale_number: "INV-0042", customer_id: 2, balance_due: 180000, status: "completed" }];
const daysSince = (value: string) => Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
const risk = (days: number, balance: number): RiskLevel => days > 30 || balance >= 300000 ? "High" : days > 0 ? "Medium" : "Low";

export function useCreditManagementData() {
  const { customers } = useCustomersData();
  const [sales, setSales] = useState<CreditSale[]>(initialSales);
  const [histories, setHistories] = useState<Record<number, SalePaymentHistoryEntry[]>>({});
  const creditAccounts = useMemo<CustomerCreditRow[]>(() => customers.flatMap((customer) => {
    const customerSales = sales.filter((sale) => sale.customer_id === customer.id && sale.status !== "cancelled" && sale.balance_due > 0);
    const outstanding = customerSales.reduce((total, sale) => total + sale.balance_due, 0);
    if (!outstanding) return [];
    const dueDate = customer.id === 2 ? "2026-08-15T00:00:00Z" : "2026-09-30T00:00:00Z";
    const daysOverdue = daysSince(dueDate); const overdue = daysOverdue > 0 ? outstanding : 0; const level = risk(daysOverdue, outstanding);
    return [{ id: customer.id, customer_name: customer.name, phone: customer.phone ?? "—", credit_limit: customer.credit_limit, outstanding_balance: outstanding, overdue_amount: overdue, last_payment_date: customerSales.flatMap((sale) => histories[sale.id] ?? []).at(-1)?.payment_date ?? null, due_date: dueDate, days_overdue: daysOverdue, risk_level: level, status: level === "High" ? "Critical" : daysOverdue > 0 ? "Overdue" : "Current" }];
  }), [customers, histories, sales]);
  const getCreditAccounts = useCallback(async () => creditAccounts, [creditAccounts]);
  const getSales = useCallback(async () => sales, [sales]);
  const getSalePaymentHistory = useCallback(async (_customerId: number, saleId: number) => histories[saleId] ?? [], [histories]);
  const recordSalePayment = useCallback(async (saleId: number, payload: RecordSalePaymentPayload) => {
    const sale = sales.find((item) => item.id === saleId);
    if (!sale || !Number.isSafeInteger(payload.amount) || payload.amount <= 0 || payload.amount > sale.balance_due) return null;
    const remaining = sale.balance_due - payload.amount;
    setSales((items) => items.map((item) => item.id === saleId ? { ...item, balance_due: remaining } : item));
    setHistories((items) => ({ ...items, [saleId]: [...(items[saleId] ?? []), { id: Date.now(), payment_date: new Date().toISOString(), amount: payload.amount, payment_method: payload.payment_method, payment_reference: payload.payment_reference, remaining_balance: remaining }] }));
    return { ...sale, balance_due: remaining };
  }, [sales]);
  return { creditAccounts, loading: false, sales, getCreditAccounts, getSales, getSalePaymentHistory, recordSalePayment };
}
