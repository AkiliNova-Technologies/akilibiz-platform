"use client";

// Web stand-in for the desktop's useReduxProducts on the Products screen.
// Adding a product prepares a web draft and asks the paired desktop to create
// it (the desktop applies it with its own checks, then syncs it back).
import { useCallback } from "react";
import { toast } from "sonner";
import { catalogueStore, useCatalogueState } from "./catalogue-store";

export type DesktopCreateProduct = {
  name: string; sku: string; barcode: string | null; category_id: number; brand: string | null;
  description: string | null; product_type: "stock_item" | "service" | "digital" | "fee";
  inventory_type: "count" | "weight" | "liquid" | "length" | "area" | "volume";
  stock_unit: string; sales_unit: string; purchase_unit: string | null; unit_conversion_factor: number;
  pack_size: number | null; package_content_quantity: number | null; package_content_unit: string | null;
  cost_price: number; selling_price: number; wholesale_price: number | null; minimum_selling_price: number | null;
  min_stock_level: number; max_stock_level: number; allow_decimal_quantity: boolean;
  allow_negative_stock: boolean; track_expiry: boolean; track_batches: boolean; is_taxable: boolean;
  tax_classification_id: number | null; tax_inclusive: boolean; is_active: boolean;
};

async function json(response: Response) {
  return (await response.json().catch(() => null)) as Record<string, unknown> | null;
}

export async function requestDesktopProductCreate(input: DesktopCreateProduct): Promise<boolean> {
  const category = catalogueStore.get().categories.find((c) => c.id === input.category_id);
  if (!category) { toast.error("Choose a category that is synced from the desktop."); return false; }
  if (!Number.isSafeInteger(input.cost_price) || !Number.isSafeInteger(input.selling_price)) {
    toast.error("Prices must be whole UGX amounts."); return false;
  }
  const draftId = crypto.randomUUID();
  const draft = await fetch("/api/products/drafts", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: draftId, name: input.name, sku: input.sku, category_id: category.hosted_id,
      barcode: input.barcode, brand: input.brand, description: input.description,
      stock_unit: input.stock_unit, cost_price_ugx: input.cost_price, selling_price_ugx: input.selling_price,
      desktop_options: {
        product_type: input.product_type, inventory_type: input.inventory_type,
        sales_unit: input.sales_unit, purchase_unit: input.purchase_unit || input.stock_unit,
        unit_conversion_factor: input.unit_conversion_factor, min_stock_level: input.min_stock_level,
        max_stock_level: input.max_stock_level, allow_decimal_quantity: input.allow_decimal_quantity,
        allow_negative_stock: input.allow_negative_stock, track_expiry: input.track_expiry,
        track_batches: input.track_batches, tax_inclusive: input.tax_inclusive,
        package_content_quantity: input.package_content_quantity, package_content_unit: input.package_content_unit,
      },
    }),
  });
  if (!draft.ok) { toast.error(String((await json(draft))?.error ?? "Could not prepare the product.")); return false; }
  const request = await fetch("/api/sync/product-creates", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draftId, requestId: crypto.randomUUID() }),
  });
  if (!request.ok) {
    toast.error(String((await json(request))?.error ?? "Could not send the product to the desktop."), {
      description: "The product was saved as a draft. Send it from Products → Drafts.",
    });
    return false;
  }
  toast.success("Product sent to the desktop", {
    description: "It appears here once the desktop creates it and syncs.",
  });
  return true;
}

export function useReduxProducts() {
  const { products, loading, error } = useCatalogueState();
  const getProducts = useCallback(() => catalogueStore.load(), []);
  const addProduct = useCallback((input: DesktopCreateProduct) => requestDesktopProductCreate(input), []);
  // Replaced by desktop change requests in edit-requests.ts.
  const editProduct = useCallback(async (_id: number, _input: DesktopCreateProduct) => {
    toast.info("Edit this product on the desktop for now."); return false;
  }, []);
  const removeProduct = useCallback(async (_id: number) => {
    toast.info("Deactivate this product on the desktop for now."); return false;
  }, []);
  return { products, loading, error, getProducts, addProduct, editProduct, removeProduct };
}
