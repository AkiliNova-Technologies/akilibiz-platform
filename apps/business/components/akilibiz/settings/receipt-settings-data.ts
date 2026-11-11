"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadFinancialMirror } from "@/components/akilibiz/finance/financial-mirror-client";
import { parseReceiptSettings } from "./hosted-settings-contract";

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
  const [snapshotState, setSnapshotState] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [snapshotDate, setSnapshotDate] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => { setSnapshotState("loading"); setReloadKey((value) => value + 1); }, []);
  useEffect(() => {
    let active = true;
    void loadFinancialMirror("receipt_settings", { pageSize: 2 }).then((result) => {
      if (!active) return;
      if (result.total !== 1 || result.rows.length !== 1) { setSnapshotState("unavailable"); return; }
      const parsed = parseReceiptSettings(result.rows[0].record);
      if (!parsed) { setSnapshotState("unavailable"); return; }
      setSettings(parsed);
      setSavedSettings(parsed);
      setSnapshotDate(result.lastSuccessfulSync);
      setSnapshotState("ready");
    }).catch(() => { if (active) setSnapshotState("error"); });
    return () => { active = false; };
  }, [reloadKey]);

  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [savedSettings, settings],
  );
  const save = useCallback(async (): Promise<never> => { throw new Error("Receipt settings cannot be saved until business settings persistence is connected."); }, []);
  const reset = useCallback(() => setSettings(savedSettings), [savedSettings]);

  return { isDirty, loading, reset, save, setSettings, settings, snapshotState, snapshotDate, retry };
}
