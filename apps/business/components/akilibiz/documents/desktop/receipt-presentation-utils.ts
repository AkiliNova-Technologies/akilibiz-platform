// GENERATED from the AkiliBiz Desktop repository (src/components/documents/receipt-presentation-utils.ts). Do not edit here:
// change the desktop file, then run `node apps/business/scripts/sync-desktop-i18n.mjs`.
import type { BusinessProfile } from "@/components/akilibiz/documents/desktop-adapters/settings";
import type { CanonicalReceipt } from "@/lib/desktop-shared/receipt-types";

export type ReceiptPresentationSettings = { business_header: string | null; footer_message: string | null; show_logo: boolean; show_tin: boolean; show_cashier_name: boolean; show_customer_name: boolean; show_payment_method: boolean; show_thank_you_note: boolean; receipt_width: string; print_profile?: string; copies_per_print: number };
export type ReceiptBusinessProfile = Pick<BusinessProfile, "business_name" | "trading_name" | "address" | "city" | "country" | "phone" | "email" | "tin" | "logo_media_url">;

export const defaultReceiptPresentationSettings: ReceiptPresentationSettings = { business_header: "", footer_message: "", show_logo: true, show_tin: true, show_cashier_name: true, show_customer_name: true, show_payment_method: true, show_thank_you_note: true, receipt_width: "80mm", print_profile: "thermal-80mm", copies_per_print: 1 };
export const formatReceiptMoney = (amount: number, currency: string, locale = "en-UG") => new Intl.NumberFormat(locale, { style: "currency", currency: currency || "UGX", minimumFractionDigits: 0 }).format(amount);
export const formatReceiptQuantity = (milli: number) => { const sign = milli < 0 ? "-" : ""; const value = Math.abs(milli); const fraction = String(value % 1000).padStart(3, "0").replace(/0+$/, ""); return `${sign}${Math.floor(value / 1000)}${fraction ? `.${fraction}` : ""}`; };
export const formatReceiptDate = (value: string, locale = "en-UG") => { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date); };
export const receiptPaperWidth = (width: string) => width.trim() === "58mm" ? "58mm" : "80mm";
export const resolveReceiptHeader = (customHeader: string | null | undefined, businessProfile: ReceiptBusinessProfile | null | undefined, fallback: string) => {
  const custom = customHeader?.trim();
  const identity = businessProfile?.trading_name?.trim() || businessProfile?.business_name?.trim();
  return custom || identity || fallback;
};

/** Settings-only sample; fixed values, never used for a sale receipt. */
export const normalizeReceiptSettingsExample = (): CanonicalReceipt => ({ schema_version: "example", sale: { sale_id: 0, receipt_number: "RCPT-000142", sale_number: "EXAMPLE", created_at_utc: "2026-09-08T10:30:00Z", status: "example", reversal_status: "not_reversed", cancelled_at_utc: null, cancellation_reason: null, currency_code: "UGX" }, business: { identity_source: "example", name: "Your business (preview)", trading_name: null, address: null, phone: null, email: null, tin: null, registration_number: null }, cashier: { display_name: "Amina K." }, customer: null, lines: [{ sale_item_id: 1, name: "Arabica coffee, 250 g", sku: "EXAMPLE", quantity_milli: 2000, unit_price_ugx: 18000, discount_ugx: 0, taxable_amount_ugx: 36000, tax_amount_ugx: 7650, tax_code: null, tax_classification: null, tax_rate_basis_points: null, tax_rounding_method: null, line_total_ugx: 36000 }], totals: { subtotal_ugx: 36000, discount_total_ugx: 2500, taxable_total_ugx: 36000, tax_total_ugx: 7650, grand_total_ugx: 41150, amount_paid_ugx: 60000, change_ugx: 18850, balance_due_ugx: 0 }, payments: [{ payment_method: "Cash", amount_ugx: 60000, reference: null, created_at_utc: "2026-09-08T10:30:00Z" }], presentation: { footer: null, presentation_source: "example", reprint: false, copy_number: null, qr_payload: null, barcode_payload: null } });
