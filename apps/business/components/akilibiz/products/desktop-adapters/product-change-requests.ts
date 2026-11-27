"use client";

// Web product edits and deactivations: requests the paired desktop reviews and
// applies with its own product update (see /api/sync/product-changes).
import { toast } from "sonner";
import { DESKTOP_TAX_CLASSIFICATIONS, type DesktopProductRow } from "@/lib/desktop-product-row";
import { catalogueStore } from "./catalogue-store";
import type { DesktopCreateProduct } from "./use-redux-products";

type Changes = Record<string, unknown>;
const FIELDS = ["name", "sku", "barcode", "brand", "category_id", "description", "product_type", "inventory_type",
  "stock_unit", "sales_unit", "purchase_unit", "unit_conversion_factor", "pack_size", "package_content_quantity",
  "package_content_unit", "cost_price", "selling_price", "wholesale_price", "minimum_selling_price",
  "min_stock_level", "max_stock_level", "allow_decimal_quantity", "allow_negative_stock", "track_expiry",
  "track_batches", "is_taxable", "tax_inclusive", "is_active"] as const;

const blank = (v: unknown) => v === null || v === undefined || v === "";
const same = (a: unknown, b: unknown) =>
  (blank(a) && blank(b)) || (typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < 1e-9 : a === b);

/** Only the fields the owner changed, in the desktop update contract. */
export function productChanges(current: DesktopProductRow, next: DesktopCreateProduct): Changes {
  const changes: Changes = {};
  for (const field of FIELDS) {
    const before = (current as Record<string, unknown>)[field];
    const after = (next as Record<string, unknown>)[field];
    if (!same(before, after)) changes[field] = after;
  }
  if (!same(current.tax_classification_id, next.tax_classification_id)) {
    changes.tax_classification_code =
      DESKTOP_TAX_CLASSIFICATIONS.find((c) => c.id === next.tax_classification_id)?.code ?? null;
  }
  return changes;
}

// One request identity per intended change, kept until the server accepts it,
// so a retried submission is never queued twice.
const pending = new Map<string, string>();

async function send(operation: "update" | "deactivate", product: DesktopProductRow, changes?: Changes) {
  if (!catalogueStore.get().changeRequestsEnabled) {
    toast.info(operation === "update" ? "Edit this product on the desktop for now." : "Deactivate this product on the desktop for now.");
    return false;
  }
  const key = JSON.stringify([operation, product.hosted_id, changes ?? null]);
  const requestId = pending.get(key) ?? crypto.randomUUID();
  pending.set(key, requestId);
  let response: Response;
  try {
    response = await fetch("/api/sync/product-changes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation, requestId, source: product.source, productId: product.id, ...(changes ? { changes } : {}) }),
    });
  } catch {
    toast.error("Could not reach AkiliBiz. Try again; the change will not be sent twice.");
    return false;
  }
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    if (response.status !== 502 && response.status !== 503) pending.delete(key);
    toast.error(body?.error ?? "Could not send the change to the desktop.");
    return false;
  }
  pending.delete(key);
  toast.success(operation === "update" ? "Change sent to the desktop" : "Deactivation sent to the desktop", {
    description: "The desktop reviews it; the catalogue updates here after it is applied and synced.",
  });
  return true;
}

export async function requestProductEdit(productId: number, next: DesktopCreateProduct) {
  const product = catalogueStore.get().products.find((p) => p.id === productId);
  if (!product) { toast.error("This product is no longer in the synced catalogue."); return false; }
  const changes = productChanges(product, next);
  if (Object.keys(changes).length === 0) { toast.info("No changes to send."); return false; }
  return send("update", product, changes);
}

export async function requestProductDeactivation(productId: number) {
  const product = catalogueStore.get().products.find((p) => p.id === productId);
  if (!product) { toast.error("This product is no longer in the synced catalogue."); return false; }
  return send("deactivate", product);
}
