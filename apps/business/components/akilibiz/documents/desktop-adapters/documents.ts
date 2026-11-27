// Web stand-in for the desktop's @/services/tauri/documents: the receipt comes
// from the desktop-published receipt snapshot (/api/receipts/[saleId]), and a
// print is acknowledged on the hosted side (the desktop audit log is local).
import type { CanonicalReceipt } from "@/lib/desktop-shared/receipt-types";
import type { BusinessProfile, ReceiptSettings } from "./settings";

type Snapshot = {
  businessProfile: BusinessProfile | null;
  receiptSettings: ReceiptSettings | null;
};

let snapshot: Snapshot = { businessProfile: null, receiptSettings: null };
const sources = new Map<number, string>();
const listeners = new Set<() => void>();

export const receiptSettingsStore = {
  get: () => snapshot,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

type Row = Record<string, unknown>;
const text = (value: unknown) => (typeof value === "string" ? value : null);
const flag = (value: unknown, fallback: boolean) =>
  value === true || value === 1 || value === "1" ? true :
  value === false || value === 0 || value === "0" ? false : fallback;

function toBusinessProfile(row: Row | null): BusinessProfile | null {
  if (!row || !text(row.business_name)) return null;
  return {
    id: Number(row.id) || 0,
    business_name: text(row.business_name) ?? "",
    trading_name: text(row.trading_name),
    owner_name: text(row.owner_name),
    email: text(row.email),
    phone: text(row.phone),
    tin: text(row.tin),
    registration_number: text(row.registration_number),
    address: text(row.address),
    city: text(row.city),
    country: text(row.country),
    currency: text(row.currency) ?? "UGX",
    timezone: text(row.timezone) ?? "Africa/Kampala",
    logo_media_ref: text(row.logo_media_ref),
    cover_media_ref: text(row.cover_media_ref),
    // Desktop media files stay on the desktop; the web receipt prints without them.
    logo_media_url: null,
    cover_media_url: null,
    created_at: text(row.created_at) ?? "",
    updated_at: text(row.updated_at) ?? "",
  };
}

const profiles = ["thermal-58mm", "thermal-80mm", "document-a4"] as const;
function toReceiptSettings(row: Row | null): ReceiptSettings | null {
  if (!row) return null;
  const profile = text(row.print_profile);
  return {
    id: Number(row.id) || 0,
    business_header: text(row.business_header),
    footer_message: text(row.footer_message),
    show_logo: flag(row.show_logo, true),
    show_tin: flag(row.show_tin, true),
    show_cashier_name: flag(row.show_cashier_name, true),
    show_customer_name: flag(row.show_customer_name, true),
    show_payment_method: flag(row.show_payment_method, true),
    show_thank_you_note: flag(row.show_thank_you_note, true),
    receipt_width: text(row.receipt_width) ?? "80mm",
    print_profile: profiles.includes(profile as typeof profiles[number])
      ? (profile as ReceiptSettings["print_profile"]) : "thermal-80mm",
    copies_per_print: Math.max(1, Number(row.copies_per_print) || 1),
    auto_print_after_sale: flag(row.auto_print_after_sale, false),
    created_at: text(row.created_at) ?? "",
    updated_at: text(row.updated_at) ?? "",
  };
}

async function failure(response: Response): Promise<Error> {
  const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
  return new Error(typeof body?.error === "string" ? body.error : "The receipt could not be loaded.");
}

export const tauriDocumentsService = {
  async getCanonicalReceipt(saleId: number): Promise<CanonicalReceipt> {
    const response = await fetch(`/api/receipts/${saleId}`, { cache: "no-store" });
    if (!response.ok) throw await failure(response);
    const body = (await response.json()) as {
      receipt: CanonicalReceipt; source: string; businessProfile: Row | null; receiptSettings: Row | null;
    };
    sources.set(saleId, body.source);
    snapshot = {
      businessProfile: toBusinessProfile(body.businessProfile) ?? snapshot.businessProfile,
      receiptSettings: toReceiptSettings(body.receiptSettings) ?? snapshot.receiptSettings,
    };
    listeners.forEach((listener) => listener());
    return body.receipt;
  },
  async recordSalePrintAudit(saleId: number): Promise<void> {
    const response = await fetch(`/api/receipts/${saleId}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: sources.get(saleId) ?? "" }),
    });
    if (!response.ok) throw await failure(response);
  },
};
