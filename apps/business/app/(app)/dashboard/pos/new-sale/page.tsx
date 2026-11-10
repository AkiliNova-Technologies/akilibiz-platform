"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { SalePrintPreviewDialog } from "@/components/akilibiz/documents/SalePrintPreviewDialog";
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
import { Search, Plus, Minus, Trash2, Receipt, Banknote, ShoppingCart, Package, Smartphone, RefreshCw, AlertTriangle, Barcode, LayoutGrid, List, PanelsTopLeft } from "lucide-react";
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
import { RiskBadge } from "@/components/akilibiz/risk-badge";
import { CreateSalePayload, SalePaymentMethod, formatPosCurrency as formatCurrency, t, usePosData } from "@/components/akilibiz/pos/pos-data";
import { toast } from "sonner";


// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number | null;
  stock: number;
  stockUnit: string;
  inventoryAvailable: boolean;
  isActive: boolean;
  isTaxable: boolean;
  taxClassificationId: number | null;
  taxInclusive: boolean;
  image?: string;
}

type CheckoutMode = "sale" | "order";
type ProductView = "compact" | "grid" | "list";
const POS_VIEW_STORAGE_KEY = "akilibiz.pos.product-view";
// The hosted sale and tax-posting services are not yet connected.
const canSubmitSale = false;

// ============================================================================
// UTILITIES
// ============================================================================

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function POSPage() {
  const { registerClearSale, unregisterClearSale } = usePosHeaderControls();
  const { products, loading, error, getProducts, categories, getCategories, addSale, saleLoading, customers, getCustomers, scores, getCustomerRisk, riskLoading, taxSettings, getTaxSettings, getTaxClassifications, cartItems, cartSubtotal, cartTotal, customerId, addToReduxCart, updateItemQuantity, removeFromCart, clearReduxCart, applyDiscount, assignCustomer } = usePosData();

  const [productView, setProductView] = useState<ProductView>(() => {
    if (typeof window === "undefined") return "compact";
    try {
      const saved = window.localStorage.getItem(POS_VIEW_STORAGE_KEY);
      if (saved === "compact" || saved === "grid" || saved === "list") return saved;
    } catch {
      // Display preferences are optional.
    }
    return "compact";
  });
  const changeProductView = (view: ProductView) => {
    setProductView(view);
    try {
      window.localStorage.setItem(POS_VIEW_STORAGE_KEY, view);
    } catch {
      // The interface works without persisted preferences.
    }
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("sale");
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
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
  }, [
    getProducts,
    getCategories,
    getCustomers,
    getTaxSettings,
    getTaxClassifications,
  ]);

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

  const localProducts = useMemo<Product[]>(() => {
    return products.map((product) => {
      const categoryName = product.category_id
        ? categoryMap.get(product.category_id) ||
          `Category ${product.category_id}`
        : "Uncategorized";

      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: categoryName,
        price: product.selling_price,
        stock: product.stock_quantity,
        stockUnit: product.stock_unit || "pcs",
        inventoryAvailable: product.inventory_available,
        isActive: Boolean(product.is_active),
        isTaxable: Boolean(product.is_taxable),
        taxClassificationId: product.tax_classification_id || null,
        taxInclusive: Boolean(product.tax_inclusive),
        image: undefined,
      };
    });
  }, [products, categoryMap]);

  const selectedCustomer = useMemo(() => {
    return (
      customerOptions.find((customer) => customer.id === customerId) || null
    );
  }, [customerId, customerOptions]);

  const selectedCustomerRisk = useMemo(() => {
    if (!customerId) return null;
    return scores[customerId] || null;
  }, [customerId, scores]);

  // Calculate estimated tax (will be recalculated server-side)
  const estimatedTax = useMemo(() => {
    if (!taxSettings?.vat_registered) return 0;

    // Simple estimate: 18% VAT on taxable items
    return cartItems.reduce((sum, item) => {
      const product = localProducts.find((p) => p.id === item.product_id);
      if (product?.isTaxable && product.taxClassificationId) {
        const itemSubtotal = item.price * item.quantity;
        return sum + itemSubtotal * 0.18; // 18% VAT estimate
      }
      return sum;
    }, 0);
  }, [cartItems, localProducts, taxSettings]);

  const total = cartTotal + estimatedTax;
  const parsedCashReceived = parseFloat(cashReceived) || 0;
  const change = parsedCashReceived - total;

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

    if (product.price === null) {
      toast.error(t("pos.priceUnavailable"));
      return;
    }

    if (!product.inventoryAvailable) {
      toast.error(t("pos.inventoryUnavailable"));
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
        updateItemQuantity(product.id, existingItem.quantity + 1);
      } else {
        toast.error(t("pos.stockExceeded"));
      }
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

  const updateQuantity = (productId: string, newQuantity: number) => {
    const product = localProducts.find((p) => p.id === productId);
    if (!product) return;

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > product.stock) {
      toast.error(t("pos.quantityExceeded"));
      return;
    }

    updateItemQuantity(productId, newQuantity);
  };

  const clearCart = useCallback(() => {
    clearReduxCart();
    setDiscount(0);
    setCashReceived("");
    setDueDate("");
    setOrderNotes("");
    applyDiscount(0);
    assignCustomer(undefined);
  }, [clearReduxCart, applyDiscount, assignCustomer]);

  useEffect(() => {
    registerClearSale(cartItems.length, clearCart);
  }, [cartItems.length, registerClearSale, clearCart]);
  useEffect(() => () => unregisterClearSale(), [unregisterClearSale]);

  const handleCheckout = (mode: CheckoutMode) => {
    if (cartItems.length === 0) {
      toast.error(t("pos.cartEmpty"));
      return;
    }

    if (mode === "order" && !customerId) {
      toast.error(t("pos.selectCustomerCredit"));
      return;
    }

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
    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if (checkoutMode === "order") {
      await placeOrder();
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
        discount_amount: 0,
      })),
      payment_method: paymentMethod,
      amount_paid: paymentMethod === "cash" ? parsedCashReceived : total,
      discount_amount: discount,
      // tax_amount removed - calculated server-side
      payment_reference: null,
      notes: "POS Sale",
    };

    const result = await addSale(payload);

    // Hosted posting is not connected; addSale cannot return a completed sale.
    void result;
  };

  const placeOrder = async () => {
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
        discount_amount: 0,
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

    // Hosted posting is not connected; addSale cannot return a credit order.
    void result;
  };

  return (
    <>
      <div className="@container/pos min-h-0 min-w-0">
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
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t("pos.search")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
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

                  <div role="group" aria-label="Product display" className="flex w-fit items-center gap-1 rounded-md border p-1">
                    {([
                      ["compact", PanelsTopLeft, "Compact"],
                      ["grid", LayoutGrid, "Grid"],
                      ["list", List, "List"],
                    ] as const).map(([view, Icon, label]) => (
                      <Button key={view} type="button" size="sm"
                        variant={productView === view ? "secondary" : "ghost"}
                        aria-label={`${label} product view`} aria-pressed={productView === view}
                        onClick={() => changeProductView(view)} className="gap-1.5 px-2">
                        <Icon className="size-4" />
                        <span className="hidden xl:inline">{label}</span>
                      </Button>
                    ))}
                  </div>
                  <Button type="button" variant="outline" size="icon"
                    title={t("pos.refresh")} aria-label={t("pos.refresh")}
                    onClick={handleRefresh} disabled={loading}>
                    <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="max-h-[min(70dvh,850px)] min-h-64 overflow-y-auto p-3 sm:p-4">
              {loading ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  {t("pos.loadingProducts")}
                </div>
              ) : error ? (
                <div role="alert" className="flex h-64 flex-col items-center justify-center gap-3 text-center">
                  <AlertTriangle className="size-8 text-destructive" />
                  <p className="font-medium">{error}</p>
                  <Button type="button" variant="outline" onClick={handleRefresh}>
                    {t("pos.refresh")}
                  </Button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center text-center">
                  <div className="rounded-full bg-muted p-4">
                    <Search className="size-8 text-muted-foreground" />
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
                      ? "grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(min(100%,150px),1fr))] items-start gap-2"
                      : "grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(min(100%,210px),1fr))] items-start gap-2"
                }>
                  {filteredProducts.map((product) => {
                    const isLowStock = product.stock > 0 && product.stock <= 10;
                    const isUnavailable = !product.inventoryAvailable || product.price === null;
                    const isOutOfStock = product.stock <= 0 || isUnavailable;

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
                        onClick={() => { if (!isOutOfStock) addToCart(product); }}
                        className={`min-w-0 border-border/60 py-0 transition hover:border-border hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${isOutOfStock ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                      >
                        <CardContent className={productView === "compact" ? "p-2.5" : productView === "list" ? "flex items-center gap-3 px-3 py-2.5" : "p-3"}>
                          {productView === "grid" && product.image ? (
                            <img src={product.image} alt="" className="mb-3 aspect-[4/3] w-full rounded-md object-cover" />
                          ) : null}
                          <div className={productView === "compact" ? "min-w-0 space-y-1.5" : productView === "list" ? "grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(180px,auto)] items-center gap-3" : "min-w-0 space-y-2"}>
                            <div>
                              <h3 className="line-clamp-2 text-sm font-medium leading-snug" title={product.name}>{product.name}</h3>
                              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                <Barcode className="size-3.5" />
                                <span className="min-w-0 truncate font-mono" title={product.sku}>{product.sku}</span>
                              </div>
                            </div>
                            <div className="flex min-w-0 flex-wrap items-start justify-between gap-1.5">
                              <div className="min-w-0">
                                <p className="text-base font-semibold">
                                  {product.price === null ? t("pos.priceUnavailable") : formatCurrency(product.price)}
                                </p>
                                <p className="truncate text-xs text-muted-foreground" title={product.category}>{product.category}</p>
                              </div>
                              {!product.inventoryAvailable ? (
                                <Badge variant="destructive">{t("pos.inventoryUnavailable")}</Badge>
                              ) : product.price === null ? (
                                <Badge variant="destructive">{t("pos.priceUnavailable")}</Badge>
                              ) : isOutOfStock ? (
                                <Badge variant="destructive">{t("pos.outOfStock")}</Badge>
                              ) : isLowStock ? (
                                <Badge variant="outline">{t("pos.lowStock", { count: product.stock })}</Badge>
                              ) : (
                                <Badge variant="secondary">{t("pos.inStock", { count: product.stock })}</Badge>
                              )}
                            </div>
                            {productView === "grid" && isLowStock && !isOutOfStock ? (
                              <div className="flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs text-muted-foreground">
                                <AlertTriangle className="size-3.5" />
                                {t("pos.lowStockItem")}
                              </div>
                            ) : null}
                            {productView === "grid" && product.isTaxable ? (
                              <Badge variant="outline" className="text-xs">{t("pos.taxable")}</Badge>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="sticky bottom-3 z-20 -mt-1 flex justify-center @min-[1100px]/pos:hidden">
            <Button type="button" className="max-w-full gap-2 shadow-lg"
              onClick={() => document.getElementById("pos-cart")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              aria-label="Go to current sale">
              <ShoppingCart className="size-4" />
              <span className="truncate">{totalUnits} items · {formatCurrency(total)}</span>
              <span className="font-semibold">View</span>
            </Button>
          </div>
          {/* CART AREA */}
          <Card id="pos-cart" className="flex h-[min(78dvh,850px)] min-h-[360px] min-w-0 flex-col overflow-hidden rounded-[28px] border-border/60">
            <CardHeader className="border-b">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl">
                    {t("pos.currentSale")}
                  </CardTitle>
                  <CardDescription>{t("pos.cartDescription")}</CardDescription>
                </div>

                <div className="rounded-lg border bg-muted/40 p-2 text-muted-foreground">
                  <Receipt className="size-5" />
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
                    {formatCurrency(total)}
                  </span>
                </span>
              </div>
            </CardHeader>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/10 p-3 sm:p-4">
              {cartItems.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="rounded-full bg-muted p-4">
                    <ShoppingCart className="size-10 text-muted-foreground" />
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
                        className="rounded-2xl border-border/60 shadow-none py-0"
                      >
                        <CardContent className="p-3">
                          <div className="mb-3 flex items-start gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-input/30">
                              <Package className="size-5 text-primary/80" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="line-clamp-2 text-sm font-medium leading-tight">
                                    {product.name}
                                  </h4>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {formatCurrency(item.price)} {t("pos.each")}
                                  </p>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() =>
                                    removeFromCart(item.product_id)
                                  }
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  updateQuantity(
                                    item.product_id,
                                    item.quantity - 1,
                                  )
                                }
                              >
                                <Minus className="size-3.5" />
                              </Button>

                              <div className="min-w-[34px] text-center text-sm font-medium">
                                {item.quantity}
                              </div>

                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  updateQuantity(
                                    item.product_id,
                                    item.quantity + 1,
                                  )
                                }
                                disabled={item.quantity >= product.stock}
                              >
                                <Plus className="size-3.5" />
                              </Button>
                            </div>

                            <div className="text-right">
                              <p className="font-semibold">
                                {formatCurrency(item.price * item.quantity)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {product.stockUnit}
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
                      className="h-9 w-48 text-center"
                    />
                    <span className="text-sm text-muted-foreground">UGX</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("pos.subtotal")}
                    </span>
                    <span>{formatCurrency(cartSubtotal)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("pos.discount")}
                      </span>
                      <span>- {formatCurrency(discount)}</span>
                    </div>
                  )}

                  {estimatedTax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {t("pos.estimatedVat")}
                      </span>
                      <span>{formatCurrency(estimatedTax)}</span>
                    </div>
                  )}

                  <div className="flex justify-between border-t pt-2 text-base font-semibold">
                    <span>{t("pos.total")}</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Button
                    className="h-12 text-base font-semibold"
                    onClick={() => handleCheckout("sale")}
                    disabled={cartItems.length === 0 || !canSubmitSale}
                    title={!canSubmitSale ? "Checkout is unavailable until sales and tax posting are connected" : undefined}
                  >
                    {t("pos.completeSale")}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* CHECKOUT DIALOG */}
      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {checkoutMode === "sale"
                ? t("pos.completeSale")
                : t("pos.placeCreditOrder")}
            </DialogTitle>
            <DialogDescription>
              {checkoutMode === "sale"
                ? t("pos.completeSaleDescription")
                : t("pos.creditOrderDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <Card className="border-border/60 py-0">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("pos.customer")}
                  </span>
                  <span className="font-medium">
                    {selectedCustomer?.name || t("pos.walkInCustomer")}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("pos.items")}
                  </span>
                  <span className="font-medium">{totalUnits}</span>
                </div>

                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t("pos.subtotal")}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(cartSubtotal)}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("pos.discount")}
                    </span>
                    <span className="font-medium">
                      - {formatCurrency(discount)}
                    </span>
                  </div>
                )}

                {estimatedTax > 0 && (
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t("pos.estimatedVat")}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(estimatedTax)}
                    </span>
                  </div>
                )}

                <Separator className="my-3" />

                <div className="flex items-center justify-between text-base font-semibold">
                  <span>{t("pos.totalDue")}</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </CardContent>
            </Card>

            {checkoutMode === "order" && (
              <>
                {/* Customer Selection */}
                <div className="space-y-2">
                  <FieldLabel required className="text-sm font-medium">
                    {t("pos.customer")}
                  </FieldLabel>
                  <Select
                    value={customerId ? String(customerId) : ""}
                    onValueChange={(value) => {
                      const id = Number(value);
                      assignCustomer(id);
                      handleCustomerSelect(id);
                    }}
                  >
                    <SelectTrigger aria-required="true" className="w-full">
                      <SelectValue placeholder={t("pos.selectCustomer")} />
                    </SelectTrigger>
                    <SelectContent>
                      {customerOptions.map((customer) => (
                        <SelectItem
                          key={customer.id}
                          value={String(customer.id)}
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span>{customer.name}</span>
                            <div className="flex items-center gap-2">
                              {customer.phone && (
                                <span className="text-xs text-muted-foreground">
                                  {customer.phone}
                                </span>
                              )}
                              {customer.type && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs capitalize"
                                >
                                  {customer.type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Risk Assessment */}
                {selectedCustomer && (
                  <Card className="border-border/60 py-0">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Credit Risk</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {riskLoading && !selectedCustomerRisk
                              ? "Calculating risk score..."
                              : selectedCustomerRisk
                                ? `Payment ratio: ${(selectedCustomerRisk.metrics.payment_ratio * 100).toFixed(0)}%`
                                : "No credit history available"}
                          </p>
                        </div>
                        {selectedCustomerRisk ? (
                          <RiskBadge
                            level={selectedCustomerRisk.level}
                            score={selectedCustomerRisk.score}
                          />
                        ) : (
                          <Badge variant="outline">New Customer</Badge>
                        )}
                      </div>

                      {selectedCustomer && (
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Credit Limit
                            </p>
                            <p className="font-medium">
                              {formatCurrency(selectedCustomer.credit_limit)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Outstanding Balance
                            </p>
                            <p className="font-medium">
                              {formatCurrency(
                                selectedCustomer.outstanding_balance,
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Due Date */}
                <div className="space-y-2">
                  <Label htmlFor="dueDate" className="text-sm font-medium">
                    Due Date
                  </Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Default: 30 days from today
                  </p>
                </div>

                {/* Order Notes */}
                <div className="space-y-2">
                  <Label htmlFor="orderNotes" className="text-sm font-medium">
                    Order Notes
                  </Label>
                  <Input
                    id="orderNotes"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Optional notes for this order"
                  />
                </div>
              </>
            )}

            {checkoutMode === "sale" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t("pos.customer")}
                  </Label>
                  <Select
                    value={customerId ? String(customerId) : "walk-in"}
                    onValueChange={(value) =>
                      assignCustomer(
                        value === "walk-in" ? undefined : Number(value),
                      )
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("pos.selectCustomer")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk-in">
                        <div className="flex items-center gap-2">
                          <span>{t("pos.walkInCustomer")}</span>
                          <Badge variant="outline" className="text-xs">
                            {t("pos.guest")}
                          </Badge>
                        </div>
                      </SelectItem>
                      {customerOptions.map((customer) => (
                        <SelectItem
                          key={customer.id}
                          value={String(customer.id)}
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <span>{customer.name}</span>
                            <div className="flex items-center gap-2">
                              {customer.phone && (
                                <span className="text-xs text-muted-foreground">
                                  {customer.phone}
                                </span>
                              )}
                              {customer.type && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs capitalize"
                                >
                                  {customer.type}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {t("pos.paymentMethod")}
                  </Label>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant={paymentMethod === "cash" ? "default" : "outline"}
                      className="h-auto flex-col py-3"
                      onClick={() => setPaymentMethod("cash")}
                    >
                      <Banknote className="mb-1 size-5" />
                      <span className="text-xs">{t("pos.cash")}</span>
                    </Button>

                    <Button
                      type="button"
                      variant={
                        paymentMethod === "mobile_money" ? "default" : "outline"
                      }
                      className="h-auto flex-col py-3"
                      onClick={() => setPaymentMethod("mobile_money")}
                    >
                      <Smartphone className="mb-1 size-5" />
                      <span className="text-xs">{t("pos.mobileMoney")}</span>
                    </Button>
                  </div>
                </div>

                {paymentMethod === "cash" && (
                  <div className="space-y-2">
                    <FieldLabel required htmlFor="cashReceived">
                      {t("pos.cashReceived")}
                    </FieldLabel>
                    <Input
                      id="cashReceived"
                      required
                      type="number"
                      step="0.01"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={t("pos.enterTender")}
                      autoFocus
                    />

                    {parsedCashReceived >= total && (
                      <div className="rounded-lg border p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {t("pos.changeDue")}
                          </span>
                          <span className="text-base font-bold">
                            {formatCurrency(change)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod === "mobile_money" && (
                  <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                    {t("pos.confirmMobileMoney")}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              className="h-10 text-base font-semibold"
              onClick={() => setCheckoutDialogOpen(false)}
            >
              {t("pos.cancel")}
            </Button>

            {checkoutMode === "sale" ? (
              <Button
                className="flex-1 h-10 text-base font-semibold"
                onClick={completeSale}
                disabled={
                  !canSubmitSale || saleLoading ||
                  (paymentMethod === "cash" && parsedCashReceived < total)
                }
              >
                {saleLoading ? t("pos.processing") : t("pos.completeSale")}
              </Button>
            ) : (
              <Button
                className="flex-1 h-10 text-base font-semibold"
                onClick={placeOrder}
                disabled={!canSubmitSale || saleLoading || !customerId}
              >
                {saleLoading ? t("pos.processing") : t("pos.placeCreditOrder")}
              </Button>
            )}

            {checkoutMode === "sale" && (
              <Button
                variant="outline"
                className="h-10 text-base font-semibold"
                onClick={() => handleCheckout("order")}
                disabled={!canSubmitSale || cartItems.length === 0 || !customerId}
              >
                {t("pos.switchCreditOrder")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREDIT LIMIT WARNING */}
      <AlertDialog
        open={creditWarningDialog}
        onOpenChange={setCreditWarningDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Credit Limit Exceeded</AlertDialogTitle>
            <AlertDialogDescription>
              This order would exceed the customer&apos;s credit limit of{" "}
              {formatCurrency(selectedCustomer?.credit_limit || 0)}. Current
              balance:{" "}
              {formatCurrency(selectedCustomer?.outstanding_balance || 0)}. This
              order would add {formatCurrency(total)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setCreditWarningDialog(false);
                placeOrder();
              }}
            >
              Override & Place Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SalePrintPreviewDialog
        saleId={salePrintSaleId}
        open={salePrintOpen}
        onOpenChange={setSalePrintOpen}
      />
    </>
  );
}
