// GENERATED from the AkiliBiz Desktop repository (src/i18n). Do not edit here:
// change the desktop dictionary, then run `node scripts/sync-desktop-i18n.mjs`.
import { enUG, type TranslationKey } from "./en-UG";
import { lgUG } from "./lg-UG";
import { swUG } from "./sw-UG";
export type { TranslationKey } from "./en-UG";

export const DEFAULT_LOCALE = "en-UG" as const;
export const SUPPORTED_LOCALES = ["en-UG", "lg-UG", "sw-UG"] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];
type Values = Record<string, string | number>;

const resources: Record<AppLocale, Partial<Record<TranslationKey, string>>> = {
  "en-UG": enUG,
  "lg-UG": lgUG,
  "sw-UG": swUG,
};

export function isAppLocale(value: string): value is AppLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function translate(locale: string | undefined, key: TranslationKey, values?: Values): string {
  const selected = locale && isAppLocale(locale) ? locale : DEFAULT_LOCALE;
  const template = resources[selected][key] ?? enUG[key] ?? key;
  return template.replace(/{{(\w+)}}/g, (_, name: string) => String(values?.[name] ?? `{{${name}}}`));
}

// Locale changes affect presentation only. Transaction amounts, date filters and API
// values must never be derived from localized strings.
export function formatCurrency(value: number, currency = "UGX", locale: AppLocale = DEFAULT_LOCALE) {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value: Date | string | number, locale: AppLocale = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

export function getTranslationCoverage(locale: AppLocale): { translated: number; total: number; missing: TranslationKey[] } {
  const keys = Object.keys(enUG) as TranslationKey[];
  const missing = keys.filter(key => !resources[locale][key]);
  return { translated: keys.length - missing.length, total: keys.length, missing };
}
