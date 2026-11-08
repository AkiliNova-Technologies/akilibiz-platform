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
import {
  IconRefresh,
  IconPackage,
  IconCash,
  IconSettings,
  IconEdit,
  IconPlus,
} from "@tabler/icons-react";
import { useReduxTax } from "@/hooks/useReduxTax";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";

export type ProductType = "stock_item" | "service" | "digital" | "fee";
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

const inventoryUnitOptions: Record<InventoryType, string[]> = {
  count: [
    "pcs",
    "box",
    "pack",
    "carton",
    "tray",
    "dozen",
    "roll",
    "sack",
    "bale",
  ],
  weight: ["kg", "g", "tonne"],
  liquid: ["ltr", "ml"],
  length: ["m", "cm", "ft"],
  area: ["sqm"],
  volume: ["cbm"],
};

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
  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    setFormData(initialData);
    setSkuEditedManually(Boolean(initialData.sku));
    setActiveTab("general");
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
    if (!skuEditedManually && formData.name.trim()) {
      setFormData((prev) => ({
        ...prev,
        sku: generateSku(prev.name, selectedCategoryName),
      }));
    }
  }, [formData.name, selectedCategoryName, skuEditedManually]);

  const unitOptions = useMemo(
    () => inventoryUnitOptions[formData.inventory_type] || [],
    [formData.inventory_type],
  );

  useEffect(() => {
    if (!unitOptions.includes(formData.stock_unit)) {
      const defaultUnit = unitOptions[0] || "pcs";
      setFormData((prev) => ({
        ...prev,
        stock_unit: defaultUnit,
        sales_unit: defaultUnit,
        purchase_unit: defaultUnit,
      }));
    }
  }, [formData.inventory_type, unitOptions, formData.stock_unit]);

  const isStockTracked = formData.product_type === "stock_item";

  const profitPerUnit =
    toNumber(formData.selling_price) - toNumber(formData.cost_price);
  const profitMargin =
    toNumber(formData.selling_price) > 0
      ? (profitPerUnit / toNumber(formData.selling_price)) * 100
      : 0;

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
    setSkuEditedManually(false);
  };

  const applyPreset = (
    preset: "retail" | "bulk_goods" | "liquid" | "length" | "service",
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
    if (toNumber(formData.cost_price) < 0) {
      toast.error(t("productForm.costNegative"));
      setActiveTab("pricing");
      return false;
    }
    if (toNumber(formData.selling_price) <= 0) {
      toast.error(t("productForm.sellingRequired"));
      setActiveTab("pricing");
      return false;
    }
    return true;
  };

  const validateStockTab = () => {
    if (isStockTracked) {
      if (!formData.stock_unit || !formData.sales_unit) {
        toast.error(t("productForm.unitsRequired"));
        setActiveTab("stock");
        return false;
      }
    }
    return true;
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
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 bg-white dark:bg-[#323232] px-4 md:px-6">
        <SheetHeader className="text-left dark:bg-[#323232] pl-0 border-b">
          <div className="sticky top-0 z-10 bg-white py-4 dark:border-gray-700 dark:bg-[#323232]">
            <div className="flex items-center gap-5">
              <div className="p-2 rounded-lg bg-primary/10">
                {isEdit ? (
                  <IconEdit className="size-5 text-primary" />
                ) : (
                  <IconPlus className="size-5 text-primary" />
                )}
              </div>
              <div>
                <SheetTitle className="text-xl text-gray-900 dark:text-primary">
                  {isEdit ? t("products.edit") : t("products.add")}
                </SheetTitle>
                <SheetDescription className="text-gray-600 dark:text-gray-400">
                  {isEdit
                    ? t("productForm.editDescription")
                    : t("productForm.addDescription")}
                </SheetDescription>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-2 space-y-5">
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
              onClick={() => applyPreset("liquid")}>
              {t("productForm.liquid")}
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
              onClick={() => applyPreset("service")}>
              {t("productForm.service")}
            </Button>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-input/30">
              <TabsTrigger value="general">{t("productForm.general")}</TabsTrigger>
              <TabsTrigger value="stock">{t("products.stock")}</TabsTrigger>
              <TabsTrigger value="pricing">{t("productForm.pricing")}</TabsTrigger>
              <TabsTrigger value="advanced">{t("productForm.advanced")}</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-4 space-y-5">
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
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) =>
                      updateField("category_id", value)
                    }>
                    <SelectTrigger aria-required="true" className="w-full">
                      <SelectValue placeholder={t("productForm.selectCategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

                <div className="space-y-2">
                  <FieldLabel required>{t("productForm.productType")}</FieldLabel>
                  <Select
                    value={formData.product_type}
                    onValueChange={(value: ProductType) =>
                      updateField("product_type", value)
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

                <div className="space-y-2">
                  <FieldLabel required>{t("productForm.inventoryType")}</FieldLabel>
                  <Select
                    value={formData.inventory_type}
                    onValueChange={(value: InventoryType) =>
                      updateField("inventory_type", value)
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

            <TabsContent value="stock" className="mt-4 space-y-5">
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
                          {unitOptions.map((unit) => (
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
                          {unitOptions.map((unit) => (
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

                    <div className="space-y-2">
                      <Label>{t("productForm.stockBalance")}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t("productForm.stockBalanceHint")}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("productForm.packSize")}</Label>
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

            <TabsContent
              value="pricing"
              className="mt-4 min-h-[400px] space-y-5">
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

            <TabsContent
              value="advanced"
              className="mt-4 min-h-[400px] space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <ToggleRow
                  label={t("productForm.trackExpiry")}
                  description={t("productForm.trackExpiryDescription")}
                  checked={formData.track_expiry}
                  onCheckedChange={(checked) =>
                    updateField("track_expiry", checked)
                  }
                />

                <ToggleRow
                  label={t("productForm.trackBatches")}
                  description={t("productForm.trackBatchesDescription")}
                  checked={formData.track_batches}
                  onCheckedChange={(checked) =>
                    updateField("track_batches", checked)
                  }
                />

                <div className="space-y-2">
                  <Label>{t("productForm.taxClassification")}</Label>
                  <Select
                    value={formData.tax_classification_id}
                    onValueChange={(value) => {
                      updateField("tax_classification_id", value);
                      updateField(
                        "is_taxable",
                        value !== "" && value !== "OUT_OF_SCOPE",
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

        <div className="sticky bottom-0 mt-auto border-t bg-white px-0 py-4 dark:bg-[#323232]">
          <SheetFooter className="flex flex-col gap-3">
            {!isEdit && (
              <div className="flex w-full gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    const tabs = ["general", "stock", "pricing", "advanced"];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex > 0) {
                      setActiveTab(tabs[currentIndex - 1]);
                    } else {
                      onOpenChange(false);
                    }
                  }}>
                  {activeTab === "general" ? t("common.cancel") : t("common.previous")}
                </Button>

                {activeTab !== "advanced" ? (
                  <Button
                    className="flex-1"
                    onClick={() => {
                      // Validate current tab before proceeding
                      let isValid = true;
                      if (activeTab === "general") {
                        isValid = validateGeneralTab();
                      } else if (activeTab === "pricing") {
                        isValid = validatePricingTab();
                      } else if (activeTab === "stock") {
                        isValid = validateStockTab();
                      }

                      if (isValid) {
                        const tabs = [
                          "general",
                          "stock",
                          "pricing",
                          "advanced",
                        ];
                        const currentIndex = tabs.indexOf(activeTab);
                        if (currentIndex < tabs.length - 1) {
                          setActiveTab(tabs[currentIndex + 1]);
                        }
                      }
                    }}>
                    {t("common.next")}
                  </Button>
                ) : (
                  <Button
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={isSubmitting}>
                    {isSubmitting ? t("productForm.creating") : t("productForm.create")}
                  </Button>
                )}
              </div>
            )}

            {isEdit && (
              <div className="flex w-full gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => onOpenChange(false)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubmit}
                  disabled={isSubmitting}>
                  {isSubmitting ? t("productForm.updating") : t("productForm.update")}
                </Button>
              </div>
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
