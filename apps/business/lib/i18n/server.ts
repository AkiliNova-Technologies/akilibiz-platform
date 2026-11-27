import "server-only";
import { cookies } from "next/headers";
import { translate, type AppLocale, type TranslationKey } from "./index";
import { LOCALE_COOKIE, localeFromCookie } from "./locale-cookie";

/** Server components: the same translator and locale as the client `useI18n()`. */
export async function getI18n(): Promise<{
  locale: AppLocale;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
}> {
  const locale = localeFromCookie((await cookies()).get(LOCALE_COOKIE)?.value);
  return { locale, t: (key, values) => translate(locale, key, values) };
}
