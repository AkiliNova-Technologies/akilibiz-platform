"use client";

// Web counterparts of the desktop POS data hooks (desktop src/hooks/useRedux*.ts
// and src/services/tauri/{sales,tax}.ts), with the same names and return shapes
// so the ported desktop POS page (desktop-pos-page.tsx) stays line-for-line
// comparable with the desktop source. Data comes from the hosted catalogue,
// the read-only quote (same pricing as posting) and the hosted cash checkout.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useActiveBusinessId } from "@/components/active-business-context";
import type { PosCatalogueCategory, PosCatalogueProduct } from "@/lib/pos-catalogue";
import type { PosRiskScore } from "@/components/akilibiz/pos/pos-data";
import { attemptFor, isDefinitiveRefusal, saleFingerprint } from "@/lib/pos-sale-attempt";

// ---------------------------------------------------------------- products
type CatalogueState = { products: PosCatalogueProduct[]; categories: PosCatalogueCategory[]; loading: boolean };
type Listener = (state: CatalogueState) => void;
const catalogue: { state: CatalogueState; inflight: Promise<void> | null; business: string | null; listeners: Set<Listener> } = {
  state: { products: [], categories: [], loading: false },
  inflight: null,
  business: null,
  listeners: new Set(),
};
function publish(next: Partial<CatalogueState>) {
  catalogue.state = { ...catalogue.state, ...next };
  for (const listener of catalogue.listeners) listener(catalogue.state);
}
async function loadCatalogue(businessId: string) {
  if (catalogue.inflight && catalogue.business === businessId) return catalogue.inflight;
  catalogue.business = businessId;
  publish({ loading: true });
  catalogue.inflight = (async () => {
    try {
      const response = await fetch("/api/pos/catalogue", { cache: "no-store" });
      const body = (await response.json()) as {
        business_id?: string; products?: PosCatalogueProduct[]; categories?: PosCatalogueCategory[];
      };
      if (!response.ok || body.business_id !== businessId) throw new Error("products.loadFailed");
      publish({ products: body.products ?? [], categories: body.categories ?? [] });
    } catch {
      publish({ products: [], categories: [] });
      throw new Error("products.loadFailed");
    } finally {
      publish({ loading: false });
      catalogue.inflight = null;
    }
  })();
  return catalogue.inflight;
}
function useCatalogue() {
  const businessId = useActiveBusinessId();
  const [state, setState] = useState(catalogue.state);
  useEffect(() => {
    catalogue.listeners.add(setState);
    return () => { catalogue.listeners.delete(setState); };
  }, []);
  const reload = useCallback(() => loadCatalogue(businessId), [businessId]);
  return { ...state, reload };
}

/** Desktop-shaped product row (desktop services/tauri/products.ts), with a hosted UUID id. */
export type PortProduct = {
  id: string;
  name: string;
  sku: string;
  category_id: string | null;
  selling_price: number;
  stock_quantity: number;
  stock_unit: string;
  sales_unit: string;
  allow_decimal_quantity: boolean;
  is_active: boolean;
  tax_classification_id: null;
  tax_inclusive: boolean;
  /** Web: taxable per the desktop-published POS tax profile. */
  is_taxable: boolean;
  inventory_available: boolean;
};

export function useReduxProducts() {
  const { products, loading, reload } = useCatalogue();
  // The desktop never lists a product without a selling price, so a synced
  // product whose price is unknown is left off the web counter.
  const mapped = useMemo<PortProduct[]>(() => products.filter((p) => p.selling_price !== null).map((p) => ({
    id: p.id, name: p.name, sku: p.sku, category_id: p.category_id, selling_price: p.selling_price as number,
    stock_quantity: p.stock_quantity, stock_unit: p.stock_unit, sales_unit: p.sales_unit,
    allow_decimal_quantity: p.allow_decimal_quantity, is_active: p.is_active, tax_classification_id: null,
    tax_inclusive: p.tax_inclusive, is_taxable: p.is_taxable, inventory_available: p.inventory_available,
  })), [products]);
  const getProducts = useCallback(async () => { await reload().catch(() => undefined); }, [reload]);
  return { products: mapped, loading, getProducts };
}

export function useReduxCategories() {
  const { categories, reload } = useCatalogue();
  const getCategories = useCallback(async () => { await reload().catch(() => undefined); }, [reload]);
  return { categories, getCategories };
}

// ------------------------------------------- customers, credit risk and tax
// Customer selection and credit orders have no hosted posting path yet.
export type PortCustomer = {
  id: number; name: string; phone?: string | null; customer_type: string; is_active: boolean;
  credit_limit: number; outstanding_balance: number;
};
export function useReduxCustomers() {
  const customers = useMemo<PortCustomer[]>(() => [], []);
  const getCustomers = useCallback(async () => {}, []);
  return { customers, getCustomers };
}
export function useReduxCreditRisk() {
  const scores = useMemo<Record<number, PosRiskScore>>(() => ({}), []);
  const getCustomerRisk = useCallback(async (_id: number) => {}, []);
  return { scores, getCustomerRisk, loading: false };
}
export function useReduxTax() {
  // The quote applies the desktop-published tax profile; nothing to load here.
  const settings = useMemo(() => ({ vat_registered: true }), []);
  const classifications = useMemo<Array<{ id: number; code: string }>>(() => [], []);
  const getTaxSettings = useCallback(async () => {}, []);
  const getTaxClassifications = useCallback(async () => {}, []);
  return { settings, classifications, getTaxSettings, getTaxClassifications };
}

// -------------------------------------------------------------------- cart
export interface CartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  stock_unit?: string;
  discount?: number;
}
export function useReduxCart() {
  const businessId = useActiveBusinessId();
  const key = `akilibiz.web-pos.cart.${businessId}`;
  const [items, setItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [customerId, setCustomerId] = useState<number | undefined>(undefined);
  const restored = useRef(false);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = JSON.parse(window.sessionStorage.getItem(key) ?? "null") as { items?: CartItem[] } | null;
        if (Array.isArray(saved?.items)) setItems(saved.items);
      } catch { /* optional */ }
      restored.current = true;
    });
  }, [key]);
  useEffect(() => {
    if (!restored.current) return;
    try { window.sessionStorage.setItem(key, JSON.stringify({ items })); } catch { /* optional */ }
  }, [items, key]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  return {
    items,
    subtotal,
    discount,
    customerId,
    addToCart: useCallback((item: CartItem) => setItems((current) => [...current, item]), []),
    updateItemQuantity: useCallback((id: string, quantity: number) =>
      setItems((current) => current.map((item) => item.product_id === id ? { ...item, quantity } : item)), []),
    removeFromCart: useCallback((id: string) => setItems((current) => current.filter((item) => item.product_id !== id)), []),
    clearCart: useCallback(() => setItems([]), []),
    applyDiscount: useCallback((value: number) => setDiscount(value), []),
    assignCustomer: useCallback((id: number | undefined) => setCustomerId(id), []),
  };
}

// --------------------------------------------------------------- tax preview
export type TaxCalculationResult = { tax_amount_ugx: number; total_amount_ugx: number; subtotal_ugx: number };
const QUOTE_REASONS: Record<string, string> = {
  TAX_PROFILE_UNAVAILABLE: "The desktop has not published a VAT treatment for an item in this sale yet.",
  LINE_NOT_WHOLE_UGX: "Line amount must resolve to whole UGX",
  CART_CHANGED: "Stock or prices changed. Review the sale.",
  INSUFFICIENT_STOCK: "Not enough stock for an item in this sale.",
  PRODUCT_UNAVAILABLE: "An item in this sale is no longer available.",
  PRICE_UNAVAILABLE: "An item in this sale has no selling price.",
  INVENTORY_UNAVAILABLE: "Stock for an item in this sale has not been synchronized.",
};
export const tauriTaxService = {
  /** Same contract as the desktop's Rust preview, answered by the hosted quote. */
  async previewSaleTax(input: {
    items: Array<{ product_id: string; unit_price_ugx: number; quantity_milli: number; discount_ugx: number }>;
    discount_ugx: number;
  }): Promise<TaxCalculationResult> {
    if (input.discount_ugx !== 0 || input.items.some((item) => item.discount_ugx !== 0)) {
      throw new Error("Discounts are not available for web sales yet.");
    }
    const response = await fetch("/api/pos/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ items: input.items.map((i) => ({ product_id: i.product_id, quantity_milli: i.quantity_milli })) }),
    });
    const body = (await response.json()) as { tax_ugx?: number; total_ugx?: number; subtotal_ugx?: number; reason?: string; error?: string };
    if (!response.ok || typeof body.total_ugx !== "number" || typeof body.tax_ugx !== "number") {
      throw new Error((body.reason && QUOTE_REASONS[body.reason]) ?? body.error ?? "Sale totals could not be calculated.");
    }
    return { tax_amount_ugx: body.tax_ugx, total_amount_ugx: body.total_ugx, subtotal_ugx: body.subtotal_ugx ?? 0 };
  },
};

// --------------------------------------------------------------------- sales
export type SalePaymentMethod = "cash" | "mobile_money";
export interface CreateSalePayload {
  customer_id: number | null;
  items: Array<{ product_id: string; quantity: number; unit_price: number; discount_amount: number; entered_unit?: string; entered_quantity_milli?: number }>;
  payment_method: SalePaymentMethod;
  amount_paid: number;
  discount_amount: number;
  payment_reference: string | null;
  notes: string;
  due_date?: string;
}
/** Web result: the hosted sale is accepted and pending desktop application. */
export type PortSaleResult = { id: number | null; sale_number: string; pending_desktop: true };

export function useReduxSales() {
  const businessId = useActiveBusinessId();
  const storageKey = `akilibiz.web-pos.pending-sale.${businessId}`;
  const [loading, setLoading] = useState(false);
  const addSale = useCallback(async (payload: CreateSalePayload): Promise<PortSaleResult | null> => {
    if (payload.payment_method !== "cash" || payload.customer_id !== null || payload.due_date) {
      throw new Error("Mobile money and credit sales are not available on the web yet. Use cash here, or record this sale on the desktop.");
    }
    if (payload.discount_amount !== 0 || payload.items.some((item) => item.discount_amount !== 0)) {
      throw new Error("Discounts are not available for web sales yet.");
    }
    const items = payload.items.map((item) => ({ product_id: item.product_id, quantity_milli: Math.round(item.quantity * 1000) }));
    const fingerprint = saleFingerprint(businessId, items, payload.amount_paid);
    // Reuse the request ID of an unresolved attempt for the same sale; persist
    // it BEFORE sending so a lost response can never record the payment twice.
    let saved: unknown = null;
    try { saved = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "null"); } catch { /* optional */ }
    const attempt = attemptFor(saved, fingerprint, () => crypto.randomUUID());
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(attempt));
    } catch {
      throw new Error("Safe sale recovery is unavailable in this browser. The sale was not sent.");
    }
    setLoading(true);
    let definitive = false;
    try {
      const response = await fetch("/api/pos/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ idempotency_key: attempt.key, cash_received_ugx: payload.amount_paid, items }),
      });
      const body = (await response.json()) as {
        receipt_number?: string; status?: string; code?: string; error?: string; message?: string;
      };
      if (!response.ok) {
        // Refusals that prove nothing was posted: invalid request, not signed in,
        // not allowed, posting gate closed (423), or web sales disabled (503
        // SYNC_UNAVAILABLE before any database call). Anything else, such as a
        // stock conflict raced by another sale or a server error, is treated as
        // uncertain and keeps the request ID for a safe retry.
        definitive = isDefinitiveRefusal(response.status, body.code);
        throw new Error(body.message ?? body.error ?? "The sale was not confirmed.");
      }
      if (body.status !== "pending_desktop" || typeof body.receipt_number !== "string") {
        throw new Error("The sale response was not verified.");
      }
      definitive = true;
      return { id: null, sale_number: body.receipt_number, pending_desktop: true };
    } catch (cause) {
      if (!definitive) {
        throw new Error("The sale status is uncertain. Select Complete Sale again with the same items and cash: it will not be recorded twice.");
      }
      throw cause;
    } finally {
      if (definitive) {
        try { window.sessionStorage.removeItem(storageKey); } catch { /* optional */ }
      }
      setLoading(false);
    }
  }, [businessId, storageKey]);
  return { addSale, loading };
}
