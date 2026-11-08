import { enUG, type TranslationKey } from "@/i18n/en-UG";
export type { TranslationKey } from "@/i18n/en-UG";

export const DEFAULT_LOCALE = "en-UG" as const;
export type AppLocale = typeof DEFAULT_LOCALE;
type Values = Record<string, string | number>;

const resources: Record<AppLocale, Record<TranslationKey, string>> = {
  "en-UG": enUG,
};

export function translate(locale: string | undefined, key: TranslationKey, values?: Values): string {
  const template = resources[locale as AppLocale]?.[key] ?? resources[DEFAULT_LOCALE][key] ?? key;
  return template.replace(/{{(\w+)}}/g, (_, name: string) => String(values?.[name] ?? `{{${name}}}`));
}

export function formatCurrency(value: number, currency = "UGX", locale: AppLocale = DEFAULT_LOCALE) {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

export function formatDate(value: Date | string | number, locale: AppLocale = DEFAULT_LOCALE) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}
