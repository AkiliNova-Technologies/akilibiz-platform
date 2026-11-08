"use client";

import { useCallback, useMemo, useState } from "react";

export type PosProduct = { id: number; name: string; sku: string; selling_price: number; stock_quantity: number; stock_unit: string; is_active: boolean; is_taxable: boolean; tax_classification_id: number | null; tax_inclusive: boolean; category_id: number | null };
export type PosCategory = { id: number; name: string };
export type PosCustomer = { id: number; name: string; phone?: string; is_active: boolean; customer_type: string; credit_limit: number; outstanding_balance: number };
export type PosCartItem = { product_id: number; name: string; price: number; quantity: number; sku: string; stock_unit: string };
export type SalePaymentMethod = "cash" | "mobile_money" | "card";
export type CreateSalePayload = { customer_id: number | null; items: Array<{ product_id: number; quantity: number; unit_price: number; discount_amount: number }>; payment_method: SalePaymentMethod; amount_paid: number; discount_amount: number; payment_reference: string | null; notes: string; due_date?: string };
export type PosRiskMetrics = { credit_utilization: number; avg_credit_amount: number; total_credit_amount: number; total_payment_amount: number; payment_ratio: number; avg_days_to_pay: number; overdue_count: number; overdue_ratio: number; longest_overdue_streak: number; customer_tenure_days: number; credit_frequency: number; recent_credit_activity: number };
export type PosRiskScore = { customer_id: number; score: number; level: string; metrics: PosRiskMetrics; factors: Array<{ name: string; score: number; weight: number; description: string }>; calculated_at: string };

export const temporaryProducts: PosProduct[] = [];
export const temporaryCategories: PosCategory[] = [];
export const temporaryCustomers: PosCustomer[] = [];

/** Browser-only POS contract; state/actions will be wired by the copied POS page. */
export function formatPosCurrency(value: number) {
  return new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(value);
}

const labels: Record<string, string> = { "pos.title": "Point of Sale", "pos.clearSale": "Clear sale", "pos.counter": "Product counter", "pos.counterDescription": "Search and add products to this sale.", "pos.search": "Search products", "products.category": "Category", "pos.refresh": "Refresh", "pos.loadingProducts": "Loading products…", "pos.noProducts": "No products found", "pos.adjustFilters": "Adjust your search or filters.", "pos.currentSale": "Current sale", "pos.cartDescription": "Review items before checkout.", "pos.noItems": "No items in this sale", "pos.noItemsDescription": "Add products from the counter.", "pos.discount": "Discount", "pos.subtotal": "Subtotal", "pos.estimatedVat": "Estimated VAT", "pos.total": "Total", "pos.completeSale": "Complete sale", "pos.placeCreditOrder": "Place credit order", "pos.customer": "Customer", "pos.walkInCustomer": "Walk-in customer", "pos.items": "Items", "pos.totalDue": "Total due", "pos.selectCustomer": "Select customer", "pos.paymentMethod": "Payment method", "pos.cash": "Cash", "pos.mobileMoney": "Mobile money", "pos.cashReceived": "Cash received", "pos.enterTender": "Enter amount", "pos.changeDue": "Change due", "pos.confirmMobileMoney": "Confirm mobile money payment", "pos.cancel": "Cancel", "pos.processing": "Processing…", "pos.switchCreditOrder": "Switch to credit order", "pos.guest": "Guest", "pos.each": "each", "pos.outOfStock": "Out of stock", "pos.taxable": "Taxable", "pos.lowStockItem": "Low stock item" };
export const t = (key: string, values?: Record<string, string | number>) => { if (key === "pos.lowStock" || key === "pos.inStock") return `${values?.count ?? 0} in stock`; if (key === "pos.saleCompleted" || key === "pos.orderPlaced") return `Sale ${values?.number ?? ""} completed`; return labels[key] ?? key; };

export function usePosData() {
  const [items, setItems] = useState<PosCartItem[]>([]); const [customerId, assignCustomer] = useState<number | undefined>(); const [discount, applyDiscount] = useState(0);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0) - discount, [items, discount]);
  const addToCart = useCallback((item: PosCartItem) => setItems((current) => [...current, item]), []);
  const updateItemQuantity = useCallback((id: number, quantity: number) => setItems((current) => current.map((item) => item.product_id === id ? { ...item, quantity } : item)), []);
  const removeFromCart = useCallback((id: number) => setItems((current) => current.filter((item) => item.product_id !== id)), []);
  const clearCart = useCallback(() => setItems([]), []);
  const addSale = useCallback(async (_payload: CreateSalePayload) => ({ id: Date.now(), sale_number: "SALE-PREVIEW" }), []);
  const scores: Record<number, PosRiskScore> = {};
  return { products: temporaryProducts, categories: temporaryCategories, customers: temporaryCustomers, loading: false, saleLoading: false, scores, riskLoading: false, taxSettings: { vat_registered: false }, cartItems: items, cartSubtotal: subtotal, cartTotal: subtotal, customerId, getProducts: async () => {}, getCategories: async () => {}, getCustomers: async () => {}, getCustomerRisk: async (_id: number) => {}, getTaxSettings: async () => {}, getTaxClassifications: async () => {}, addSale, addToReduxCart: addToCart, updateItemQuantity, removeFromCart, clearReduxCart: clearCart, applyDiscount, assignCustomer };
}
