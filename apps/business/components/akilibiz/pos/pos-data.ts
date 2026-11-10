"use client";

import { useCallback, useMemo, useRef, useState } from "react";

export type PosProduct = { id: string; name: string; sku: string; selling_price: number | null; stock_quantity: number; stock_unit: string; inventory_available: boolean; is_active: boolean; is_taxable: boolean; tax_classification_id: number | null; tax_inclusive: boolean; category_id: string | null };
export type PosCategory = { id: string; name: string };
export type PosCustomer = { id: number; name: string; phone?: string; is_active: boolean; customer_type: string; credit_limit: number; outstanding_balance: number };
export type PosCartItem = { product_id: string; name: string; price: number; quantity: number; sku: string; stock_unit: string };
export type SalePaymentMethod = "cash" | "mobile_money" | "card";
export type CreateSalePayload = { customer_id: number | null; items: Array<{ product_id: string; quantity: number; unit_price: number; discount_amount: number }>; payment_method: SalePaymentMethod; amount_paid: number; discount_amount: number; payment_reference: string | null; notes: string; due_date?: string };
export type PosRiskMetrics = { credit_utilization: number; avg_credit_amount: number; total_credit_amount: number; total_payment_amount: number; payment_ratio: number; avg_days_to_pay: number; overdue_count: number; overdue_ratio: number; longest_overdue_streak: number; customer_tenure_days: number; credit_frequency: number; recent_credit_activity: number };
export type PosRiskScore = { customer_id: number; score: number; level: string; metrics: PosRiskMetrics; factors: Array<{ name: string; score: number; weight: number; description: string }>; calculated_at: string };

export const temporaryCustomers: PosCustomer[] = [];

/** Browser-only POS contract; state/actions will be wired by the copied POS page. */
export function formatPosCurrency(value: number) {
  return new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(value);
}

const labels: Record<string, string> = { "pos.title": "Point of Sale", "pos.clearSale": "Clear sale", "pos.counter": "Product counter", "pos.counterDescription": "Search and add products to this sale.", "pos.search": "Search products", "products.category": "Category", "pos.refresh": "Refresh", "pos.loadingProducts": "Loading products…", "pos.noProducts": "No synchronized products are available", "pos.adjustFilters": "Adjust your search or filters.", "pos.loadError": "Products could not be loaded. Check your connection and try again.", "pos.currentSale": "Current sale", "pos.cartDescription": "Review items before checkout.", "pos.noItems": "No items in this sale", "pos.noItemsDescription": "Add products from the counter.", "pos.discount": "Discount", "pos.subtotal": "Subtotal", "pos.estimatedVat": "Estimated VAT", "pos.total": "Total", "pos.completeSale": "Complete sale", "pos.placeCreditOrder": "Place credit order", "pos.customer": "Customer", "pos.walkInCustomer": "Walk-in customer", "pos.items": "Items", "pos.totalDue": "Total due", "pos.selectCustomer": "Select customer", "pos.paymentMethod": "Payment method", "pos.cash": "Cash", "pos.mobileMoney": "Mobile money", "pos.cashReceived": "Cash received", "pos.enterTender": "Enter amount", "pos.changeDue": "Change due", "pos.confirmMobileMoney": "Confirm mobile money payment", "pos.cancel": "Cancel", "pos.processing": "Processing…", "pos.switchCreditOrder": "Switch to credit order", "pos.guest": "Guest", "pos.each": "each", "pos.outOfStock": "Out of stock", "pos.taxable": "Taxable", "pos.lowStockItem": "Low stock item", "pos.priceUnavailable": "Price unavailable", "pos.inventoryUnavailable": "Inventory unavailable" };
export const t = (key: string, values?: Record<string, string | number>) => { if (key === "pos.lowStock" || key === "pos.inStock") return `${values?.count ?? 0} in stock`; if (key === "pos.saleCompleted" || key === "pos.orderPlaced") return `Sale ${values?.number ?? ""} completed`; return labels[key] ?? key; };

export function usePosData() {
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<Promise<void> | null>(null);
  const [items, setItems] = useState<PosCartItem[]>([]); const [customerId, assignCustomer] = useState<number | undefined>(); const [discount, applyDiscount] = useState(0);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0) - discount, [items, discount]);
  const addToCart = useCallback((item: PosCartItem) => setItems((current) => [...current, item]), []);
  const updateItemQuantity = useCallback((id: string, quantity: number) => setItems((current) => current.map((item) => item.product_id === id ? { ...item, quantity } : item)), []);
  const removeFromCart = useCallback((id: string) => setItems((current) => current.filter((item) => item.product_id !== id)), []);
  const clearCart = useCallback(() => setItems([]), []);
  const addSale = useCallback(async (_payload: CreateSalePayload): Promise<never> => { throw new Error("Sales are unavailable until hosted transaction posting is connected."); }, []);
  const loadCatalogue = useCallback(async () => {
    if (requestRef.current) return requestRef.current;
    const request = (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/pos/catalogue", { cache: "no-store" });
        if (!response.ok) throw new Error("catalogue request failed");
        const result = await response.json() as { products: PosProduct[]; categories: PosCategory[] };
        setProducts(result.products);
        setCategories(result.categories);
        const refreshed = new Map(result.products.map((product) => [product.id, product]));
        setItems((current) => current.flatMap((item) => {
          const product = refreshed.get(item.product_id);
          if (!product?.is_active || !product.inventory_available ||
              product.selling_price === null || product.stock_quantity <= 0) return [];
          return [{
            ...item,
            name: product.name,
            sku: product.sku,
            price: product.selling_price,
            stock_unit: product.stock_unit,
            quantity: Math.min(item.quantity, product.stock_quantity),
          }];
        }));
      } catch {
        setProducts([]);
        setCategories([]);
        setItems([]);
        setError(t("pos.loadError"));
      } finally {
        setLoading(false);
        requestRef.current = null;
      }
    })();
    requestRef.current = request;
    return request;
  }, []);
  const scores: Record<number, PosRiskScore> = {};
  return { products, categories, customers: temporaryCustomers, loading, error, saleLoading: false, scores, riskLoading: false, taxSettings: { vat_registered: false }, cartItems: items, cartSubtotal: subtotal, cartTotal: subtotal, customerId, getProducts: loadCatalogue, getCategories: loadCatalogue, getCustomers: async () => {}, getCustomerRisk: async (_id: number) => {}, getTaxSettings: async () => {}, getTaxClassifications: async () => {}, addSale, addToReduxCart: addToCart, updateItemQuantity, removeFromCart, clearReduxCart: clearCart, applyDiscount, assignCustomer };
}
