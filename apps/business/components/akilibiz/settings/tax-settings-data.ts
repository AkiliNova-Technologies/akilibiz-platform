"use client";

import { useCallback, useMemo, useState } from "react";

// Matches the five preferences shown in the authoritative desktop Tax Configuration page.
export type TaxSettingsFormData = {
  vat_registered: boolean;
  vat_registration_number: string;
  default_tax_name: string;
  tax_number: string;
  show_tax_on_receipt: boolean;
};

export const defaultTaxSettings: TaxSettingsFormData = {
  vat_registered: false,
  vat_registration_number: "",
  default_tax_name: "VAT",
  tax_number: "",
  show_tax_on_receipt: true,
};

export function useBrowserTaxSettings() {
  // Hosted tax preference persistence and effective VAT rates are not yet connected.
  const [settings, setSettings] = useState<TaxSettingsFormData>(defaultTaxSettings);
  const [savedSettings] = useState<TaxSettingsFormData>(defaultTaxSettings);
  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings],
  );
  const save = useCallback(async (): Promise<never> => {
    throw new Error("Tax settings cannot be saved until business tax preferences are connected.");
  }, []);
  const reset = useCallback(() => setSettings(savedSettings), [savedSettings]);
  return { isDirty, loading: false, reset, save, setSettings, settings };
}
