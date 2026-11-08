/** Mirrors Rust `CanonicalReceipt`. Amounts are exact integer UGX values. */
export interface CanonicalReceipt {
  schema_version: string;
  sale: { sale_id: number; receipt_number: string; sale_number: string; created_at_utc: string; status: string; reversal_status: string; cancelled_at_utc: string | null; cancellation_reason: string | null; currency_code: string };
  business: { identity_source: string; name: string; trading_name: string | null; address: string | null; phone: string | null; email: string | null; tin: string | null; registration_number: string | null };
  cashier: { display_name: string };
  customer: { name: string; phone: string | null } | null;
  lines: Array<{ sale_item_id: number; name: string; sku: string; quantity_milli: number; unit_price_ugx: number; discount_ugx: number; taxable_amount_ugx: number | null; tax_amount_ugx: number; tax_code: string | null; tax_classification: string | null; tax_rate_basis_points: number | null; tax_rounding_method: string | null; line_total_ugx: number }>;
  totals: { subtotal_ugx: number; discount_total_ugx: number; taxable_total_ugx: number | null; tax_total_ugx: number; grand_total_ugx: number; amount_paid_ugx: number; change_ugx: number; balance_due_ugx: number };
  payments: Array<{ payment_method: string; amount_ugx: number; reference: string | null; created_at_utc: string }>;
  presentation: { footer: string | null; presentation_source: string; reprint: boolean; copy_number: number | null; qr_payload: string | null; barcode_payload: string | null };
}
export type ReceiptPresentationContext = { mode: "original" | "reprint" };
