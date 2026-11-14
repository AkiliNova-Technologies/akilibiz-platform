import { csvSafeCell } from "@/lib/contact-export";

export type CatalogueExportEntity = "products" | "categories";
export const CATALOGUE_EXPORT_LIMIT = 5000;
export const CATALOGUE_EXPORT_BATCH = 500;

const columns: Record<CatalogueExportEntity, readonly string[]> = {
  products: [
    "name", "sku", "barcode", "brand", "stock_unit", "selling_price_ugx",
    "cost_price_ugx", "is_active", "updated_at",
  ],
  categories: [
    "name", "slug", "description", "is_active", "updated_at",
  ],
};

export function catalogueExportColumns(entity: CatalogueExportEntity): readonly string[] {
  return columns[entity];
}
export function catalogueExportCsv(
  entity: CatalogueExportEntity,
  records: ReadonlyArray<Record<string, unknown>>,
): string {
  const fields = catalogueExportColumns(entity);
  return [
    fields.map(csvSafeCell).join(","),
    ...records.map(record => fields.map(field => csvSafeCell(record[field])).join(",")),
  ].join("\r\n") + "\r\n";
}
