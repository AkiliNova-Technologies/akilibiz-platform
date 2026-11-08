"use client";

import { useCallback, useMemo, useState } from "react";

export type TaxSettingsFormData = {
  vat_registered: boolean;
  vat_registration_number: string;
  tax_number: string;
  default_tax_name: string;
  default_tax_rate: number;
  effective_date: string;
  apply_tax_on_sales: boolean;
  apply_tax_on_services: boolean;
  tax_inclusive_pricing: boolean;
  show_tax_on_receipt: boolean;
  tax_rounding_mode: "nearest" | "up" | "down";
};

export const defaultTaxSettings: TaxSettingsFormData = {
  vat_registered: false,
  vat_registration_number: "",
  tax_number: "",
  default_tax_name: "VAT",
  default_tax_rate: 0,
  effective_date: "",
  apply_tax_on_sales: true,
  apply_tax_on_services: true,
  tax_inclusive_pricing: false,
  show_tax_on_receipt: true,
  tax_rounding_mode: "nearest",
};

export function useBrowserTaxSettings() {
  const [settings, setSettings] = useState(defaultTaxSettings);
  const [savedSettings, setSavedSettings] = useState(defaultTaxSettings);
  const [loading, setLoading] = useState(false);
  const isDirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(savedSettings), [savedSettings, settings]);
  const save = useCallback(async () => { setLoading(true); try { await Promise.resolve(); setSavedSettings(settings); } finally { setLoading(false); } }, [settings]);
  const reset = useCallback(() => setSettings(savedSettings), [savedSettings]);
  return { isDirty, loading, reset, save, setSettings, settings };
}
