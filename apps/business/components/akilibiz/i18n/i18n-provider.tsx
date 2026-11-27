"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { translate, type AppLocale, type TranslationKey } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/i18n/locale-cookie";
import { isWebOnlyKey, webOnlyLabels, type AppLabelKey } from "@/lib/i18n/web-only";

type I18nValue = {
  locale: AppLocale;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  /** Desktop keys plus the few web-only states (lib/i18n/web-only.ts). */
  tw: (key: AppLabelKey, values?: Record<string, string | number>) => string;
  setLocale: (next: AppLocale) => void;
};

const I18nContext = React.createContext<I18nValue | null>(null);

/** Web counterpart of the desktop locale store: one locale for every screen. */
export function I18nProvider({ initialLocale, children }: { initialLocale: AppLocale; children: React.ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = React.useState<AppLocale>(initialLocale);
  const setLocale = React.useCallback((next: AppLocale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    setLocaleState(next);
    // Server-rendered screens read the cookie; refresh them in the new language.
    router.refresh();
  }, [router]);
  const value = React.useMemo<I18nValue>(() => ({
    locale,
    t: (key, values) => translate(locale, key, values),
    tw: (key, values) => (isWebOnlyKey(key) ? webOnlyLabels[key] : translate(locale, key, values)),
    setLocale,
  }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Same shape as the desktop `useI18n()` hook: `{ locale, t, setLocale }`. */
export function useI18n(): I18nValue {
  const value = React.useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
