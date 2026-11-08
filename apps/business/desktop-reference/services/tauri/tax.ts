import { invoke } from "@tauri-apps/api/core";

export interface TaxClassification {
  id: number;
  code: string;
  name: string;
  description: string | null;
  requires_vat_registration: boolean;
  is_active: boolean;
}

export interface TaxRate {
  id: number;
  tax_type: string;
  tax_code: string;
  rate: number;
  jurisdiction: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
}

export interface TaxSettings {
  id: number;
  jurisdiction: string;
  vat_registered: boolean;
  vat_registration_number: string | null;
  default_tax_classification_id: number | null;
  tax_inclusive_pricing: boolean;
  tax_rounding_mode: string;
}

export interface UpdateTaxSettingsPayload {
  vat_registered: boolean;
  vat_registration_number?: string | null;
  default_tax_classification_id?: number | null;
  tax_inclusive_pricing: boolean;
  tax_rounding_mode: string;
}

export interface CalculateTaxPayload {
  unit_price_ugx: number;
  tax_classification: string;
  tax_inclusive: boolean;
  quantity_milli: number;
  discount_ugx: number;
}

export interface TaxComponent {
  tax_type: string;
  tax_code: string;
  rate_basis_points: number;
  taxable_amount_ugx: number;
  tax_amount_ugx: number;
}

export interface TaxCalculationResult {
  subtotal_ugx: number;
  discount_amount_ugx: number;
  taxable_amount_ugx: number;
  tax_amount_ugx: number;
  total_amount_ugx: number;
  taxes: TaxComponent[];
}

export const tauriTaxService = {
  async getTaxClassifications(): Promise<TaxClassification[]> {
    return await invoke<TaxClassification[]>("get_tax_classifications");
  },

  async getTaxRates(): Promise<TaxRate[]> {
    return await invoke<TaxRate[]>("get_tax_rates");
  },

  async getTaxSettings(): Promise<TaxSettings> {
    return await invoke<TaxSettings>("get_tax_settings");
  },

  async updateTaxSettings(payload: UpdateTaxSettingsPayload): Promise<TaxSettings> {
    return await invoke<TaxSettings>("update_tax_settings", { payload });
  },

  async calculateTax(payload: CalculateTaxPayload): Promise<TaxCalculationResult> {
    return await invoke<TaxCalculationResult>("calculate_tax", { payload });
  },
};
