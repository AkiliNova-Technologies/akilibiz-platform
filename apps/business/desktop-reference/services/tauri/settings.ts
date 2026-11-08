import { invoke } from "@tauri-apps/api/core";

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

export interface UpdateBusinessProfilePayload {
  business_name: string;
  trading_name?: string | null;
  owner_name?: string | null;
  email?: string | null;
  phone?: string | null;
  tin?: string | null;
  registration_number?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  currency: string;
  timezone: string;
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

export interface UpdateReceiptSettingsPayload {
  business_header?: string | null;
  footer_message?: string | null;
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
}

export interface TaxConfig {
  id: number;
  default_tax_name: string;
  default_tax_rate: number;
  tax_number: string | null;
  apply_tax_on_sales: boolean;
  apply_tax_on_services: boolean;
  tax_inclusive_pricing: boolean;
  show_tax_on_receipt: boolean;
  tax_rounding_mode: string;
  created_at: string;
  updated_at: string;
}

export interface UpdateTaxConfigPayload {
  default_tax_name: string;
  default_tax_rate: number;
  tax_number?: string | null;
  apply_tax_on_sales: boolean;
  apply_tax_on_services: boolean;
  tax_inclusive_pricing: boolean;
  show_tax_on_receipt: boolean;
  tax_rounding_mode: string;
}

export interface BackupRecord {
  id: number;
  backup_name: string;
  backup_path: string;
  backup_date: string;
  size_bytes: number;
  backup_type: string;
  status: string;
  created_at: string;
  format_version: string;
  integrity_verified_at_utc?: string | null;
}

export interface CreateBackupPayload {
  backup_name?: string | null;
  destination_path: string;
  overwrite?: boolean;
}

export interface BackupVerification {
  file_name: string;
  format_version: string;
  integrity_ok: boolean;
  verified_at_utc: string;
}

export const tauriSettingsService = {
  async getBusinessProfile(): Promise<BusinessProfile> {
    return await invoke<BusinessProfile>("get_business_profile");
  },

  async updateBusinessProfile(
    payload: UpdateBusinessProfilePayload,
  ): Promise<BusinessProfile> {
    return await invoke<BusinessProfile>("update_business_profile", { payload });
  },

  async uploadBusinessProfileMedia(kind: "logo" | "cover", source_path: string): Promise<BusinessProfile> {
    return await invoke<BusinessProfile>("upload_business_profile_media", { payload: { kind, source_path } });
  },

  async removeBusinessProfileMedia(kind: "logo" | "cover"): Promise<BusinessProfile> {
    return await invoke<BusinessProfile>("remove_business_profile_media", { payload: { kind } });
  },

  async getReceiptSettings(): Promise<ReceiptSettings> {
    return await invoke<ReceiptSettings>("get_receipt_settings");
  },

  async updateReceiptSettings(
    payload: UpdateReceiptSettingsPayload,
  ): Promise<ReceiptSettings> {
    return await invoke<ReceiptSettings>("update_receipt_settings", { payload });
  },

  async getTaxConfig(): Promise<TaxConfig> {
    return await invoke<TaxConfig>("get_tax_config");
  },

  async updateTaxConfig(payload: UpdateTaxConfigPayload): Promise<TaxConfig> {
    return await invoke<TaxConfig>("update_tax_config", { payload });
  },

  async getBackupRecords(): Promise<BackupRecord[]> {
    return await invoke<BackupRecord[]>("get_backup_records");
  },

  async createBackup(payload: CreateBackupPayload): Promise<BackupRecord> {
    return await invoke<BackupRecord>("create_backup", { payload });
  },

  async verifyBackup(source_path: string): Promise<BackupVerification> {
    return await invoke<BackupVerification>("verify_backup", {
      payload: { source_path },
    });
  },
  
};
