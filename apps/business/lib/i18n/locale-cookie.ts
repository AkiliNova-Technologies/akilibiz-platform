import { DEFAULT_LOCALE, isAppLocale, type AppLocale } from "./index";

/** Per-device language choice, readable by server and client components. */
export const LOCALE_COOKIE = "akilibiz-locale";

export function localeFromCookie(value: string | undefined | null): AppLocale {
  return value && isAppLocale(value) ? value : DEFAULT_LOCALE;
}
