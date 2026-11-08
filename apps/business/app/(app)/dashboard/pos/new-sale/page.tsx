"use client";

"use client";

import { useState, useEffect, useMemo } from "react";
import { SalePrintPreviewDialog } from "@/components/akilibiz/documents/SalePrintPreviewDialog";
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
import { Search, Plus, Minus, Trash2, Receipt, Banknote, X, ShoppingCart, Package, Smartphone, RefreshCw, AlertTriangle, Barcode } from "lucide-react";
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
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  stockUnit: string;
  isActive: boolean;
  isTaxable: boolean;
  taxClassificationId: number | null;
  taxInclusive: boolean;
  image?: string;
}

type CheckoutMode = "sale" | "order";

// ============================================================================
// UTILITIES
// ============================================================================

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function POSPage() {
  const { products, loading, getProducts, categories, getCategories, addSale, saleLoading, customers, getCustomers, scores, getCustomerRisk, riskLoading, taxSettings, getTaxSettings, getTaxClassifications, cartItems, cartSubtotal, cartTotal, customerId, addToReduxCart, updateItemQuantity, removeFromCart, clearReduxCart, applyDiscount, assignCustomer } = usePosData();

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

  const updateQuantity = (productId: number, newQuantity: number) => {
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

  const clearCart = () => {
    clearReduxCart();
    setDiscount(0);
    setCashReceived("");
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

    if (result) {
      clearCart();
      setCheckoutDialogOpen(false);
      setPaymentMethod("cash");
      setCashReceived("");
      toast.success(t("pos.saleCompleted", { number: result.sale_number }));
      setSalePrintSaleId(result.id);
      setSalePrintOpen(true);
    }
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

    if (result) {
      clearCart();
      setCheckoutDialogOpen(false);
      setDueDate("");
      setOrderNotes("");
      toast.success(t("pos.orderPlaced", { number: result.sale_number }));
    }
  };

  return (
    <>
      <div className="min-h-full max-h-[calc(100vh-5rem)] min-w-0">
        <div className="grid max-h-[calc(100vh-8rem)] gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(360px,420px)]">
          {/* PRODUCT AREA */}
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="border-b">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <CardTitle className="text-xl">{t("pos.counter")}</CardTitle>
                  <CardDescription>
                    {t("pos.counterDescription")}
                  </CardDescription>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="relative w-full min-w-0 sm:min-w-[220px] sm:flex-1">
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
                    <SelectTrigger className="w-full sm:w-52">
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

                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`size-4 ${loading ? "animate-spin" : ""}`}
                    />
                    {t("pos.refresh")}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="h-[calc(100vh-88px)] max-h-[calc(100vh-17rem)] overflow-y-auto p-4 md:p-5">
              {loading ? (
                <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                  {t("pos.loadingProducts")}
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
                <div
                  className="grid gap-4"
                  style={{
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(220px, 1fr))",
                  }}
                >
                  {filteredProducts.map((product) => {
                    const isLowStock = product.stock > 0 && product.stock <= 10;
                    const isOutOfStock = product.stock <= 0;

                    return (
                      <Card
                        key={product.id}
                        onClick={() => addToCart(product)}
                        className={`cursor-pointer border-border/60 py-0 transition hover:border-border hover:shadow-sm ${
                          isOutOfStock ? "opacity-70" : ""
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="mb-4 flex aspect-square items-center justify-center rounded-xl bg-input/30">
                            <Package className="size-12 text-primary/80" />
                          </div>

                          <div className="space-y-3">
                            <div>
                              <h3 className="line-clamp-2 font-medium leading-tight">
                                {product.name}
                              </h3>
                              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                <Barcode className="size-3.5" />
                                <span className="font-mono">{product.sku}</span>
                              </div>
                            </div>

                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-base font-semibold">
                                  {formatCurrency(product.price)}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {product.category}
                                </p>
                              </div>

                              {isOutOfStock ? (
                                <Badge variant="destructive">
                                  {t("pos.outOfStock")}
                                </Badge>
                              ) : isLowStock ? (
                                <Badge variant="outline">
                                  {t("pos.lowStock", { count: product.stock })}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  {t("pos.inStock", { count: product.stock })}
                                </Badge>
                              )}
                            </div>

                            {isLowStock && !isOutOfStock && (
                              <div className="flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs text-muted-foreground">
                                <AlertTriangle className="size-3.5" />
                                {t("pos.lowStockItem")}
                              </div>
                            )}

                            {product.isTaxable && (
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

          {/* CART AREA */}
          <Card className="flex h-full flex-col overflow-hidden border-border/60">
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

            <div className="flex-1 overflow-y-auto bg-muted/10 p-4">
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
                        className="border-border/60 shadow-none py-0"
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

            <div className="border-t p-4">
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
                    disabled={cartItems.length === 0}
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
                  saleLoading ||
                  (paymentMethod === "cash" && parsedCashReceived < total)
                }
              >
                {saleLoading ? t("pos.processing") : t("pos.completeSale")}
              </Button>
            ) : (
              <Button
                className="flex-1 h-10 text-base font-semibold"
                onClick={placeOrder}
                disabled={saleLoading || !customerId}
              >
                {saleLoading ? t("pos.processing") : t("pos.placeCreditOrder")}
              </Button>
            )}

            {checkoutMode === "sale" && (
              <Button
                variant="outline"
                className="h-10 text-base font-semibold"
                onClick={() => handleCheckout("order")}
                disabled={cartItems.length === 0 || !customerId}
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
