import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { translate, type AppLocale, type TranslationKey } from "@/i18n";
import { selectLocale, setLocale } from "@/redux/slices/localeSlice";

export function useI18n() {
  const dispatch = useAppDispatch();
  const locale = useAppSelector(selectLocale);
  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) =>
      translate(locale, key, values),
    [locale],
  );
  return {
    locale,
    t,
    setLocale: (next: AppLocale) => dispatch(setLocale(next)),
  };
}
