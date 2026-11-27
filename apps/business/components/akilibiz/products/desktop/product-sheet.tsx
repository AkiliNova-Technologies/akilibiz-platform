// GENERATED from the AkiliBiz Desktop repository (src/components/product-sheet.tsx). Do not edit here:
// change the desktop file, then run `node apps/business/scripts/sync-desktop-i18n.mjs`.
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/akilibiz/desktop-shared/searchable-select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { inventoryUnitOptions, unitChoices, isPositiveNumber, isNonnegativeNumber } from "@/lib/desktop-shared/product-units";
import {
  IconRefresh,
  IconPackage,
  IconCash,
  IconSettings,
  IconEdit,
  IconPlus,
} from "@tabler/icons-react";
import { useReduxTax } from "@/components/akilibiz/products/desktop-adapters/use-redux-tax";
import { toast } from "sonner";
import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";

export type ProductType = "stock_item" | "service" | "digital" | "fee";
const stepIds = ["type", "general", "stock", "pricing", "advanced"] as const;
const stepLabels = ["Type", "Details", "Units", "Pricing", "Review"] as const;
type FormStep = (typeof stepIds)[number];
export type InventoryType =
  | "count"
  | "weight"
  | "liquid"
  | "length"
  | "area"
  | "volume";

export interface ProductFormData {
  name: string;
  sku: string;
  barcode: string;
  category_id: string;
  brand: string;
  description: string;

  product_type: ProductType;
  inventory_type: InventoryType;

  stock_unit: string;
  sales_unit: string;
  purchase_unit: string;
  unit_conversion_factor: string;
  pack_size: string;
  package_content_quantity: string;
  package_content_unit: string;

  cost_price: string;
  selling_price: string;
  wholesale_price: string;
  minimum_selling_price: string;

  stock_quantity: string;
  min_stock_level: string;
  max_stock_level: string;

  allow_decimal_quantity: boolean;
  allow_negative_stock: boolean;
  track_expiry: boolean;
  track_batches: boolean;
  is_taxable: boolean;
  tax_classification_id: string;
  tax_inclusive: boolean;
  is_active: boolean;
}

interface Category {
  id: number;
  name: string;
}

interface ProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEdit?: boolean;
  initialData: ProductFormData;
  onSubmit: (data: ProductFormData) => Promise<void> | void;
  categories?: Category[];
}

function generateSku(productName: string, categoryName?: string) {
  const clean = (value: string) =>
    value
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .map((part) => part.slice(0, 3))
      .join("");

  const namePart = clean(productName || "ITEM");
  const categoryPart = clean(categoryName || "GEN").slice(0, 3) || "GEN";
  const suffix = Math.floor(100 + Math.random() * 900);

  return `${categoryPart}-${namePart}-${suffix}`;
}

function toNumber(value: string) {
  return parseFloat(value || "0");
}

export function ProductSheet({
  open,
  onOpenChange,
  isEdit = false,
  initialData,
  onSubmit,
  categories = [],
}: ProductSheetProps) {
  const { t } = useI18n();
  const { classifications, getTaxClassifications } = useReduxTax();
  const [formData, setFormData] = useState<ProductFormData>(initialData);
  const [skuEditedManually, setSkuEditedManually] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<FormStep>("type");

  useEffect(() => {
    setFormData(initialData);
    setSkuEditedManually(Boolean(initialData.sku));
    setActiveTab("type");
  }, [initialData, open]);

  useEffect(() => {
    if (open && classifications.length === 0) {
      getTaxClassifications();
    }
  }, [open, classifications.length, getTaxClassifications]);

  const selectedCategoryName = useMemo(() => {
    const found = categories.find((c) => String(c.id) === formData.category_id);
    return found?.name;
  }, [categories, formData.category_id]);

  useEffect(() => {
    if (formData.name.trim() && !skuEditedManually && !formData.sku.trim()) {
      // Stable identifier: generate once, not on each name/category keystroke.
      setFormData((prev) => prev.sku.trim() ? prev : ({
        ...prev, sku: generateSku(prev.name, selectedCategoryName),
      }));
    }
  }, [formData.name, formData.sku, selectedCategoryName, skuEditedManually]);

  const stockUnitOptions = useMemo(
    () => unitChoices(formData.inventory_type, formData.stock_unit),
    [formData.inventory_type, formData.stock_unit],
  );
  const salesUnitOptions = useMemo(
    () => unitChoices(formData.inventory_type, formData.sales_unit),
    [formData.inventory_type, formData.sales_unit],
  );

  const changeInventoryType = (value: InventoryType) => {
    if (formData.inventory_type === value) return;
    const defaultUnit = inventoryUnitOptions[value][0];
    setFormData((prev) => ({
      ...prev, inventory_type: value,
      stock_unit: defaultUnit, sales_unit: defaultUnit, purchase_unit: defaultUnit,
      unit_conversion_factor: "1", pack_size: "",
      allow_decimal_quantity: value !== "count",
    }));
  };

  const isStockTracked = formData.product_type === "stock_item";
  const visibleSteps: readonly FormStep[] = isStockTracked ? stepIds : stepIds.filter((step) => step !== "stock");

  const profitPerUnit =
    toNumber(formData.selling_price) - toNumber(formData.cost_price);
  const profitMargin =
    toNumber(formData.selling_price) > 0
      ? (profitPerUnit / toNumber(formData.selling_price)) * 100
      : 0;

  const changeProductType = (value: ProductType) => {
    setFormData((prev) => ({
      ...prev,
      product_type: value,
      ...(value === "stock_item" ? {} : {
        inventory_type: "count" as const,
        stock_unit: "pcs", sales_unit: "pcs", purchase_unit: "pcs",
        unit_conversion_factor: "1", pack_size: "",
        min_stock_level: "0", max_stock_level: "0",
        allow_decimal_quantity: false, allow_negative_stock: false,
        track_expiry: false, track_batches: false,
      }),
    }));
  };

  const updateField = <K extends keyof ProductFormData>(
    key: K,
    value: ProductFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const regenerateSku = () => {
    setFormData((prev) => ({
      ...prev,
      sku: generateSku(prev.name, selectedCategoryName),
    }));
    setSkuEditedManually(true);
  };

  const applyPreset = (
    preset: "retail" | "packaged_liquid" | "packaged_powder" | "bulk_goods" | "liquid" | "length" | "area" | "volume" | "service",
  ) => {
    const presetMap = {
      retail: {
        product_type: "stock_item" as const,
        inventory_type: "count" as const,
        stock_unit: "pcs",
        sales_unit: "pcs",
        purchase_unit: "box",
        allow_decimal_quantity: false,
      },
      packaged_liquid: {
        product_type: "stock_item" as const,
        inventory_type: "count" as const,
        stock_unit: "bottle",
        sales_unit: "bottle",
        purchase_unit: "bottle",
        allow_decimal_quantity: false,
      },
      packaged_powder: {
        product_type: "stock_item" as const,
        inventory_type: "count" as const,
        stock_unit: "packet",
        sales_unit: "packet",
        purchase_unit: "packet",
        allow_decimal_quantity: false,
      },
      bulk_goods: {
        product_type: "stock_item" as const,
        inventory_type: "weight" as const,
        stock_unit: "kg",
        sales_unit: "kg",
        purchase_unit: "sack",
        allow_decimal_quantity: true,
      },
      liquid: {
        product_type: "stock_item" as const,
        inventory_type: "liquid" as const,
        stock_unit: "ltr",
        sales_unit: "ltr",
        purchase_unit: "carton",
        allow_decimal_quantity: true,
      },
      length: {
        product_type: "stock_item" as const,
        inventory_type: "length" as const,
        stock_unit: "m",
        sales_unit: "m",
        purchase_unit: "roll",
        allow_decimal_quantity: true,
      },
      area: {
        product_type: "stock_item" as const,
        inventory_type: "area" as const,
        stock_unit: "sqm",
        sales_unit: "sqm",
        purchase_unit: "sqm",
        allow_decimal_quantity: true,
      },
      volume: {
        product_type: "stock_item" as const,
        inventory_type: "volume" as const,
        stock_unit: "cbm",
        sales_unit: "cbm",
        purchase_unit: "cbm",
        allow_decimal_quantity: true,
      },
      service: {
        product_type: "service" as const,
        inventory_type: "count" as const,
        stock_unit: "pcs",
        sales_unit: "pcs",
        purchase_unit: "pcs",
        allow_decimal_quantity: false,
      },
    };

    setFormData((prev) => ({
      ...prev,
      ...presetMap[preset],
      unit_conversion_factor: "1",
      pack_size: "",
      ...(preset === "service" ? {
        min_stock_level: "0", max_stock_level: "0",
        track_expiry: false, track_batches: false, allow_negative_stock: false,
      } : {}),
    }));
  };

  const validateGeneralTab = () => {
    if (!formData.name.trim()) {
      toast.error(t("productForm.nameRequired"));
      setActiveTab("general");
      return false;
    }
    if (!formData.sku.trim()) {
      toast.error(t("productForm.skuRequired"));
      setActiveTab("general");
      return false;
    }
    if (!formData.category_id) {
      toast.error(t("productForm.categoryRequired"));
      setActiveTab("general");
      return false;
    }
    return true;
  };

  const validatePricingTab = () => {
    if (!isNonnegativeNumber(formData.cost_price)) {
      toast.error(t("productForm.costNegative"));
      setActiveTab("pricing");
      return false;
    }
    if (!isPositiveNumber(formData.selling_price)) {
      toast.error(t("productForm.sellingRequired"));
      setActiveTab("pricing");
      return false;
    }
    return true;
  };

  const validateStockTab = () => {
    if (!isStockTracked) return true;
    if (!formData.stock_unit.trim() || !formData.sales_unit.trim() || !formData.purchase_unit.trim()) {
      toast.error("Stock, sales and purchase units are required.");
      setActiveTab("stock");
      return false;
    }
    if (!isPositiveNumber(formData.unit_conversion_factor)) {
      toast.error("Conversion factor must be greater than zero.");
      setActiveTab("stock");
      return false;
    }
    const quantityProvided = formData.package_content_quantity.trim() !== "";
    const unitProvided = formData.package_content_unit.trim() !== "";
    if (quantityProvided !== unitProvided ||
      (quantityProvided && !isPositiveNumber(formData.package_content_quantity))) {
      toast.error("Enter both the package contents and measurement unit, or leave both blank.");
      setActiveTab("stock");
      return false;
    }
    if (formData.pack_size.trim() && !isPositiveNumber(formData.pack_size)) {
      toast.error("Pack size must be greater than zero.");
      setActiveTab("stock");
      return false;
    }
    if (!isNonnegativeNumber(formData.min_stock_level) ||
      !isNonnegativeNumber(formData.max_stock_level) ||
      Number(formData.max_stock_level) < Number(formData.min_stock_level)) {
      toast.error("Check the minimum and maximum stock levels.");
      setActiveTab("stock");
      return false;
    }
    return true;
  };

  const goToStep = (target: FormStep) => {
    const from = visibleSteps.indexOf(activeTab);
    const to = visibleSteps.indexOf(target);
    if (to < 0) return;
    if (to > from) {
      if (stepIds.indexOf(target) > 1 && !validateGeneralTab()) return;
      if (isStockTracked && stepIds.indexOf(target) > 2 && !validateStockTab()) return;
      if (stepIds.indexOf(target) > 3 && !validatePricingTab()) return;
    }
    setActiveTab(target);
  };

  const handleSubmit = async () => {
    if (!validateGeneralTab()) return;
    if (!validatePricingTab()) return;
    if (!validateStockTab()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full w-full flex-col overflow-hidden bg-background p-0 sm:max-w-3xl">
        <SheetHeader className="shrink-0 border-b px-5 text-left sm:px-7">
          <div className="py-4">
            <div className="flex items-center gap-5">
              <div className="p-2 rounded-lg bg-primary/10">
                {isEdit ? (
                  <IconEdit className="size-5 text-primary" />
                ) : (
                  <IconPlus className="size-5 text-primary" />
                )}
              </div>
              <div>
                <SheetTitle className="text-xl text-foreground">
                  {isEdit ? t("products.edit") : t("products.add")}
                </SheetTitle>
                <SheetDescription className="text-muted-foreground">
                  {isEdit
                    ? t("productForm.editDescription")
                    : t("productForm.addDescription")}
                </SheetDescription>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <Tabs value={activeTab} onValueChange={(value) => goToStep(value as FormStep)} className="w-full">
            <TabsList className={`grid h-auto w-full rounded-full bg-muted p-1 ${isStockTracked ? "grid-cols-5" : "grid-cols-4"}`}>
              {visibleSteps.map((step, index) => (
                <TabsTrigger key={step} value={step} className="min-w-0 gap-1 px-1 py-2 text-xs sm:gap-2 sm:text-sm">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-current text-[10px] sm:size-6 sm:text-xs">{index + 1}</span>
                  <span className="truncate">{stepLabels[stepIds.indexOf(step)]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="type" className="mt-5 space-y-5">
              <div>
                <h3 className="text-base font-semibold">What are you selling?</h3>
                <p className="mt-1 text-sm text-muted-foreground">Choose the product type, then use a quick setup option if helpful.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FieldLabel required>{t("productForm.productType")}</FieldLabel>
                  <Select
                    value={formData.product_type}
                    onValueChange={(value: ProductType) =>
                      changeProductType(value)
                    }>
                    <SelectTrigger aria-required="true" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock_item">{t("productForm.stockItem")}</SelectItem>
                      <SelectItem value="service">{t("productForm.service")}</SelectItem>
                      <SelectItem value="digital">{t("productForm.digital")}</SelectItem>
                      <SelectItem value="fee">{t("productForm.fee")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {isStockTracked && <div className="space-y-2">
                  <FieldLabel required>{t("productForm.inventoryType")}</FieldLabel>
                  <Select
                    value={formData.inventory_type}
                    onValueChange={(value: InventoryType) =>
                      changeInventoryType(value)
                    }>
                    <SelectTrigger aria-required="true" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count">{t("productForm.count")}</SelectItem>
                      <SelectItem value="weight">{t("productForm.weight")}</SelectItem>
                      <SelectItem value="liquid">{t("productForm.liquid")}</SelectItem>
                      <SelectItem value="length">{t("productForm.length")}</SelectItem>
                      <SelectItem value="area">{t("productForm.area")}</SelectItem>
                      <SelectItem value="volume">{t("productForm.volume")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>}


              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Quick setup</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("retail")}>
              {t("productForm.retailItem")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("bulk_goods")}>
              {t("productForm.bulkGoods")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("packaged_liquid")}>
              Bottled / packaged liquid
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("packaged_powder")}>
              Packaged powder / dry goods
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("liquid")}>
              Loose liquid (sold by volume)
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("length")}>
              {t("productForm.lengthBased")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("area")}>
              Area-based
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("volume")}>
              Volume-based
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => applyPreset("service")}>
              {t("productForm.service")}
            </Button>
          </div>
                <p className="text-xs text-muted-foreground">Presets select suggested units. You can change them in the Units step.</p>
              </div>
            </TabsContent>
            <TabsContent value="general" className="mt-5 space-y-5">
              <div>
                <h3 className="text-base font-semibold">Product details</h3>
                <p className="mt-1 text-sm text-muted-foreground">Provide the name, category and identifiers used at checkout.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <FieldLabel required htmlFor="name">{t("productForm.name")}</FieldLabel>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder={t("productForm.enterName")}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel required htmlFor="sku">{t("productForm.sku")}</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      id="sku"
                      required
                      value={formData.sku}
                      onChange={(e) => {
                        setSkuEditedManually(true);
                        updateField("sku", e.target.value);
                      }}
                      placeholder={t("productForm.autoSku")}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={regenerateSku}
                      title="Generate a new SKU"
                      aria-label="Generate a new SKU"
                      className="h-11 w-11">
                      <IconRefresh className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcode">{t("productForm.barcode")}</Label>
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => updateField("barcode", e.target.value)}
                    placeholder={t("productForm.optionalBarcode")}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel required>{t("products.category")}</FieldLabel>
                  <SearchableSelect
                    value={formData.category_id}
                    onValueChange={(value) => updateField("category_id", value)}
                    options={categories.map((category) => ({
                      value: String(category.id),
                      label: category.name,
                    }))}
                    placeholder={t("productForm.selectCategory")}
                    searchPlaceholder="Search categories..."
                    emptyMessage="No matching categories"
                    aria-label={t("products.category")}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brand">{t("productForm.brand")}</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => updateField("brand", e.target.value)}
                    placeholder={t("productForm.optionalBrand")}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">{t("productForm.description")}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder={t("productForm.describeProduct")}
                    rows={4}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stock" className="mt-5 space-y-5">
              <div>
                <h3 className="text-base font-semibold">{isStockTracked ? "Units & stock" : "Stock tracking not needed"}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isStockTracked ? "For packaged goods, count each bottle, packet, sachet, tin or bag—not the ml, mg or g inside. Keep the package size in the product name (such as 500 ml or 500 mg). Use ml, g or kg only for loose goods sold by measurement. Add opening stock through Inventory."
                    : "This product type does not require a physical stock balance."}
                </p>
              </div>
              {!isStockTracked ? (
                <CardNotice
                  title={t("productForm.stockTrackingDisabled")}
                  description={t("productForm.stockTrackingDisabledDescription")}
                  icon={<IconPackage className="size-4" />}
                />
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <FieldLabel required>{t("productForm.stockUnit")}</FieldLabel>
                      <Select
                        value={formData.stock_unit}
                        onValueChange={(value) =>
                          updateField("stock_unit", value)
                        }>
                        <SelectTrigger aria-required="true" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {stockUnitOptions.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <FieldLabel required>{t("productForm.salesUnit")}</FieldLabel>
                      <Select
                        value={formData.sales_unit}
                        onValueChange={(value) =>
                          updateField("sales_unit", value)
                        }>
                        <SelectTrigger aria-required="true" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {salesUnitOptions.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("productForm.purchaseUnit")}</Label>
                      <Input
                        value={formData.purchase_unit}
                        onChange={(e) =>
                          updateField("purchase_unit", e.target.value)
                        }
                        placeholder={t("productForm.purchaseUnitHint")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t("productForm.conversionFactor")}</Label>
                      <p className="text-xs text-muted-foreground">How many stock units are in one purchase unit? Purchase orders convert to stock units; goods receipts are recorded in stock units. POS has separate measurement conversion.</p>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.unit_conversion_factor}
                        onChange={(e) =>
                          updateField("unit_conversion_factor", e.target.value)
                        }
                        placeholder={t("productForm.conversionFactorHint")}
                      />
                    </div>

                    <div className="space-y-3 rounded-xl border bg-muted/20 p-3 md:col-span-2">
                      <div>
                        <h4 className="text-sm font-medium">Contents of one package (optional)</h4>
                        <p className="text-xs text-muted-foreground">
                          A 500 ml bottle or 500 mg sachet counts as one item in stock.
                          These fields describe what is inside each package; they do not change stock quantities or prices.
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="package-content-quantity">Amount per package</Label>
                          <Input id="package-content-quantity" type="number" min="0" step="any"
                            placeholder="e.g. 500" value={formData.package_content_quantity}
                            onChange={(e) => updateField("package_content_quantity", e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="package-content-unit">Measurement unit</Label>
                          <Select value={formData.package_content_unit || "none"}
                            onValueChange={(v) => updateField("package_content_unit", v === "none" ? "" : v)}>
                            <SelectTrigger id="package-content-unit" className="w-full">
                              <SelectValue placeholder="Select measurement" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Not specified</SelectItem>
                              {["mg", "g", "kg", "tonne", "ml", "cl", "dl", "ltr", "mm", "cm", "m"].map((unit) => (
                                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {formData.package_content_quantity && formData.package_content_unit && (
                        <p className="text-xs text-muted-foreground">
                          One {formData.stock_unit} contains {formData.package_content_quantity} {formData.package_content_unit}.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>{t("productForm.stockBalance")}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t("productForm.stockBalanceHint")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("productForm.packSize")}</Label>
                      <p className="text-xs text-muted-foreground">Optional pack quantity expressed in your stock unit.</p>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.pack_size}
                        onChange={(e) =>
                          updateField("pack_size", e.target.value)
                        }
                        placeholder={t("productForm.optionalPackSize")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t("productForm.minimumStock")}</Label>
                      <Input
                        type="number"
                        step={formData.allow_decimal_quantity ? "0.01" : "1"}
                        value={formData.min_stock_level}
                        onChange={(e) =>
                          updateField("min_stock_level", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>{t("productForm.maximumStock")}</Label>
                      <Input
                        type="number"
                        step={formData.allow_decimal_quantity ? "0.01" : "1"}
                        value={formData.max_stock_level}
                        onChange={(e) =>
                          updateField("max_stock_level", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <ToggleRow
                      label={t("productForm.allowDecimals")}
                      description={t("productForm.allowDecimalsDescription")}
                      checked={formData.allow_decimal_quantity}
                      onCheckedChange={(checked) =>
                        updateField("allow_decimal_quantity", checked)
                      }
                    />
                    <ToggleRow
                      label={t("productForm.allowNegative")}
                      description={t("productForm.allowNegativeDescription")}
                      checked={formData.allow_negative_stock}
                      onCheckedChange={(checked) =>
                        updateField("allow_negative_stock", checked)
                      }
                    />
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="pricing" className="mt-5 space-y-5">
              <div>
                <h3 className="text-base font-semibold">Pricing</h3>
                <p className="mt-1 text-sm text-muted-foreground">Enter cost and selling price per {isStockTracked ? formData.stock_unit : "item or service"}. POS calculates measured-unit sales from this stock-unit price.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("products.costPrice")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cost_price}
                    onChange={(e) => updateField("cost_price", e.target.value)}
                    placeholder={t("productForm.enterCost")}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel required>{t("products.sellingPrice")}</FieldLabel>
                  <Input
                    type="number"
                    required
                    step="0.01"
                    value={formData.selling_price}
                    onChange={(e) =>
                      updateField("selling_price", e.target.value)
                    }
                    placeholder={t("productForm.enterSelling")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("productForm.wholesalePrice")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.wholesale_price}
                    onChange={(e) =>
                      updateField("wholesale_price", e.target.value)
                    }
                    placeholder={t("productForm.optionalWholesale")}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("productForm.minimumSelling")}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.minimum_selling_price}
                    onChange={(e) =>
                      updateField("minimum_selling_price", e.target.value)
                    }
                    placeholder={t("productForm.optionalMinimum")}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <SummaryCard
                  label={t("productForm.profitPerUnit")}
                  value={profitPerUnit.toFixed(2)}
                  icon={<IconCash className="size-4" />}
                />
                <SummaryCard
                  label={t("products.margin")}
                  value={`${profitMargin.toFixed(1)}%`}
                  icon={<IconCash className="size-4" />}
                />
                <SummaryCard
                  label={t("productForm.salesUnit")}
                  value={formData.sales_unit || "-"}
                  icon={<IconPackage className="size-4" />}
                />
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="mt-5 space-y-5">
              <div>
                <h3 className="text-base font-semibold">Review your product</h3>
                <p className="mt-1 text-sm text-muted-foreground">Confirm your details, tax treatment and optional tracking settings before saving.</p>
              </div>
              <dl className="grid gap-3 rounded-xl border bg-muted/30 p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-muted-foreground">Name</dt><dd className="font-medium">{formData.name || "Not entered"}</dd></div>
                <div><dt className="text-muted-foreground">Category</dt><dd className="font-medium">{selectedCategoryName || "Not selected"}</dd></div>
                <div><dt className="text-muted-foreground">SKU</dt><dd className="font-medium">{formData.sku || "Not generated"}</dd></div>
                <div><dt className="text-muted-foreground">Selling price</dt><dd className="font-medium">UGX {formData.selling_price || "0"} / {isStockTracked ? formData.stock_unit : formData.sales_unit}</dd></div>
                {formData.package_content_quantity && formData.package_content_unit && (
                  <div><dt className="text-muted-foreground">Contents per package</dt><dd className="font-medium">{formData.package_content_quantity} {formData.package_content_unit}</dd></div>
                )}
              </dl>
              <div className="grid gap-4 md:grid-cols-2">
                {isStockTracked && <ToggleRow
                  label={t("productForm.trackExpiry")}
                  description={t("productForm.trackExpiryDescription")}
                  checked={formData.track_expiry}
                  onCheckedChange={(checked) =>
                    updateField("track_expiry", checked)
                  }
                />}

                {isStockTracked && <ToggleRow
                  label={t("productForm.trackBatches")}
                  description={t("productForm.trackBatchesDescription")}
                  checked={formData.track_batches}
                  onCheckedChange={(checked) =>
                    updateField("track_batches", checked)
                  }
                />}

                <div className="space-y-2">
                  <Label>{t("productForm.taxClassification")}</Label>
                  <Select
                    value={formData.tax_classification_id}
                    onValueChange={(value) => {
                      updateField("tax_classification_id", value);
                      const code = classifications.find(
                        (classification) => String(classification.id) === value,
                      )?.code;
                      updateField(
                        "is_taxable",
                        code === "STANDARD_RATED" || code === "ZERO_RATED",
                      );
                    }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("productForm.selectTaxClassification")} />
                    </SelectTrigger>
                    <SelectContent>
                      {classifications.map((classification) => (
                        <SelectItem
                          key={classification.id}
                          value={String(classification.id)}>
                          {classification.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!formData.tax_classification_id && (
                    <p className="text-xs text-muted-foreground">
                      VAT treatment needs review. VAT-registered businesses must
                      choose one before selling this product.
                    </p>
                  )}
                </div>

                <ToggleRow
                  label={t("productForm.taxInclusive")}
                  description={t("productForm.taxInclusiveDescription")}
                  checked={formData.tax_inclusive}
                  onCheckedChange={(checked) =>
                    updateField("tax_inclusive", checked)
                  }
                />

                <ToggleRow
                  label={t("common.active")}
                  description={t("productForm.activeDescription")}
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    updateField("is_active", checked)
                  }
                />
              </div>

              <div className="rounded-lg border bg-input/30 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <IconSettings className="size-4 text-muted-foreground" />
                  <p className="font-medium">{t("productForm.behaviourSummary")}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{formData.product_type}</Badge>
                  <Badge variant="outline">{formData.inventory_type}</Badge>
                  <Badge variant="outline">
                    {t("productForm.stockSummary", { unit: formData.stock_unit || "-" })}
                  </Badge>
                  <Badge variant="outline">
                    {t("productForm.salesSummary", { unit: formData.sales_unit || "-" })}
                  </Badge>
                  <Badge variant="outline">
                    {t("productForm.purchaseSummary", { unit: formData.purchase_unit || "-" })}
                  </Badge>
                  {formData.allow_decimal_quantity && (
                    <Badge>{t("productForm.decimalQuantity")}</Badge>
                  )}
                  {formData.track_batches && <Badge>{t("productForm.batchTracking")}</Badge>}
                  {formData.track_expiry && <Badge>{t("productForm.expiryTracking")}</Badge>}
                  {formData.tax_classification_id && (
                    <Badge>{t("productForm.taxClassified")}</Badge>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="shrink-0 border-t bg-background px-5 py-4 sm:px-7">
          <SheetFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => {
              const index = visibleSteps.indexOf(activeTab);
              if (index === 0) onOpenChange(false);
              else setActiveTab(visibleSteps[index - 1]);
            }}>
              {activeTab === "type" ? t("common.cancel") : t("common.previous")}
            </Button>
            {activeTab !== "advanced" ? (
              <Button type="button" disabled={isSubmitting} onClick={() => {
                const index = visibleSteps.indexOf(activeTab);
                goToStep(visibleSteps[index + 1]);
              }}>{t("common.next")}</Button>
            ) : (
              <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
                {isSubmitting ? (isEdit ? t("productForm.updating") : t("productForm.creating")) :
                  isEdit ? t("productForm.update") : t("productForm.create")}
              </Button>
            )}
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="pr-4">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-input/30 p-4">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function CardNotice({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-input/30 p-4">
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <p className="font-medium">{title}</p>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
