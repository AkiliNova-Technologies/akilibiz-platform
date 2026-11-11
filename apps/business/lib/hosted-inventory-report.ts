/** Mapping for the qualified desktop effective-inventory projection.
 * Financial valuation is intentionally outside this read-only contract.
 */
export type HostedStockProduct = {
  id: string; local_product_id: number; name: string; sku: string;
  stock_unit: string; category_id: string | null; is_active: boolean;
  selling_price_ugx: number | null; cost_price_ugx: number | null;
};
export type HostedStockCategory = {
  id: string; local_category_id: number; name: string;
};
export type HostedStockPosition = {
  product_id: string; on_hand_milli: number | null; reserved_milli: number | null;
  damaged_milli: number | null; minimum_milli: number | null;
  maximum_milli: number | null; is_current: boolean;
  snapshot_at: string | null;
};
export type HostedStockReportRow = {
  id: number; name: string; sku: string; stock_unit: string;
  category_id: number; category_name: string;
  on_hand_milli: number; reserved_milli: number; damaged_milli: number;
  available_milli: number; minimum_milli: number; maximum_milli: number;
  is_active: boolean; cost_price_ugx: number | null; selling_price_ugx: number | null;
  snapshot_at: string | null;
  stock_status: "In stock" | "Low stock" | "Out of stock";
};
const milli = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
export function mapHostedStockReport(
  products: HostedStockProduct[], categories: HostedStockCategory[],
  inventory: HostedStockPosition[],
): HostedStockReportRow[] {
  const cat = new Map(categories.map(row => [row.id,row]));
  const positions = new Map<string, HostedStockPosition>();
  for (const row of inventory) {
    if (!row.is_current) continue;
    if (positions.has(row.product_id)) throw new Error("Conflicting current inventory positions.");
    positions.set(row.product_id,row);
  }
  const rows: HostedStockReportRow[]=[];
  for (const product of products) {
    const position=positions.get(product.id);
    if (!position) continue; // A product without an authoritative position is not stock on hand.
    if (!Number.isSafeInteger(product.local_product_id) || product.local_product_id<=0 ||
        !milli(position.on_hand_milli) || !milli(position.reserved_milli) ||
        !milli(position.damaged_milli) || !milli(position.minimum_milli) ||
        !milli(position.maximum_milli)) {
      throw new Error("Some stock positions have invalid or missing exact quantities.");
    }
    const available=Math.max(0,position.on_hand_milli-position.reserved_milli-position.damaged_milli);
    if (!Number.isSafeInteger(available)) throw new Error("Stock position exceeds supported exact quantity.");
    const category=product.category_id===null?null:cat.get(product.category_id);
    rows.push({
      id:product.local_product_id,name:product.name,sku:product.sku,
      stock_unit:product.stock_unit,category_id:category?.local_category_id??0,
      category_name:category?.name??"Uncategorized",
      on_hand_milli:position.on_hand_milli,reserved_milli:position.reserved_milli,
      damaged_milli:position.damaged_milli,available_milli:available,
      minimum_milli:position.minimum_milli,maximum_milli:position.maximum_milli,
      is_active:product.is_active,cost_price_ugx:product.cost_price_ugx,
      selling_price_ugx:product.selling_price_ugx,snapshot_at:position.snapshot_at,
      stock_status:available===0?"Out of stock":available<=position.minimum_milli?"Low stock":"In stock",
    });
  }
  return rows;
}
