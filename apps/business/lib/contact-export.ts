export const EXPORT_MAX_ROWS = 10000;
export const EXPORT_BATCH_SIZE = 500;

export type ExportEntity = "customers" | "suppliers";

export function exportColumns(entity: ExportEntity): readonly string[] {
  return entity === "customers"
    ? ["name", "email", "phone", "address", "customer_type", "loyalty_points", "is_active", "updated_at"]
    : ["name", "contact_person", "phone", "email", "address", "payment_terms", "is_active", "updated_at"];
}

/** Escape spreadsheet formulas and CSV controls, including leading whitespace. */
export function csvSafeCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  const safe = /^[\s\u0000-\u001f]*[=+@\-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function formatContactExport(
  entity: ExportEntity,
  records: ReadonlyArray<Record<string, unknown>>,
): string {
  const columns = exportColumns(entity);
  const rows = [
    columns.map(csvSafeCell).join(","),
    ...records.map(record => columns.map(column => csvSafeCell(record[column])).join(",")),
  ];
  return rows.join("\r\n") + "\r\n";
}
