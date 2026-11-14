export type HostedMovement = {
  movement_id: string;
  local_business_public_id: string;
  local_product_id: number;
  source_movement_id: number;
  delta_milli: number;
  before_milli: number;
  after_milli: number;
  movement_type: string | null;
  reason: string | null;
  notes: string | null;
  accepted_at: string;
  total_count: number;
};

export function sourceProductKey(source: string, localId: number): string {
  return JSON.stringify([source,localId]);
}

export function validateHostedMovement(row: HostedMovement): boolean {
  return !!row.movement_id &&
    Number.isSafeInteger(row.local_product_id) && row.local_product_id > 0 &&
    [row.delta_milli,row.before_milli,row.after_milli].every(Number.isSafeInteger) &&
    row.before_milli + row.delta_milli === row.after_milli &&
    row.after_milli >= 0 &&
    Number.isSafeInteger(row.total_count) && row.total_count >= 0 &&
    !Number.isNaN(Date.parse(row.accepted_at));
}

export function formatMilliStock(value: number): string {
  return new Intl.NumberFormat("en-UG", { maximumFractionDigits: 3 }).format(value / 1000);
}
