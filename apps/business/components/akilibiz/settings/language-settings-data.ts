"use client";

import { useCallback, useMemo, useState } from "react";

export const defaultLocale = "en-UG" as const;
export type SupportedLocale = typeof defaultLocale;

export function useBrowserLanguageSettings() {
  const [locale, setLocale] = useState<SupportedLocale>(defaultLocale);
  const [savedLocale, setSavedLocale] = useState<SupportedLocale>(defaultLocale);
  const [loading, setLoading] = useState(false);
  const isDirty = useMemo(() => locale !== savedLocale, [locale, savedLocale]);
  const save = useCallback(async () => { setLoading(true); try { await Promise.resolve(); setSavedLocale(locale); } finally { setLoading(false); } }, [locale]);
  const reset = useCallback(() => setLocale(savedLocale), [savedLocale]);
  return { isDirty, loading, locale, reset, save, setLocale };
}
