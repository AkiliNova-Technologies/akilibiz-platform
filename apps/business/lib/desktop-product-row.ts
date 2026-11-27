// Shapes a synced desktop product like the desktop Products screen's row
// (desktop ProductResponseDto), using the desktop's own rules for margin and
// low stock (src-tauri/src/services/product_service.rs map_product).

export type HostedCatalogueProduct = {
  id: string; local_business_public_id: string; local_product_id: number; category_id: string; name: string; sku: string;
  barcode: string | null; description: string | null; brand: string | null; stock_unit: string;
  sales_unit: string | null; selling_price_ugx: number | null; cost_price_ugx: number | null;
  allow_decimal_quantity: boolean | null; tax_inclusive: boolean | null; is_active: boolean;
  updated_at: string; details: Record<string, unknown> | null;
};

/** The desktop's seeded tax classes (desktop migration 0029), same ids and codes. */
export const DESKTOP_TAX_CLASSIFICATIONS = [
  { id: 1, code: "STANDARD_RATED", name: "Standard Rated", description: "Subject to standard VAT rate", requires_vat_registration: true, is_active: true },
  { id: 2, code: "ZERO_RATED", name: "Zero Rated", description: "Subject to 0% VAT rate", requires_vat_registration: true, is_active: true },
  { id: 3, code: "EXEMPT", name: "Exempt", description: "Exempt from VAT", requires_vat_registration: true, is_active: true },
  { id: 4, code: "OUT_OF_SCOPE", name: "Out of Scope", description: "Outside the scope of VAT", requires_vat_registration: false, is_active: true },
] as const;

const PRODUCT_TYPES = ["stock_item", "service", "digital", "fee"] as const;
const INVENTORY_TYPES = ["count", "weight", "liquid", "length", "area", "volume"] as const;
const str = (v: unknown) => (typeof v === "string" ? v : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bool = (v: unknown, fallback = false) => (typeof v === "boolean" ? v : fallback);

export function desktopProductRow(
  p: HostedCatalogueProduct,
  category: { local_category_id: number; name: string } | null,
  onHandMilli: number | null,
) {
  const d = p.details ?? {};
  const cost = p.cost_price_ugx ?? 0;
  const selling = p.selling_price_ugx ?? 0;
  const stock = onHandMilli === null ? 0 : onHandMilli / 1000;
  const minLevel = (num(d.min_stock_level_milli) ?? 0) / 1000;
  const taxName = str(d.tax_classification);
  const productType = str(d.product_type);
  const inventoryType = str(d.inventory_type);
  return {
    id: p.local_product_id,
    hosted_id: p.id,
    source: p.local_business_public_id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    description: p.description,
    brand: p.brand,
    product_type: (PRODUCT_TYPES as readonly string[]).includes(productType ?? "") ? productType as typeof PRODUCT_TYPES[number] : "stock_item",
    inventory_type: (INVENTORY_TYPES as readonly string[]).includes(inventoryType ?? "") ? inventoryType as typeof INVENTORY_TYPES[number] : "count",
    stock_unit: p.stock_unit,
    sales_unit: p.sales_unit ?? p.stock_unit,
    purchase_unit: str(d.purchase_unit) ?? p.stock_unit,
    unit_conversion_factor: num(d.unit_conversion_factor) ?? 1,
    pack_size: num(d.pack_size),
    package_content_quantity: num(d.package_content_quantity),
    package_content_unit: str(d.package_content_unit),
    cost_price: cost,
    selling_price: selling,
    wholesale_price: num(d.wholesale_price_ugx),
    minimum_selling_price: num(d.minimum_selling_price_ugx),
    stock_quantity: stock,
    stock_known: onHandMilli !== null,
    min_stock_level: minLevel,
    max_stock_level: (num(d.max_stock_level_milli) ?? 0) / 1000,
    allow_decimal_quantity: p.allow_decimal_quantity ?? false,
    allow_negative_stock: bool(d.allow_negative_stock),
    track_expiry: bool(d.track_expiry),
    track_batches: bool(d.track_batches),
    is_taxable: bool(d.is_taxable),
    tax_classification_id: DESKTOP_TAX_CLASSIFICATIONS.find((c) => c.name === taxName)?.id ?? null,
    tax_inclusive: p.tax_inclusive ?? false,
    category_id: category?.local_category_id,
    category_name: category?.name,
    is_active: p.is_active,
    created_at: str(d.created_at) ?? p.updated_at,
    updated_at: p.updated_at,
    profit_margin: selling > 0 ? ((selling - cost) / selling) * 100 : 0,
    is_low_stock: stock <= minLevel,
  };
}
export type DesktopProductRow = ReturnType<typeof desktopProductRow>;
