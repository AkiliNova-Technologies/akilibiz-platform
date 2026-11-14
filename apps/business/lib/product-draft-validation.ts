export type DesktopProductOptions = {
  product_type: "stock_item" | "service" | "digital" | "fee";
  inventory_type: "count" | "weight" | "liquid" | "length" | "area" | "volume";
  sales_unit: string;
  purchase_unit: string;
  unit_conversion_factor: number;
  min_stock_level: number;
  max_stock_level: number;
  allow_decimal_quantity: boolean;
  allow_negative_stock: boolean;
  track_expiry: boolean;
  track_batches: boolean;
  tax_inclusive: boolean;
  package_content_quantity: number | null;
  package_content_unit: string | null;
};

export const DEFAULT_PRODUCT_OPTIONS: DesktopProductOptions = {
  product_type: "stock_item",
  inventory_type: "count",
  sales_unit: "pcs",
  purchase_unit: "pcs",
  unit_conversion_factor: 1,
  min_stock_level: 0,
  max_stock_level: 0,
  allow_decimal_quantity: false,
  allow_negative_stock: false,
  track_expiry: false,
  track_batches: false,
  tax_inclusive: false,
  package_content_quantity: null,
  package_content_unit: null,
};

const productTypes = ["stock_item","service","digital","fee"];
const inventoryTypes = ["count","weight","liquid","length","area","volume"];
const measureUnits = ["mg","g","kg","tonne","ml","cl","dl","ltr","mm","cm","m"];
export function parseDesktopProductOptions(input: unknown): DesktopProductOptions | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const o = input as Record<string,unknown>;
  const keys = Object.keys(DEFAULT_PRODUCT_OPTIONS);
  if (Object.keys(o).length !== keys.length || Object.keys(o).some(k=>!keys.includes(k))) return null;
  if (!productTypes.includes(o.product_type as string) ||
      !inventoryTypes.includes(o.inventory_type as string)) return null;
  if (typeof o.sales_unit !== "string" || typeof o.purchase_unit !== "string" ||
      !o.sales_unit.trim() || !o.purchase_unit.trim() ||
      o.sales_unit.length > 40 || o.purchase_unit.length > 40 ||
      /[\u0000-\u001f]/.test(o.sales_unit) || /[\u0000-\u001f]/.test(o.purchase_unit)) return null;
  for(const name of ["unit_conversion_factor","min_stock_level","max_stock_level"]){
    const value=o[name];
    if(typeof value!=="number" || !Number.isFinite(value) ||
       value < 0 || value > 1_000_000_000 ||
       (name==="unit_conversion_factor" && value===0)) return null;
  }
  if((o.max_stock_level as number)<(o.min_stock_level as number)) return null;
  for(const name of ["allow_decimal_quantity","allow_negative_stock","track_expiry",
    "track_batches","tax_inclusive"]){
    if(typeof o[name]!=="boolean") return null;
  }
  if(o.package_content_quantity===null && o.package_content_unit===null){
    // Package contents are optional and must be supplied together.
  } else if (typeof o.package_content_quantity !== "number" ||
    !Number.isFinite(o.package_content_quantity) ||
    o.package_content_quantity <= 0 ||
    o.package_content_quantity > 1_000_000_000 ||
    typeof o.package_content_unit !== "string" ||
    !measureUnits.includes(o.package_content_unit)) return null;
  return {
    product_type:o.product_type as DesktopProductOptions["product_type"],
    inventory_type:o.inventory_type as DesktopProductOptions["inventory_type"],
    sales_unit:o.sales_unit.trim() as string,
    purchase_unit:o.purchase_unit.trim() as string,
    unit_conversion_factor:o.unit_conversion_factor as number,
    min_stock_level:o.min_stock_level as number,
    max_stock_level:o.max_stock_level as number,
    allow_decimal_quantity:o.allow_decimal_quantity as boolean,
    allow_negative_stock:o.allow_negative_stock as boolean,
    track_expiry:o.track_expiry as boolean,
    track_batches:o.track_batches as boolean,
    tax_inclusive:o.tax_inclusive as boolean,
    package_content_quantity:o.package_content_quantity as number|null,
    package_content_unit:o.package_content_unit as string|null,
  };
}

export type ProductDraftInput = {
  id: string;
  name: string;
  sku: string;
  category_id: string;
  barcode: string | null;
  brand: string | null;
  description: string | null;
  stock_unit: string;
  cost_price_ugx: number;
  selling_price_ugx: number;
  desktop_options?: DesktopProductOptions;
};

const uuidV4=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseProductDraft(value:unknown):ProductDraftInput|null {
  if(!value || typeof value!=="object" || Array.isArray(value)) return null;
  const row=value as Record<string,unknown>;
  const expected=["id","name","sku","category_id","barcode","brand","description","stock_unit","cost_price_ugx","selling_price_ugx"];
  if((Object.keys(row).length!==expected.length && Object.keys(row).length!==expected.length+1) ||
    Object.keys(row).some(key=>!expected.includes(key) && key!=="desktop_options")) return null;
  const desktopOptions=row.desktop_options===undefined ? undefined : parseDesktopProductOptions(row.desktop_options);
  if(row.desktop_options!==undefined && !desktopOptions) return null;
  if(typeof row.id!=="string"||!uuidV4.test(row.id)||
     typeof row.category_id!=="string"||!uuid.test(row.category_id)) return null;
  const limits={name:200,sku:160,stock_unit:40} as const;
  for(const [key,max] of Object.entries(limits)) {
    const field=row[key];
    if(typeof field!=="string"||!field.trim()||field.length>max||
      /[\u0000-\u001f]/.test(field))return null;
  }
  const optional={barcode:160,brand:200,description:3000} as const;
  for(const [key,max] of Object.entries(optional)) {
    const field=row[key];
    if(field!==null &&
      (typeof field!=="string"||field.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(field))) return null;
  }
  for(const key of ["cost_price_ugx","selling_price_ugx"]) {
    const amount=row[key];
    if(typeof amount!=="number"||!Number.isSafeInteger(amount)||amount<0)return null;
  }
  return {
    id:row.id as string,
    name:(row.name as string).trim(),sku:(row.sku as string).trim(),
    category_id:row.category_id as string,
    barcode:(row.barcode as string|null)?.trim()||null,
    brand:(row.brand as string|null)?.trim()||null,
    description:(row.description as string|null)?.trim()||null,
    stock_unit:(row.stock_unit as string).trim(),
    cost_price_ugx:row.cost_price_ugx as number,
    selling_price_ugx:row.selling_price_ugx as number,
    ...(desktopOptions ? {desktop_options:desktopOptions} : {}),
  };
}
