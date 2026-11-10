import type { ReceiptSettingsFormData, PrintProfileId } from "./receipt-settings-data";
import type { TaxSettingsFormData } from "./tax-settings-data";

export type MirrorPayload = Record<string, unknown>;

function string(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
function flag(value: unknown): boolean | null {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  return null;
}
function positiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}
const profileIds = ["thermal-58mm", "thermal-80mm", "document-a4"] as const;

export function parseReceiptSettings(record: MirrorPayload): ReceiptSettingsFormData | null {
  const business_header = string(record.business_header);
  const footer_message = record.footer_message === null ? "" : string(record.footer_message);
  const show_logo = flag(record.show_logo);
  const show_tin = flag(record.show_tin);
  const show_cashier_name = flag(record.show_cashier_name);
  const show_customer_name = flag(record.show_customer_name);
  const show_payment_method = flag(record.show_payment_method);
  const show_thank_you_note = flag(record.show_thank_you_note);
  const auto_print_after_sale = flag(record.auto_print_after_sale);
  const receipt_width = string(record.receipt_width);
  const copies_per_print = positiveInt(record.copies_per_print);
  const rawProfile = string(record.print_profile);
  const print_profile = profileIds.includes(rawProfile as PrintProfileId) ? rawProfile as PrintProfileId : null;
  if (business_header === null || footer_message === null || show_logo === null ||
      show_tin === null || show_cashier_name === null || show_customer_name === null ||
      show_payment_method === null || show_thank_you_note === null ||
      auto_print_after_sale === null || receipt_width === null ||
      copies_per_print === null || print_profile === null) return null;
  return { business_header, footer_message, show_logo, show_tin, show_cashier_name, show_customer_name,
    show_payment_method, show_thank_you_note, auto_print_after_sale, receipt_width, copies_per_print, print_profile };
}

export function parseTaxSettings(settings: MirrorPayload, configuration: MirrorPayload): TaxSettingsFormData | null {
  const vat_registered = flag(settings.vat_registered);
  const vat_registration_number = settings.vat_registration_number === null ? "" : string(settings.vat_registration_number);
  const default_tax_name = string(configuration.default_tax_name);
  const tax_number = configuration.tax_number === null ? "" : string(configuration.tax_number);
  const show_tax_on_receipt = flag(configuration.show_tax_on_receipt);
  if (vat_registered === null || vat_registration_number === null || default_tax_name === null ||
      !default_tax_name.trim() || tax_number === null || show_tax_on_receipt === null) return null;
  return { vat_registered, vat_registration_number, default_tax_name, tax_number, show_tax_on_receipt };
}
