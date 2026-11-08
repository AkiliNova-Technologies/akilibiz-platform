import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { DEFAULT_LOCALE, type AppLocale } from "@/i18n";

interface LocaleState { locale: AppLocale }
const initialState: LocaleState = { locale: DEFAULT_LOCALE };
const localeSlice = createSlice({
  name: "locale",
  initialState,
  reducers: { setLocale: (state, action: PayloadAction<AppLocale>) => { state.locale = action.payload; } },
});
export const { setLocale } = localeSlice.actions;
export const selectLocale = (state: { locale: LocaleState }) => state.locale.locale;
export default localeSlice.reducer;
