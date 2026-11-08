"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  printProfiles,
  type ReceiptSettingsFormData,
} from "@/components/akilibiz/settings/receipt-settings-data";
import { ReceiptSettingsPreview } from "@/components/akilibiz/settings/receipt-settings-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  isDirty: boolean;
  loading: boolean;
  onReset: () => void;
  onSave: () => Promise<void>;
  onSettingsChange: React.Dispatch<React.SetStateAction<ReceiptSettingsFormData>>;
  settings: ReceiptSettingsFormData;
};

type ReceiptToggleKey =
  | "show_logo"
  | "show_tin"
  | "show_cashier_name"
  | "show_customer_name"
  | "show_payment_method"
  | "show_thank_you_note"
  | "auto_print_after_sale";

const toggles: Array<[ReceiptToggleKey, string]> = [
  ["show_logo", "Show Logo"], ["show_tin", "Show TIN"],
  ["show_cashier_name", "Show Cashier Name"], ["show_customer_name", "Show Customer Name"],
  ["show_payment_method", "Show Payment Method"], ["show_thank_you_note", "Show Thank You Note"],
  ["auto_print_after_sale", "Auto Print After Sale"],
];

export function ReceiptSettingsForm({ isDirty, loading, onReset, onSave, onSettingsChange, settings }: Props) {
  const [error, setError] = React.useState<string | null>(null);
  const enabledOptions = toggles.filter(([key]) => settings[key]).length;
  const update = <K extends keyof ReceiptSettingsFormData>(key: K, value: ReceiptSettingsFormData[K]) => {
    setError(null);
    onSettingsChange((current) => ({ ...current, [key]: value }));
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (settings.copies_per_print < 1) { setError("Copies per print must be at least 1."); return; }
    await onSave();
    toast.success("Receipt settings updated successfully");
  };
  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[ ["Receipt Width", settings.receipt_width, "Configured print paper width"], ["Copies Per Print", String(settings.copies_per_print), "Number of copies per transaction"], ["Enabled Options", String(enabledOptions), "Receipt features enabled"], ["Header", settings.business_header || "Not Set", "Receipt title"] ].map(([title, value, description]) => <Card key={title}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{title}</p><p className="mt-1 truncate text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></CardContent></Card>)}
      </section>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
        <Card><CardContent className="px-6"><form className="space-y-6" onSubmit={submit}>
          <div><h2 className="text-lg font-semibold">Receipt Configuration</h2><p className="text-sm text-muted-foreground">Control receipt content, printing behavior, and display options. The preview updates before settings are saved.</p></div>
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2"><FieldLabel htmlFor="business_header">Business Header</FieldLabel><Input id="business_header" value={settings.business_header} onChange={(event) => update("business_header", event.target.value)} /></div>
            <div className="space-y-2"><FieldLabel required htmlFor="print_profile">Print Format</FieldLabel><Select value={settings.print_profile} onValueChange={(value) => { const profile = printProfiles[value as keyof typeof printProfiles]; update("print_profile", profile.id); update("receipt_width", profile.paper); }}><SelectTrigger id="print_profile" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.values(printProfiles).map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.label} — {profile.intendedUse}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><FieldLabel required htmlFor="copies_per_print">Copies Per Print</FieldLabel><Input id="copies_per_print" min="1" required type="number" value={settings.copies_per_print} onChange={(event) => update("copies_per_print", Number(event.target.value || 1))} /></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="footer_message">Footer Message</Label><Textarea id="footer_message" rows={4} value={settings.footer_message} onChange={(event) => update("footer_message", event.target.value)} /></div>
            <div className="grid gap-3 md:col-span-2 sm:grid-cols-2">{toggles.map(([key, label]) => <button key={key} type="button" aria-pressed={settings[key]} onClick={() => update(key, !settings[key])} className="flex items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="text-sm font-medium">{label}</span><Badge variant={settings[key] ? "outline" : "secondary"}>{settings[key] ? "Enabled" : "Disabled"}</Badge></button>)}</div>
          </div>
          <Separator /><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => { onReset(); setError(null); toast.info("Receipt settings reset"); }} disabled={!isDirty}>Reset changes</Button><Button type="submit" disabled={loading || !isDirty}>{loading ? "Saving..." : "Save Changes"}</Button></div>
        </form></CardContent></Card>
        <Card className="xl:sticky xl:top-6"><CardContent className="px-4 sm:px-6"><ReceiptSettingsPreview settings={settings} /></CardContent></Card>
      </div>
    </>
  );
}
