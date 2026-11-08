"use client";

import { TaxSettingsForm } from "@/components/akilibiz/settings/tax-settings-form";
import { useBrowserTaxSettings } from "@/components/akilibiz/settings/tax-settings-data";

export default function TaxSettingsPage() {
  const tax = useBrowserTaxSettings();
  return <main className="flex flex-1 flex-col"><div className="mx-auto w-full max-w-8xl space-y-6"><div className="space-y-1 pt-1"><h1 className="text-2xl font-semibold tracking-tight">Tax Settings</h1><p className="max-w-2xl text-sm text-muted-foreground">Choose how your business records and shows tax on sales and services.</p></div><TaxSettingsForm isDirty={tax.isDirty} loading={tax.loading} onReset={tax.reset} onSave={tax.save} onSettingsChange={tax.setSettings} settings={tax.settings} /></div></main>;
}
