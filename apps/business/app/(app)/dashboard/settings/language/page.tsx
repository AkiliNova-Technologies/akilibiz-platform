"use client";

import { LanguageSettingsForm } from "@/components/akilibiz/settings/language-settings-form";
import { useBrowserLanguageSettings } from "@/components/akilibiz/settings/language-settings-data";

export default function LanguageSettingsPage() { const language = useBrowserLanguageSettings(); return <main className="flex flex-1 flex-col"><div className="mx-auto w-full max-w-8xl"><LanguageSettingsForm isDirty={language.isDirty} loading={language.loading} locale={language.locale} onReset={language.reset} onSave={language.save} onSelect={language.setLocale} /></div></main>; }
