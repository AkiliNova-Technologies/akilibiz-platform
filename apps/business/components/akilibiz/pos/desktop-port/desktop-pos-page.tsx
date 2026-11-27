"use client";

// PORTED from the AkiliBiz Desktop repository (src/app/dashboard/POSPage.tsx).
// Keep this file line-for-line comparable with the desktop source: imports
// point at web counterparts with the same names and shapes, and every web
// difference is marked "WEB:". Data comes from desktop-port/hooks.ts.

import { useState, useEffect, useMemo } from "react";
import { tauriTaxService, type TaxCalculationResult } from "@/components/akilibiz/pos/desktop-port/hooks";
import { SalePrintPreviewDialog } from "@/components/akilibiz/documents/SalePrintPreviewDialog";
// WEB: the page title comes from the shell header; Clear sale is registered with it.
import { usePosHeaderControls } from "@/components/akilibiz/pos/pos-header-actions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/akilibiz/desktop-shared/searchable-select";
import { Label } from "@/components/ui/label";
import { FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  IconSearch,
  IconPlus,
  IconMinus,
  IconTrash,
  IconReceipt,
  IconCash,
  IconX,
  IconShoppingCart,
  IconPackage,
  IconDeviceMobile,
  IconRefresh,
  IconAlertTriangle,
  IconBarcode,
  IconLayoutGrid,
  IconList,
  IconLayoutCards,
  IconCheck,
  IconUser,
  IconCalendar,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useReduxProducts,
  useReduxCart,
  useReduxSales,
  useReduxCategories,
  useReduxCustomers,
  useReduxCreditRisk,
  useReduxTax,
} from "@/components/akilibiz/pos/desktop-port/hooks";
import { validatePosQuantity } from "@/lib/desktop-shared/pos-quantity";
import { compatibleSaleUnits, saleToStockQuantity, stockToSaleQuantity } from "@/lib/desktop-shared/sale-unit-conversion";
import { isLikelyPackagedVolume, permitsFractionalSales } from "@/lib/desktop-shared/product-quantity-behavior";
import { RiskBadge } from "@/components/akilibiz/risk-badge";
import { toast } from "sonner";
import type {
  CreateSalePayload,
  SalePaymentMethod,
} from "@/components/akilibiz/pos/desktop-port/hooks";
import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
import { formatCurrency } from "@/lib/i18n";

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string; // WEB: hosted product UUID (desktop: local numeric id)
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  stockUnit: string;
  configuredSalesUnit: string;
  allowsDecimal: boolean;
  likelyPackagedVolume: boolean;
  isActive: boolean;
  isTaxable: boolean;
  taxClassificationId: number | null;
  taxInclusive: boolean;
  image?: string;
}

type CheckoutMode = "sale" | "order";
type ProductView = "compact" | "grid" | "list";

// Manual Mobile Money recording only: no payment request or provider verification
// is available in the current Tauri sale contract.
function normalizeUgandanMobileNumber(value: string): string | null {
  const digits = value.replace(/[\s()-]/g, "");
  const local = digits.startsWith("+256")
    ? "0" + digits.slice(4)
    : digits.startsWith("256")
      ? "0" + digits.slice(3)
      : digits;
  return /^0[37]\d{8}$/.test(local) ? local : null;
}


const POS_VIEW_STORAGE_KEY = "akilibiz.pos.product-view";

// ============================================================================
// UTILITIES
// ============================================================================

function MeasuredQuantityInput({
  quantity, unit, max, onCommit,
}: {
  quantity: number;
  unit: string;
  max: number;
  onCommit: (quantity: number) => void;
}) {
  const [draft, setDraft] = useState(String(quantity));
  const commit = () => {
    const parsed = Number(draft);
    if (!draft.trim() || !Number.isFinite(parsed) || parsed <= 0 || parsed > max) {
      setDraft(String(quantity));
      return;
    }
    onCommit(parsed);
    setDraft(String(quantity));
  };
  return (
    <Input
      aria-label={`Quantity in ${unit}`}
      title={`Enter quantity in ${unit} (up to three decimals)`}
      type="number"
      min="0.001"
      max={max}
      step="0.001"
      inputMode="decimal"
      className="h-9 w-[82px] rounded-full px-2 text-center text-sm tabular-nums"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }}
    />
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function POSPage() {
  const { t } = useI18n();
  const { products, loading, getProducts } = useReduxProducts();
  const { categories, getCategories } = useReduxCategories();
  const { addSale, loading: saleLoading } = useReduxSales();
  const { customers, getCustomers } = useReduxCustomers();
  const {
    scores,
    getCustomerRisk,
    loading: riskLoading,
  } = useReduxCreditRisk();
  const {
    settings: taxSettings,
    classifications,
    getTaxSettings,
    getTaxClassifications,
  } = useReduxTax();

  const {
    items: cartItems,
    subtotal: cartSubtotal,
    customerId,
    addToCart: addToReduxCart,
    updateItemQuantity,
    removeFromCart,
    clearCart: clearReduxCart,
    applyDiscount,
    assignCustomer,
  } = useReduxCart();

  const [productView, setProductView] = useState<ProductView>(() => {
    try {
      const saved = window.localStorage.getItem(POS_VIEW_STORAGE_KEY);
      return saved === "compact" || saved === "grid" || saved === "list"
        ? saved
        : "compact";
    } catch {
      return "compact";
    }
  });
  const changeProductView = (view: ProductView) => {
    setProductView(view);
    try {
      window.localStorage.setItem(POS_VIEW_STORAGE_KEY, view);
    } catch {
      // Persisting a display preference must never block a sale.
    }
  };
  const [saleUnits, setSaleUnits] = useState<Record<string, string>>({}); // WEB: UUID keys
  const effectiveSaleUnit = (product: Product) => {
    const options = compatibleSaleUnits(product.stockUnit);
    const preferred = saleUnits[product.id] ?? product.configuredSalesUnit;
    return options.includes(preferred) ? preferred : product.stockUnit;
  };
  const setSaleUnit = (product: Product, unit: string) => {
    if (!compatibleSaleUnits(product.stockUnit).includes(unit)) return;
    setSaleUnits((previous) => ({ ...previous, [product.id]: unit }));
  };
  const changeSaleQuantity = (product: Product, rawQuantity: string) => {
    if (rawQuantity.trim() === "0") {
      updateQuantity(product.id, 0);
      return;
    }
    const unit = effectiveSaleUnit(product);
    const stockQuantity = saleToStockQuantity(rawQuantity, unit, product.stockUnit);
    if (stockQuantity === null) {
      toast.error("That quantity cannot be recorded exactly in stock units.");
      return;
    }
    updateQuantity(product.id, stockQuantity);
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("sale");
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState<"MTN MoMo" | "Airtel Money">("MTN MoMo");
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState("");
  const [mobileMoneyStatus, setMobileMoneyStatus] = useState<"ready" | "unavailable">("ready");
  const [discount, setDiscount] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [creditWarningDialog, setCreditWarningDialog] = useState(false);
  const [salePrintSaleId, setSalePrintSaleId] = useState<number | null>(null);
  const [salePrintOpen, setSalePrintOpen] = useState(false);

  useEffect(() => {
    void Promise.all([
      getProducts(),
      getCategories(),
      getCustomers(),
      getTaxSettings(),
      getTaxClassifications(),
    ]);
  }, [getProducts, getCategories, getCustomers, getTaxSettings, getTaxClassifications]);

  const customerOptions = useMemo(() => {
    return customers
      .filter((customer) => customer.is_active)
      .map((customer) => ({
        id: customer.id,
        name: customer.name,
        phone: customer.phone || undefined,
        type: customer.customer_type,
        credit_limit: customer.credit_limit,
        outstanding_balance: customer.outstanding_balance,
      }));
  }, [customers]);

  const categoryMap = useMemo(() => {
    return new Map(categories.map((cat) => [cat.id, cat.name]));
  }, [categories]);

  const localCategories = useMemo(
    () => ["All", ...categories.map((cat) => cat.name)],
    [categories],
  );

  const classificationCodes = useMemo(
    () => new Map(classifications.map((classification) => [classification.id, classification.code])),
    [classifications],
  );

  const localProducts = useMemo<Product[]>(() => {
    return products.map((product) => {
      const price =
        typeof product.selling_price === "string"
          ? parseFloat(product.selling_price)
          : product.selling_price;

      const categoryName = product.category_id
        ? categoryMap.get(product.category_id) ||
          `Category ${product.category_id}`
        : "Uncategorized";

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: categoryName,
        price,
        stock: Number(product.stock_quantity || 0),
        stockUnit: product.stock_unit || "pcs",
        configuredSalesUnit: product.sales_unit || product.stock_unit || "pcs",
        allowsDecimal: permitsFractionalSales(product.stock_unit || "pcs", Boolean(product.allow_decimal_quantity)),
        likelyPackagedVolume: isLikelyPackagedVolume(product.name, product.stock_unit || "pcs"),
        isActive: Boolean(product.is_active),
        // WEB: taxable per the desktop-published POS tax profile.
        isTaxable: product.is_taxable,
        taxClassificationId: product.tax_classification_id || null,
        taxInclusive: Boolean(product.tax_inclusive),
        image: undefined,
      };
    });
  }, [products, categoryMap]); // WEB: taxable flag no longer needs classificationCodes

  const selectedCustomer = useMemo(() => {
    return (
      customerOptions.find((customer) => customer.id === customerId) || null
    );
  }, [customerId, customerOptions]);

  const selectedCustomerRisk = useMemo(() => {
    if (!customerId) return null;
    return scores[customerId] || null;
  }, [customerId, scores]);

  // Recalculate the entire invoice in Rust. The backend resolves the current
  // product VAT treatment, registration, discounts and invoice-level rounding.
  const previewKey = useMemo(
    () => JSON.stringify({ items: cartItems, discount, registered: taxSettings?.vat_registered }),
    [cartItems, discount, taxSettings?.vat_registered],
  );
  const [taxPreview, setTaxPreview] = useState<{
    key: string;
    result: TaxCalculationResult | null;
    error: string | null;
  }>({ key: "", result: null, error: null });
  /* eslint-disable react-hooks/set-state-in-effect -- WEB: kept identical to
     the desktop source; the reset is keyed by previewKey so it cannot loop. */
  useEffect(() => {
    let active = true;
    if (cartItems.length === 0) {
      setTaxPreview({ key: previewKey, result: null, error: null });
      return;
    }
    setTaxPreview({ key: previewKey, result: null, error: null });
    const timer = window.setTimeout(async () => {
      try {
        if (!Number.isSafeInteger(discount) || discount < 0) {
          throw new Error("Enter a whole UGX sale discount.");
        }
        const items = cartItems.map((item) => {
          const milli = Math.round(item.quantity * 1000);
          const itemDiscount = item.discount ?? 0;
          if (
            !Number.isSafeInteger(item.price) || item.price < 0 ||
            !Number.isSafeInteger(milli) || milli <= 0 ||
            !Number.isSafeInteger(itemDiscount) || itemDiscount < 0 ||
            Math.abs(milli / 1000 - item.quantity) > 0.000001
          ) {
            throw new Error("Prices and discounts must be whole UGX; quantities may use up to three decimals.");
          }
          return {
            product_id: item.product_id,
            unit_price_ugx: item.price,
            quantity_milli: milli,
            discount_ugx: itemDiscount,
          };
        });
        const result = await tauriTaxService.previewSaleTax({ items, discount_ugx: discount });
        if (active) setTaxPreview({ key: previewKey, result, error: null });
      } catch (error) {
        if (active) setTaxPreview({
          key: previewKey,
          result: null,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, 120);
    return () => { active = false; window.clearTimeout(timer); };
  }, [previewKey, cartItems, discount]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const previewReady = taxPreview.key === previewKey && taxPreview.result !== null;
  const previewError = taxPreview.key === previewKey ? taxPreview.error : null;
  const previewPending = cartItems.length > 0 && !previewReady && !previewError;
  const estimatedTax = previewReady ? taxPreview.result!.tax_amount_ugx : 0;
  const total = previewReady ? taxPreview.result!.total_amount_ugx : 0;
  const formattedTotal = previewReady ? formatCurrency(total) : "—";
  const parsedCashReceived = parseFloat(cashReceived) || 0;
  const change = parsedCashReceived - total;
  const normalizedMobileMoneyPhone = normalizeUgandanMobileNumber(mobileMoneyPhone);
  // Not live until an authenticated provider adapter confirms the transaction.
  const mobileMoneyCollectionConfigured = false;
  const suggestedCashAmounts = useMemo(() => {
    if (!previewReady || total <= 0) return [];
    const roundUp = (step: number) => Math.ceil(total / step) * step;
    return [...new Set([total, roundUp(10_000), roundUp(50_000), roundUp(100_000)])].slice(0, 4);
  }, [previewReady, total]);

  const filteredProducts = useMemo(() => {
    return localProducts.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === "All" || product.category === selectedCategory;

      return matchesSearch && matchesCategory && product.isActive;
    });
  }, [localProducts, searchQuery, selectedCategory]);

  const totalUnits = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  const addToCart = (product: Product) => {
    if (!product.isActive) {
      toast.error(t("pos.inactiveProduct"));
      return;
    }

    if (product.stock <= 0) {
      toast.error(t("pos.productOutOfStock"));
      return;
    }

    const existingItem = cartItems.find(
      (item) => item.product_id === product.id,
    );

    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        updateQuantity(product.id, existingItem.quantity + 1);
      } else {
        toast.error(t("pos.stockExceeded"));
      }
      return;
    }

    const validation = validatePosQuantity(1, product.stock, product.allowsDecimal, product.price, product.stockUnit);
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }
    addToReduxCart({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      sku: product.sku,
      stock_unit: product.stockUnit,
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => { // WEB: UUID
    const product = localProducts.find((p) => p.id === productId);
    if (!product) return;

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const validation = validatePosQuantity(
      newQuantity, product.stock, product.allowsDecimal, product.price, product.stockUnit,
    );
    if (!validation.ok) {
      toast.error(validation.message);
      return;
    }
    updateItemQuantity(productId, newQuantity);
  };

  const clearCart = () => {
    clearReduxCart();
    setDiscount(0);
    setCashReceived("");
    setMobileMoneyPhone("");
    setMobileMoneyStatus("ready");
    setDueDate("");
    setOrderNotes("");
    applyDiscount(0);
    assignCustomer(undefined);
  };

  const handleCheckout = (mode: CheckoutMode) => {
    if (cartItems.length === 0) {
      toast.error(t("pos.cartEmpty"));
      return;
    }
    if (!previewReady) {
      toast.error(previewError || "Sale totals are still being calculated.");
      return;
    }

    if (mode === "order" && !customerId) {
      toast.error(t("pos.selectCustomerCredit"));
      return;
    }

    if (!checkoutDialogOpen || checkoutMode !== mode) setMobileMoneyStatus("ready");
    setCheckoutMode(mode);
    setCheckoutDialogOpen(true);
  };

  const handleRefresh = async () => {
    await Promise.all([getProducts(), getCategories()]);
    toast.success(t("pos.refreshed"));
  };

  const handleCustomerSelect = (customerId: number) => {
    // Fetch risk score when customer is selected
    if (!scores[customerId]) {
      getCustomerRisk(customerId);
    }
  };

  const checkCreditLimit = () => {
    if (!selectedCustomer || !selectedCustomer.credit_limit) return true;

    const projectedBalance = selectedCustomer.outstanding_balance + total;
    return projectedBalance <= selectedCustomer.credit_limit;
  };

  const completeSale = async () => {
    if (!previewReady) {
      toast.error(previewError || "Confirm the sale total before continuing.");
      return;
    }
    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (checkoutMode === "order") {
      await placeOrder();
      return;
    }

    if (paymentMethod === "mobile_money") {
      toast.error("Mobile Money collections are not connected. No payment was requested or recorded.");
      return;
    }

    if (paymentMethod === "cash" && parsedCashReceived < total) {
      toast.error(t("pos.cashInsufficient"));
      return;
    }

    const payload: CreateSalePayload = {
      customer_id: customerId ?? null,
      items: cartItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.price,
        discount_amount: item.discount ?? 0,
        entered_unit: (() => {
          const product = localProducts.find((p) => p.id === item.product_id);
          return product ? effectiveSaleUnit(product) : item.stock_unit;
        })(),
        entered_quantity_milli: (() => {
          const product = localProducts.find((p) => p.id === item.product_id);
          const unit = product ? effectiveSaleUnit(product) : (item.stock_unit || "pcs");
          const entered = product
            ? stockToSaleQuantity(item.quantity, product.stockUnit, unit)
            : item.quantity;
          return entered === null ? 0 : Math.round(entered * 1000);
        })(),
      })),
      payment_method: paymentMethod,
      amount_paid: paymentMethod === "cash" ? parsedCashReceived : total,
      discount_amount: discount,
      // tax_amount removed - calculated server-side
      payment_reference: null,
      notes: "POS Sale",
    };

    const result = await addSale(payload);

    if (result) {
      clearCart();
      setSaleUnits({});
      setCheckoutDialogOpen(false);
      setPaymentMethod("cash");
      setCashReceived("");
      setMobileMoneyPhone("");
      setMobileMoneyStatus("ready");
      toast.success(t("pos.saleCompleted", { number: result.sale_number }));
      // WEB: the receipt preview needs the desktop sale, which exists once the
      // paired desktop applies this web sale (see Sales History).
      if (result.id !== null) {
        setSalePrintSaleId(result.id);
        setSalePrintOpen(true);
      }
    }
  };

  const placeOrder = async () => {
    if (!previewReady) {
      toast.error(previewError || "Confirm the sale total before continuing.");
      return;
    }
    if (!customerId) {
      toast.error(t("pos.customerRequired"));
      return;
    }

    if (!checkCreditLimit()) {
      setCreditWarningDialog(true);
      return;
    }

    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);

    const payload: CreateSalePayload = {
      customer_id: customerId,
      items: cartItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.price,
        discount_amount: item.discount ?? 0,
        entered_unit: (() => {
          const product = localProducts.find((p) => p.id === item.product_id);
          return product ? effectiveSaleUnit(product) : item.stock_unit;
        })(),
        entered_quantity_milli: (() => {
          const product = localProducts.find((p) => p.id === item.product_id);
          const unit = product ? effectiveSaleUnit(product) : (item.stock_unit || "pcs");
          const entered = product
            ? stockToSaleQuantity(item.quantity, product.stockUnit, unit)
            : item.quantity;
          return entered === null ? 0 : Math.round(entered * 1000);
        })(),
      })),
      payment_method: "cash",
      amount_paid: 0,
      discount_amount: discount,
      // tax_amount removed - calculated server-side
      payment_reference: null,
      notes: orderNotes || "Credit Order",
      due_date: dueDate || defaultDueDate.toISOString(),
    };

    const result = await addSale(payload);

    if (result) {
      clearCart();
      setSaleUnits({});
      setCheckoutDialogOpen(false);
      setDueDate("");
      setOrderNotes("");
      toast.success(t("pos.orderPlaced", { number: result.sale_number }));
    }
  };

  // WEB: the desktop's SiteHeader (title + Clear Sale) is the shell header on
  // the web; register this sale's Clear Sale action with it.
  const { registerClearSale, unregisterClearSale } = usePosHeaderControls();
  useEffect(() => {
    registerClearSale(cartItems.length, clearCart);
  });
  useEffect(() => () => unregisterClearSale(), [unregisterClearSale]);

  return (
    <>

      <div className="@container/pos min-h-0 min-w-0 px-3 pb-4 sm:px-4 md:px-6">
        <div className="grid min-w-0 items-start gap-4 @min-[1100px]/pos:grid-cols-[minmax(0,1fr)_minmax(300px,360px)]">
          {/* PRODUCT AREA */}
          <Card id="pos-products" className="min-w-0 overflow-hidden rounded-[28px] border-border/60">
            <CardHeader className="border-b">
              <div className="flex flex-col gap-3">
                <div>
                  <CardTitle className="text-xl">{t("pos.counter")}</CardTitle>
                  <CardDescription>
                    {t("pos.counterDescription")}
                  </CardDescription>
                </div>

                <div className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(150px,200px)_auto_auto]">
                  <div className="relative min-w-0">
                    <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t("pos.search")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue placeholder={t("products.category")} />
                    </SelectTrigger>
                    <SelectContent>
                      {localCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div role="group" aria-label={t("posUi.productDisplay")} className="flex w-fit max-w-full items-center gap-1 rounded-full border p-1">
                    {([
                      ["compact", IconLayoutCards, "Compact"],
                      ["grid", IconLayoutGrid, "Grid"],
                      ["list", IconList, "List"],
                    ] as const).map(([view, Icon, label]) => (
                      <Button
                        key={view}
                        type="button"
                        size="sm"
                        variant={productView === view ? "secondary" : "ghost"}
                        aria-label={`${label} product view`}
                        aria-pressed={productView === view}
                        onClick={() => changeProductView(view)}
                        className="gap-1.5 px-2"
                      >
                        <Icon className="size-4" />
                        <span className="hidden xl:inline">{label}</span>
                      </Button>
                    ))}
                  </div>

                  <Button variant="outline" size="icon" title={t("pos.refresh")} aria-label={t("pos.refresh")} onClick={handleRefresh} disabled={loading}>
                    <IconRefresh className={`size-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="max-h-[min(70dvh,850px)] min-h-64 overflow-y-auto p-3 sm:p-4">
              {loading ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  {t("pos.loadingProducts")}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-center">
                  <div className="rounded-full bg-muted p-4">
                    <IconSearch className="size-8 text-muted-foreground" />
                  </div>
                  <p className="mt-4 font-medium">{t("pos.noProducts")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("pos.adjustFilters")}
                  </p>
                </div>
              ) : (
                <div className={
                  productView === "list"
                    ? "flex flex-col gap-1.5"
                    : productView === "compact"
                      ? "grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] items-stretch gap-2"
                      : "grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(min(100%,210px),1fr))] items-stretch gap-2"
                }>
                  {filteredProducts.map((product) => {
                    const isLowStock = product.stock > 0 && product.stock <= 10;
                    const isOutOfStock = product.stock <= 0;

                    return (
                      <Card
                        key={product.id}
                        role="button"
                        tabIndex={isOutOfStock ? -1 : 0}
                        aria-disabled={isOutOfStock}
                        onKeyDown={(event) => {
                          if (!isOutOfStock && (event.key === "Enter" || event.key === " ")) {
                            event.preventDefault();
                            addToCart(product);
                          }
                        }}
                        onClick={() => addToCart(product)}
                        className={`min-w-0 border-border/60 py-0 ${productView === "list" ? "" : productView === "compact" ? "h-[190px]" : "h-[360px]"} transition hover:border-border hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                          isOutOfStock ? "cursor-not-allowed opacity-70" : "cursor-pointer"
                        }`}>
                        <CardContent className={productView === "compact" ? "flex h-full flex-col p-2.5" : productView === "list" ? "flex items-center gap-3 px-3 py-2.5" : "flex h-full flex-col p-3"}>
                          {productView === "grid" && (
                            product.image ? (
                              <img src={product.image} alt="" className="mb-3 h-28 w-full rounded-md object-cover" />
                            ) : (
                              <div aria-hidden="true" className="mb-3 h-28 w-full rounded-md bg-muted/30" />
                            )
                          )}

                          <div className={productView === "compact" ? "flex min-w-0 flex-1 flex-col gap-1.5" : productView === "list" ? "grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(180px,auto)] items-center gap-3" : "flex min-w-0 flex-1 flex-col gap-2"}>
                            <div>
                              <h3 className="line-clamp-2 text-sm font-medium leading-snug" title={product.name}>
                                {product.name}
                              </h3>
                              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                <IconBarcode className="size-3.5" />
                                <span className="min-w-0 truncate font-mono" title={product.sku}>{product.sku}</span>
                              </div>
                            </div>

                            <div className={productView === "list" ? "flex min-w-0 flex-wrap items-start justify-between gap-1.5" : "mt-auto flex min-w-0 flex-wrap items-start justify-between gap-1.5 pt-2"}>
                              <div className="min-w-0">
                                <p className="text-base font-semibold">
                                  {formatCurrency(product.price)}
                                </p>
                                <p className="truncate text-xs text-muted-foreground" title={product.category}>
                                  {product.category}
                                </p>
                              </div>

                              {isOutOfStock ? (
                                <Badge variant="destructive" className="max-w-full min-w-0 whitespace-normal break-words text-center leading-tight">
                                  {t("pos.outOfStock")}
                                </Badge>
                              ) : isLowStock ? (
                                <Badge variant="outline" className="max-w-full min-w-0 whitespace-normal break-words text-center leading-tight">
                                  {t("pos.lowStock", { count: product.stock })}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="max-w-full min-w-0 whitespace-normal break-words text-center leading-tight">
                                  {t("pos.inStock", { count: product.stock })}
                                </Badge>
                              )}
                            </div>

                            {productView === "grid" && isLowStock && !isOutOfStock && (
                              <div className="flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs text-muted-foreground">
                                <IconAlertTriangle className="size-3.5" />
                                {t("pos.lowStockItem")}
                              </div>
                            )}

                            {productView === "grid" && product.isTaxable && (
                              <Badge variant="outline" className="text-xs">
                                {t("pos.taxable")}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {cartItems.length > 0 && (
          <div className="sticky bottom-3 z-20 -mt-1 flex justify-center @min-[1100px]/pos:hidden">
            <Button
              type="button"
              className="max-w-full gap-2 shadow-lg"
              onClick={() => document.getElementById("pos-cart")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              aria-label={t("posUi.goToSale")}
            >
              <IconShoppingCart className="size-4" />
              <span className="truncate">{totalUnits} items · {formattedTotal}</span>
              <span className="font-semibold">{t("sales.view")}</span>
            </Button>
          </div>

          )}
          {/* CART AREA */}
          <Card id="pos-cart" className="flex h-auto min-w-0 flex-col overflow-hidden rounded-[28px] border-border/60 @min-[1100px]/pos:h-[min(78dvh,850px)] @min-[1100px]/pos:min-h-[360px]">
            <CardHeader className="shrink-0 border-b">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">{t("pos.currentSale")}</CardTitle>
                  <CardDescription>
                    {t("pos.cartDescription")}
                  </CardDescription>
                </div>

                <div className="rounded-lg border bg-muted/40 p-2 text-muted-foreground">
                  <IconReceipt className="size-5" />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <Badge variant="secondary">
                  {totalUnits} unit{totalUnits !== 1 ? "s" : ""} •{" "}
                  {cartItems.length} line{cartItems.length !== 1 ? "s" : ""}
                </Badge>

                <span className="text-sm text-muted-foreground">
                  Total:{" "}
                  <span className="font-semibold text-foreground">
                    {formattedTotal}
                  </span>
                </span>
              </div>
            </CardHeader>

            <div aria-label={t("posUi.saleItems")} role="region" tabIndex={0} className="min-h-0 max-h-[45dvh] overflow-y-auto overscroll-contain bg-muted/10 p-3 sm:p-4 @min-[1100px]/pos:max-h-none @min-[1100px]/pos:flex-1">
              {cartItems.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center py-5 text-center @min-[1100px]/pos:h-full">
                  <div className="rounded-full bg-muted p-4">
                    <IconShoppingCart className="size-10 text-muted-foreground" />
                  </div>
                  <p className="mt-4 font-medium">{t("pos.noItems")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("pos.noItemsDescription")}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item) => {
                    const product = localProducts.find(
                      (p) => p.id === item.product_id,
                    );
                    if (!product) return null;

                    return (
                      <Card
                        key={item.product_id}
                        className="rounded-2xl border-border/60 shadow-none py-0">
                        <CardContent className="p-3">
                          <div className="mb-3 flex items-start gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-input/30">
                              <IconPackage className="size-5 text-primary/80" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="line-clamp-2 text-sm font-medium leading-tight">
                                    {product.name}
                                  </h4>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {formatCurrency(item.price)} / {product.stockUnit}
                                  </p>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() =>
                                    removeFromCart(item.product_id)
                                  }>
                                  <IconTrash className="size-4" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {product.likelyPackagedVolume && (
                            <p className="mb-2 rounded-lg border bg-muted/50 px-2.5 py-2 text-xs" role="note">
                              Packaged item? If stock means bottles, edit this product in Products → Units &amp; stock
                              and use <strong>bottle</strong> for stock and sales units. Keep the ml size in the product name.
                            </p>
                          )}
                          {product.allowsDecimal && compatibleSaleUnits(product.stockUnit).length > 1 && (
                            <div className="mb-2 flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{t("pos.sellIn")}</span>
                              <Select
                                value={effectiveSaleUnit(product)}
                                onValueChange={(value) => setSaleUnit(product, value)}
                              >
                                <SelectTrigger className="h-8 w-28 rounded-full" aria-label={`Selling unit for ${product.name}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {compatibleSaleUnits(product.stockUnit).map((unit) => (
                                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <span className="text-xs text-muted-foreground">
                                Stock: {item.quantity} {product.stockUnit}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  changeSaleQuantity(
                                    product,
                                    String((stockToSaleQuantity(item.quantity, product.stockUnit, effectiveSaleUnit(product)) ?? item.quantity) - 1),
                                  )
                                }>
                                <IconMinus className="size-3.5" />
                              </Button>

                              {product.allowsDecimal ? (
                                <MeasuredQuantityInput
                                  key={`${item.product_id}:${effectiveSaleUnit(product)}:${item.quantity}`}
                                  quantity={stockToSaleQuantity(item.quantity, product.stockUnit, effectiveSaleUnit(product)) ?? item.quantity}
                                  unit={effectiveSaleUnit(product)}
                                  max={stockToSaleQuantity(product.stock, product.stockUnit, effectiveSaleUnit(product)) ?? product.stock}
                                  onCommit={(value) => changeSaleQuantity(product, String(value))}
                                />
                              ) : (
                                <div className="min-w-[34px] text-center text-sm font-medium">{item.quantity}</div>
                              )}

                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  changeSaleQuantity(
                                    product,
                                    String((stockToSaleQuantity(item.quantity, product.stockUnit, effectiveSaleUnit(product)) ?? item.quantity) + 1),
                                  )
                                }
                                disabled={item.quantity >= product.stock}>
                                <IconPlus className="size-3.5" />
                              </Button>
                            </div>

                            <div className="text-right">
                              <p className="font-semibold">
                                {formatCurrency(item.price * item.quantity)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {product.stockUnit} (stock unit)
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t bg-card p-3 sm:p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="discount" className="text-sm font-medium">
                    {t("pos.discount")}
                  </Label>

                  <div className="flex items-center gap-2">
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => {
                        const newDiscount = Math.max(
                          0,
                          parseFloat(e.target.value) || 0,
                        );
                        setDiscount(newDiscount);
                        applyDiscount(newDiscount);
                      }}
                      className="h-9 w-28 min-w-0 text-center sm:w-40"
                    />
                    <span className="text-sm text-muted-foreground">UGX</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("pos.subtotal")}</span>
                    <span>{formatCurrency(cartSubtotal)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("pos.discount")}</span>
                      <span>- {formatCurrency(discount)}</span>
                    </div>
                  )}

                  {estimatedTax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("pos.estimatedVat")}</span>
                      <span>{formatCurrency(estimatedTax)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t pt-2 text-base font-semibold">
                    <span>{t("pos.total")}</span>
                    <span>{formattedTotal}</span>
                  </div>
                </div>

                {previewError && (
                  <p role="alert" className="text-sm text-destructive">{previewError}</p>
                )}
                {previewPending && (
                  <p role="status" className="text-sm text-muted-foreground">
                    Calculating tax and total…
                  </p>
                )}
                <div className="grid grid-cols-1 gap-3">
                  <Button
                    className="h-12 text-base font-semibold"
                    onClick={() => handleCheckout("sale")}
                    disabled={cartItems.length === 0 || !previewReady}>
                    {t("pos.completeSale")}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* CHECKOUT DIALOG: review and payment stay within the same transaction. */}
      <Dialog open={checkoutDialogOpen} onOpenChange={(open) => {
        if (!saleLoading) setCheckoutDialogOpen(open);
      }}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-5xl">
          <DialogHeader className="shrink-0 border-b px-5 py-5 pr-12 text-left sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
                <IconShoppingCart className="size-6" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl font-semibold">
                  {checkoutMode === "sale" ? t("pos.completeSale") : t("pos.placeCreditOrder")}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {checkoutMode === "sale"
                    ? t("pos.completeSaleDescription")
                    : t("pos.creditOrderDescription")}
                </DialogDescription>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-center gap-2 text-xs sm:gap-4 sm:text-sm" aria-label={t("posUi.checkoutProgress")}>
              <span className="inline-flex shrink-0 items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground" aria-hidden="true">1</span>
                <span className="font-medium text-foreground">{t("posUi.reviewSale")}</span>
              </span>
              <span className="h-px min-w-3 flex-1 bg-border sm:max-w-24" aria-hidden="true" />
              <span className="inline-flex shrink-0 items-center gap-2" aria-current="step">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground" aria-hidden="true">2</span>
                <span className="font-medium text-foreground">{t("customers.payment")}</span>
              </span>
              <span className="h-px min-w-3 flex-1 bg-border sm:max-w-24" aria-hidden="true" />
              <span className="inline-flex shrink-0 items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground" aria-hidden="true">3</span>
                <span className="text-muted-foreground">{t("posUi.complete")}</span>
              </span>
            </div>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-4 py-5 sm:px-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-5">
            <section className="min-w-0 self-start rounded-xl border bg-card p-4 sm:p-5" aria-label={t("posUi.saleSummaryAria")}>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-primary" aria-hidden="true">
                  <IconReceipt className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{t("posUi.saleSummary")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {totalUnits} {totalUnits === 1 ? "unit" : "units"} · {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
                  </p>
                </div>
              </div>
              <div className="mt-4 divide-y border-y">
                {cartItems.map((item) => (
                  <div key={item.product_id} className="flex min-w-0 items-center gap-3 py-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-primary" aria-hidden="true">
                      <IconPackage className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" title={item.name}>{item.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.sku || "—"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(item.price * item.quantity)}</p>
                      <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{t("pos.subtotal")}</span>
                  <span className="tabular-nums">{formatCurrency(cartSubtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{t("pos.discount")}</span>
                    <span className="tabular-nums">− {formatCurrency(discount)}</span>
                  </div>
                )}
                {estimatedTax > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">{t("pos.estimatedVat")}</span>
                    <span className="tabular-nums">{formatCurrency(estimatedTax)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary p-4 text-base font-semibold text-secondary-foreground">
                  <span>{t("pos.totalDue")}</span>
                  <span className="tabular-nums">{formattedTotal}</span>
                </div>
              </div>
            </section>

            <section className="min-w-0 space-y-4" aria-label={t("posUi.customerPaymentAria")}>
              <div className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
                <h3 className="flex items-center gap-2 font-semibold">
                  <IconUser className="size-5 text-primary" aria-hidden="true" />
                  {t("pos.customer")}
                </h3>
                <SearchableSelect
                  value={customerId ? String(customerId) : checkoutMode === "sale" ? "walk-in" : ""}
                  onValueChange={(value) => {
                    if (value === "walk-in") {
                      assignCustomer(undefined);
                      return;
                    }
                    const id = Number(value);
                    assignCustomer(id);
                    if (checkoutMode === "order") handleCustomerSelect(id);
                  }}
                  options={[
                    ...(checkoutMode === "sale" ? [{ value: "walk-in", label: t("pos.walkInCustomer") }] : []),
                    ...customerOptions.map((customer) => ({
                      value: String(customer.id),
                      label: [customer.name, customer.phone].filter(Boolean).join(" · "),
                    })),
                  ]}
                  placeholder={t("pos.selectCustomer")}
                  searchPlaceholder="Search customers..."
                  emptyMessage="No matching customers"
                  aria-label={t("pos.customer")}
                  required={checkoutMode === "order"}
                />
              </div>

              {checkoutMode === "sale" ? (
                <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <IconCash className="size-5 text-primary" aria-hidden="true" />
                    {t("pos.paymentMethod")}
                  </h3>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label={t("pos.paymentMethod")}>
                    <Button
                      type="button"
                      variant={paymentMethod === "cash" ? "default" : "outline"}
                      aria-pressed={paymentMethod === "cash"}
                      className="h-12 min-w-0"
                      onClick={() => { setPaymentMethod("cash"); setMobileMoneyStatus("ready"); }}>
                      <IconCash className="size-5" aria-hidden="true" />
                      {t("pos.cash")}
                    </Button>
                    <Button
                      type="button"
                      variant={paymentMethod === "mobile_money" ? "default" : "outline"}
                      aria-pressed={paymentMethod === "mobile_money"}
                      className="h-12 min-w-0"
                      onClick={() => setPaymentMethod("mobile_money")}>
                      <IconDeviceMobile className="size-5" aria-hidden="true" />
                      {t("pos.mobileMoney")}
                    </Button>
                  </div>

                  {paymentMethod === "cash" ? (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <FieldLabel required htmlFor="cashReceived">{t("pos.cashReceived")}</FieldLabel>
                        <Input
                          id="cashReceived"
                          required
                          type="number"
                          min="0"
                          step="1"
                          inputMode="numeric"
                          value={cashReceived}
                          onChange={(event) => setCashReceived(event.target.value)}
                          placeholder={t("pos.enterTender")}
                          className="h-11"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2" aria-label={t("posUi.quickCash")}>
                        {suggestedCashAmounts.map((amount, index) => (
                          <Button
                            key={amount}
                            type="button"
                            variant={cashReceived === String(amount) ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => setCashReceived(String(amount))}>
                            {index === 0 ? "Exact" : formatCurrency(amount)}
                          </Button>
                        ))}
                      </div>
                      {cashReceived !== "" && parsedCashReceived < total && (
                        <p role="status" className="text-xs text-destructive">
                          {t("pos.cashInsufficient")}
                        </p>
                      )}
                      <div className="flex items-center justify-between gap-3 rounded-xl border bg-muted/50 p-3">
                        <span className="text-sm font-medium">{t("pos.changeDue")}</span>
                        <span className="text-lg font-semibold tabular-nums text-primary">
                          {cashReceived !== "" && parsedCashReceived >= total ? formatCurrency(change) : "—"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>{t("posUi.mobileProvider")}</Label>
                        <div className="grid grid-cols-2 gap-2" role="group" aria-label={t("posUi.mobileProviderAria")}>
                          {(["MTN MoMo", "Airtel Money"] as const).map((provider) => (
                            <Button
                              key={provider}
                              type="button"
                              variant={mobileMoneyProvider === provider ? "secondary" : "outline"}
                              aria-pressed={mobileMoneyProvider === provider}
                              className="min-w-0"
                              onClick={() => {
                                setMobileMoneyProvider(provider);
                                setMobileMoneyStatus("ready");
                              }}>
                              {provider}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel required htmlFor="mobileMoneyPhone">{t("posUi.payerPhone")}</FieldLabel>
                        <Input
                          id="mobileMoneyPhone"
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="07XX XXX XXX"
                          value={mobileMoneyPhone}
                          onChange={(event) => {
                            setMobileMoneyPhone(event.target.value);
                            setMobileMoneyStatus("ready");
                          }}
                          aria-invalid={mobileMoneyPhone.length > 0 && !normalizedMobileMoneyPhone}
                        />
                        {mobileMoneyPhone.length > 0 && !normalizedMobileMoneyPhone && (
                          <p className="text-xs text-destructive">{t("posUi.invalidPhone")}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 p-3">
                        <span className="text-sm font-medium">{t("posUi.paymentRequestAmount")}</span>
                        <span className="text-base font-semibold tabular-nums">{formattedTotal}</span>
                      </div>
                      <div role="status" className="space-y-2 rounded-xl border p-3 text-sm">
                        <p className="font-medium">
                          {mobileMoneyStatus === "unavailable" ? "Payment request unavailable" : "Provider connection required"}
                        </p>
                        <p className="text-muted-foreground">
                          AkiliBiz is not yet connected to a verified MTN or Airtel collection service.
                          No PIN prompt can be sent until the merchant account and secure payment service are configured.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Customers enter their PIN on their own phone, never in AkiliBiz.
                          The transaction reference will be generated automatically when live collection is enabled.
                        </p>
                      </div>
                      <Button
                        type="button"
                        className="w-full"
                        disabled={!mobileMoneyCollectionConfigured || !normalizedMobileMoneyPhone || !previewReady}
                        title={t("posUi.paymentConnection")}>
                        {t("posUi.requestPayment")}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <IconCalendar className="size-5 text-primary" aria-hidden="true" />
                    {t("pos.placeCreditOrder")}
                  </h3>
                  {selectedCustomer && (
                    <div className="space-y-3 rounded-xl bg-muted/50 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium">{t("pos.creditRisk")}</p>
                          <p className="text-xs text-muted-foreground">
                            {riskLoading && !selectedCustomerRisk
                              ? "Calculating risk score..."
                              : selectedCustomerRisk
                                ? `Payment ratio: ${(selectedCustomerRisk.metrics.payment_ratio * 100).toFixed(0)}%`
                                : "No credit history available"}
                          </p>
                        </div>
                        {selectedCustomerRisk ? (
                          <RiskBadge level={selectedCustomerRisk.level} score={selectedCustomerRisk.score} />
                        ) : (
                          <Badge variant="outline">{t("pos.newCustomer")}</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">{t("customers.creditLimit")}</p>
                          <p className="font-medium tabular-nums">{formatCurrency(selectedCustomer.credit_limit)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{t("customers.outstandingBalance")}</p>
                          <p className="font-medium tabular-nums">{formatCurrency(selectedCustomer.outstanding_balance)}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">{t("pos.dueDate")}</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                    <p className="text-xs text-muted-foreground">{t("pos.dueDateHint")}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="orderNotes">{t("pos.orderNotes")}</Label>
                    <Input
                      id="orderNotes"
                      value={orderNotes}
                      onChange={(event) => setOrderNotes(event.target.value)}
                      placeholder={t("pos.optionalOrderNotes")}
                    />
                  </div>
                </div>
              )}
            </section>
          </div>

          <DialogFooter className="shrink-0 flex-wrap gap-2 border-t bg-background px-4 py-4 sm:justify-between sm:px-7">
            <Button
              type="button"
              variant="outline"
              disabled={saleLoading}
              onClick={() => setCheckoutDialogOpen(false)}>
              {t("pos.cancel")}
            </Button>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center">
              {checkoutMode === "sale" && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saleLoading || !customerId || !previewReady}
                  title={!customerId ? "Select a customer to create a credit order." : undefined}
                  onClick={() => handleCheckout("order")}>
                  {t("pos.switchCreditOrder")}
                </Button>
              )}
              {checkoutMode === "order" && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={saleLoading}
                  onClick={() => { setCheckoutMode("sale"); setMobileMoneyStatus("ready"); }}>
                  {t("pos.completeSale")}
                </Button>
              )}
              <Button
                type="button"
                disabled={
                  saleLoading || !previewReady || cartItems.length === 0 ||
                  (checkoutMode === "sale" && paymentMethod === "cash" && parsedCashReceived < total) ||
                  (checkoutMode === "sale" && paymentMethod === "mobile_money" && !mobileMoneyCollectionConfigured) ||
                  (checkoutMode === "order" && !customerId)
                }
                onClick={completeSale}
                className="min-w-36">
                {saleLoading ? t("pos.processing") : checkoutMode === "sale" && paymentMethod === "mobile_money" ? "Awaiting verified payment" : checkoutMode === "sale" ? t("pos.completeSale") : t("pos.placeCreditOrder")}
                {!saleLoading && <IconCheck className="size-4" aria-hidden="true" />}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREDIT LIMIT WARNING */}
      <AlertDialog
        open={creditWarningDialog}
        onOpenChange={setCreditWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("pos.creditLimitExceeded")}</AlertDialogTitle>
            <AlertDialogDescription>
              This order would exceed the customer&apos;s credit limit of{" "}
              {formatCurrency(selectedCustomer?.credit_limit || 0)}. Current
              balance:{" "}
              {formatCurrency(selectedCustomer?.outstanding_balance || 0)}. This
              order would add {formattedTotal}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("pos.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setCreditWarningDialog(false);
                placeOrder();
              }}>
              Override & Place Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SalePrintPreviewDialog saleId={salePrintSaleId} open={salePrintOpen} onOpenChange={setSalePrintOpen} />
    </>
  );
}
