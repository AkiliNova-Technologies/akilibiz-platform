"use client";

import { useCallback, useMemo, useState } from "react";

export const printProfileIds = [
  "thermal-58mm",
  "thermal-80mm",
  "document-a4",
] as const;

export type PrintProfileId = (typeof printProfileIds)[number];

export type ReceiptSettingsFormData = {
  business_header: string;
  footer_message: string;
  show_logo: boolean;
  show_tin: boolean;
  show_cashier_name: boolean;
  show_customer_name: boolean;
  show_payment_method: boolean;
  show_thank_you_note: boolean;
  receipt_width: string;
  print_profile: PrintProfileId;
  copies_per_print: number;
  auto_print_after_sale: boolean;
};

export type PrintProfile = {
  id: PrintProfileId;
  label: string;
  paper: string;
  intendedUse: string;
};

export const printProfiles: Record<PrintProfileId, PrintProfile> = {
  "thermal-58mm": {
    id: "thermal-58mm",
    label: "Thermal 58 mm",
    paper: "58mm",
    intendedUse: "Narrow thermal rolls",
  },
  "thermal-80mm": {
    id: "thermal-80mm",
    label: "Thermal 80 mm",
    paper: "80mm",
    intendedUse: "Standard thermal rolls",
  },
  "document-a4": {
    id: "document-a4",
    label: "Document A4",
    paper: "A4",
    intendedUse: "Full-page customer document",
  },
};

export const defaultReceiptSettings: ReceiptSettingsFormData = {
  business_header: "",
  footer_message: "",
  show_logo: false,
  show_tin: true,
  show_cashier_name: true,
  show_customer_name: true,
  show_payment_method: true,
  show_thank_you_note: true,
  receipt_width: "80mm",
  print_profile: "thermal-80mm",
  copies_per_print: 1,
  auto_print_after_sale: false,
};

export function useBrowserReceiptSettings() {
  const [settings, setSettings] = useState<ReceiptSettingsFormData>(
    defaultReceiptSettings,
  );
  const [savedSettings, setSavedSettings] = useState<ReceiptSettingsFormData>(
    defaultReceiptSettings,
  );
  const [loading, setLoading] = useState(false);

  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [savedSettings, settings],
  );
  const save = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.resolve();
      setSavedSettings(settings);
    } finally {
      setLoading(false);
    }
  }, [settings]);
  const reset = useCallback(() => setSettings(savedSettings), [savedSettings]);

  return { isDirty, loading, reset, save, setSettings, settings };
}
