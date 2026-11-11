"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { loadFinancialMirror } from "@/components/akilibiz/finance/financial-mirror-client";
import { parseTaxSettings } from "./hosted-settings-contract";

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
  const [savedSettings, setSavedSettings] = useState<TaxSettingsFormData>(defaultTaxSettings);
  const [snapshotState, setSnapshotState] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [snapshotDate, setSnapshotDate] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const retry = useCallback(() => { setSnapshotState("loading"); setReloadKey((value) => value + 1); }, []);
  useEffect(() => {
    let active = true;
    void Promise.all([
      loadFinancialMirror("tax_settings", { pageSize: 2 }),
      loadFinancialMirror("tax_configurations", { pageSize: 2 }),
    ]).then(([settingsMirror, configMirror]) => {
      if (!active) return;
      if (settingsMirror.total !== 1 || settingsMirror.rows.length !== 1 ||
          configMirror.total !== 1 || configMirror.rows.length !== 1) {
        setSnapshotState("unavailable"); return;
      }
      const parsed = parseTaxSettings(settingsMirror.rows[0].record, configMirror.rows[0].record);
      if (!parsed) { setSnapshotState("unavailable"); return; }
      setSettings(parsed);
      setSavedSettings(parsed);
      setSnapshotDate([settingsMirror.lastSuccessfulSync, configMirror.lastSuccessfulSync]
        .filter((date): date is string => Boolean(date)).sort()[0] ?? null);
      setSnapshotState("ready");
    }).catch(() => { if (active) setSnapshotState("error"); });
    return () => { active = false; };
  }, [reloadKey]);
  const isDirty = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [settings, savedSettings],
  );
  const save = useCallback(async (): Promise<never> => {
    throw new Error("Tax settings cannot be saved until business tax preferences are connected.");
  }, []);
  const reset = useCallback(() => setSettings(savedSettings), [savedSettings]);
  return { isDirty, loading: false, reset, save, setSettings, settings, snapshotState, snapshotDate, retry };
}
