"use client";

import { useCallback, useMemo, useState } from "react";

export type SettingsCategory = "Business" | "Receipt" | "Tax" | "Backup";
export type SettingStatus = "Configured" | "Needs Review" | "Not Set" | "Unavailable";

export interface SettingsOverviewItem {
  category: SettingsCategory;
  href: string;
  id: number;
  label: string;
  status: SettingStatus;
  summary: string;
  updatedAt: string | null;
}

export interface SettingsOverviewSummary {
  categories: number;
  configured: number;
  needsReview: number;
  notSet: number;
}

const initialSettings: SettingsOverviewItem[] = [
  {
    category: "Business",
    href: "/dashboard/settings/business",
    id: 1,
    label: "Business Profile",
    status: "Unavailable",
    summary: "Business identity and contact details not fully configured",
    updatedAt: null,
  },
  {
    category: "Receipt",
    href: "/dashboard/settings/receipt",
    id: 2,
    label: "Receipt Settings",
    status: "Unavailable",
    summary: "Uses Business Profile header",
    updatedAt: null,
  },
  {
    category: "Tax",
    href: "/dashboard/settings/tax",
    id: 3,
    label: "Tax Configuration",
    status: "Unavailable",
    summary: "Tax rules are not fully configured",
    updatedAt: null,
  },
  {
    category: "Backup",
    href: "/dashboard/settings/backup",
    id: 4,
    label: "Backup & Restore",
    status: "Unavailable",
    summary: "No backups created yet",
    updatedAt: null,
  },
];

export function useSettingsOverviewData() {
  const [settings, setSettings] =
    useState<SettingsOverviewItem[]>(initialSettings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summary = useMemo<SettingsOverviewSummary | null>(
    () => settings.some((setting) => setting.status === "Unavailable") ? null : ({
      categories: new Set(settings.map((setting) => setting.category)).size,
      configured: settings.filter((setting) => setting.status === "Configured")
        .length,
      needsReview: settings.filter(
        (setting) => setting.status === "Needs Review",
      ).length,
      notSet: settings.filter((setting) => setting.status === "Not Set").length,
    }),
    [settings],
  );
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSettings(initialSettings);
    } catch {
      setError("Settings overview could not be loaded. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);
  return { error, loadSettings, loading, settings, summary };
}
