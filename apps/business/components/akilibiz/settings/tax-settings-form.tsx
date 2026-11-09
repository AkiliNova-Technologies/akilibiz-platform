"use client";

import * as React from "react";
import { toast } from "sonner";

import type { TaxSettingsFormData } from "@/components/akilibiz/settings/tax-settings-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

type ToggleKey = "apply_tax_on_sales" | "apply_tax_on_services" | "tax_inclusive_pricing" | "show_tax_on_receipt";
type Props = { isDirty: boolean; loading: boolean; onReset: () => void; onSave: () => Promise<void>; onSettingsChange: React.Dispatch<React.SetStateAction<TaxSettingsFormData>>; settings: TaxSettingsFormData };

function Toggle({ enabled, label, onToggle }: { enabled: boolean; label: string; onToggle: () => void }) {
  return <button type="button" aria-pressed={enabled} onClick={onToggle} className="flex items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="text-sm font-medium">{label}</span><Badge variant={enabled ? "outline" : "secondary"}>{enabled ? "Enabled" : "Disabled"}</Badge></button>;
}

export function TaxSettingsForm({ isDirty, loading, onReset, onSave, onSettingsChange, settings }: Props) {
  const [error, setError] = React.useState<string | null>(null);
  const update = <K extends keyof TaxSettingsFormData>(key: K, value: TaxSettingsFormData[K]) => { setError(null); onSettingsChange((current) => ({ ...current, [key]: value })); };
  const toggle = (key: ToggleKey) => update(key, !settings[key]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settings.default_tax_name.trim()) { setError("Enter the tax name shown to customers."); return; }
    if (settings.default_tax_rate < 0) { setError("The default tax rate cannot be below 0%."); return; }
    if (settings.vat_registered && !settings.vat_registration_number.trim()) { setError("Enter your VAT registration number."); return; }
    if (!settings.effective_date) { setError("Choose when these tax settings take effect."); return; }
    await onSave(); toast.success("Tax settings saved.");
  };
  return <Card><CardContent className="px-6"><form className="space-y-6" onSubmit={submit}>
    <div><h2 className="text-lg font-semibold">Tax configuration</h2><p className="text-sm text-muted-foreground">Update your tax details and choose where the default tax applies.</p></div>
    {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
    <section className="space-y-3"><h3 className="font-medium">VAT registration</h3><div className="flex items-center justify-between gap-4 rounded-lg border p-3"><div className="space-y-1"><Label htmlFor="vat_registered" className="font-medium">Registered for VAT</Label><p className="text-xs text-muted-foreground">Turn this on if your business is registered for VAT in Uganda.</p></div><Switch id="vat_registered" checked={settings.vat_registered} onCheckedChange={(checked) => update("vat_registered", checked)} /></div></section>
    <section className="space-y-3"><h3 className="font-medium">VAT registration details</h3><div className="grid gap-4 md:grid-cols-2">{settings.vat_registered ? <div className="space-y-2"><FieldLabel required htmlFor="vat_registration_number">VAT registration number</FieldLabel><Input id="vat_registration_number" required value={settings.vat_registration_number} onChange={(event) => update("vat_registration_number", event.target.value)} /></div> : null}<div className="space-y-2"><Label htmlFor="tax_number">Business tax identification number (if different)</Label><Input id="tax_number" value={settings.tax_number} onChange={(event) => update("tax_number", event.target.value)} /></div></div></section>
    <section className="space-y-3"><h3 className="font-medium">Default tax name and rate</h3><div className="grid gap-4 md:grid-cols-3"><div className="space-y-2"><FieldLabel required htmlFor="default_tax_name">Tax name shown to customers</FieldLabel><Input id="default_tax_name" required value={settings.default_tax_name} onChange={(event) => update("default_tax_name", event.target.value)} /></div><div className="space-y-2"><FieldLabel required htmlFor="default_tax_rate">Default tax rate (%)</FieldLabel><Input id="default_tax_rate" required min="0" step="0.01" type="number" value={settings.default_tax_rate} onChange={(event) => update("default_tax_rate", Number(event.target.value || 0))} /></div><div className="space-y-2"><FieldLabel required htmlFor="effective_date">Effective date</FieldLabel><Input id="effective_date" required type="date" value={settings.effective_date} onChange={(event) => update("effective_date", event.target.value)} /></div></div><p className="text-xs text-muted-foreground">This date helps you keep your tax records clear when your rate changes.</p></section>
    <section className="space-y-3"><h3 className="font-medium">Where default tax applies</h3><div className="grid gap-3 sm:grid-cols-2"><Toggle enabled={settings.apply_tax_on_sales} label="Charge the default tax on goods sold" onToggle={() => toggle("apply_tax_on_sales")} /><Toggle enabled={settings.apply_tax_on_services} label="Charge the default tax on services" onToggle={() => toggle("apply_tax_on_services")} /></div></section>
    <section className="space-y-3"><h3 className="font-medium">Prices, receipts, and rounding</h3><div className="grid gap-3 sm:grid-cols-2"><Toggle enabled={settings.tax_inclusive_pricing} label="Prices already include tax" onToggle={() => toggle("tax_inclusive_pricing")} /><Toggle enabled={settings.show_tax_on_receipt} label="Show tax on receipts" onToggle={() => toggle("show_tax_on_receipt")} /></div><div className="max-w-sm space-y-2"><FieldLabel required htmlFor="tax_rounding_mode">Tax rounding</FieldLabel><Select value={settings.tax_rounding_mode} onValueChange={(value) => update("tax_rounding_mode", value as TaxSettingsFormData["tax_rounding_mode"])}><SelectTrigger id="tax_rounding_mode"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nearest">Nearest amount</SelectItem><SelectItem value="up">Round up</SelectItem><SelectItem value="down">Round down</SelectItem></SelectContent></Select></div></section>
    <Separator /><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={loading || !isDirty} onClick={() => { onReset(); setError(null); toast.info("Tax settings reset."); }}>Reset changes</Button><Button type="submit" disabled title="Tax settings saving is not yet connected">{loading ? "Saving tax settings…" : "Save changes"}</Button></div>
  </form></CardContent></Card>;
}
