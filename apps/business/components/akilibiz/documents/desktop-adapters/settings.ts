// Web stand-in for the desktop's @/services/tauri/settings types used by the
// shared receipt files. Same field names as the desktop records.
export interface BusinessProfile {
  id: number;
  business_name: string;
  trading_name: string | null;
  owner_name: string | null;
  email: string | null;
  phone: string | null;
  tin: string | null;
  registration_number: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  currency: string;
  timezone: string;
  logo_media_ref: string | null;
  cover_media_ref: string | null;
  logo_media_url: string | null;
  cover_media_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceiptSettings {
  id: number;
  business_header: string | null;
  footer_message: string | null;
  show_logo: boolean;
  show_tin: boolean;
  show_cashier_name: boolean;
  show_customer_name: boolean;
  show_payment_method: boolean;
  show_thank_you_note: boolean;
  receipt_width: string;
  print_profile: "thermal-58mm" | "thermal-80mm" | "document-a4";
  copies_per_print: number;
  auto_print_after_sale: boolean;
  created_at: string;
  updated_at: string;
}
