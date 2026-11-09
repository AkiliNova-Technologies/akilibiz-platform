"use client";

export type FinancialMirrorRow = { localRecordId: number; capturedAt: string; record: Record<string, unknown> };
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
