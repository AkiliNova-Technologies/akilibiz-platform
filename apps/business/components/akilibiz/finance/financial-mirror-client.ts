"use client";

export type FinancialMirrorRow = { localRecordId: number; localBusinessPublicId?: string; capturedAt: string; record: Record<string, unknown> };
export type FinancialMirrorResponse = { entity: string; rows: FinancialMirrorRow[]; page: number; pageSize: number; total: number; lastSuccessfulSync: string | null; isStale: boolean; readOnly: true };

export async function loadFinancialMirror(entity: string, options: { page?: number; pageSize?: number; signal?: AbortSignal } = {}): Promise<FinancialMirrorResponse> {
  const query = new URLSearchParams({ entity, page: String(options.page ?? 1), pageSize: String(options.pageSize ?? 100) });
  const response = await fetch(`/api/financial-mirrors?${query}`, { cache: "no-store", signal: options.signal });
  const body = (await response.json()) as FinancialMirrorResponse & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Financial mirror request failed.");
  return body;
}

export function mirrorValue(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== null && value !== undefined) return value;
  }
  return undefined;
}

/**
 * Fetch a complete bounded snapshot for cross-entity read-only reports.
 * A partial result is never silently treated as a complete ledger.
 */
export async function loadAllFinancialMirrorRows(entity: string, maxRows = 5000): Promise<FinancialMirrorRow[]> {
  const rows: FinancialMirrorRow[] = [];
  let expectedTotal: number | null = null;
  let expectedSync: string | null = null;
  for (let page = 1; page <= Math.ceil(maxRows / 100); page++) {
    const result = await loadFinancialMirror(entity, { page, pageSize: 100 });
    if (result.total > maxRows) throw new Error(
      "This business has more synchronized records than this report can display safely. Narrow the report or use a paginated view."
    );
    if (!Number.isSafeInteger(result.total) || result.total < 0 ||
        result.page !== page || result.pageSize !== 100 || !Array.isArray(result.rows))
      throw new Error("The synchronized report response is invalid. Refresh to retry.");
    if (expectedTotal === null) {
      expectedTotal = result.total;
      expectedSync = result.lastSuccessfulSync;
    } else if (result.total !== expectedTotal || result.lastSuccessfulSync !== expectedSync) {
      throw new Error("The synchronized records changed while this report was loading. Refresh to retry.");
    }
    rows.push(...result.rows);
    if (rows.length === expectedTotal) return rows;
    if (rows.length > expectedTotal || result.rows.length === 0) throw new Error(
      "The synchronized records changed while this report was loading. Refresh to retry."
    );
  }
  throw new Error("The complete synchronized report could not be loaded.");
}
