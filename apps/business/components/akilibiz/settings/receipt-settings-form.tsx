"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  printProfiles,
  type ReceiptSettingsFormData,
} from "@/components/akilibiz/settings/receipt-settings-data";
import { ReceiptSettingsPreview } from "@/components/akilibiz/documents/desktop/ReceiptSettingsPreview";
import type { TranslationKey } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
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

const toggles: Array<[ReceiptToggleKey, TranslationKey]> = [
  ["show_logo", "receiptSettings.showLogo"], ["show_tin", "receiptSettings.showTin"],
  ["show_cashier_name", "receiptSettings.showCashier"], ["show_customer_name", "receiptSettings.showCustomer"],
  ["show_payment_method", "receiptSettings.showPayment"], ["show_thank_you_note", "receiptSettings.showThanks"],
  ["auto_print_after_sale", "receiptSettings.autoPrint"],
];

export function ReceiptSettingsForm({ isDirty, loading, onReset, onSave, onSettingsChange, settings }: Props) {
  const { t } = useI18n();
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
  // Same layout as the desktop SettingsReceiptPage. WEB: saving receipt
  // settings is not connected yet, so the fields stay read-only.
  return (
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
      <Card>
        <CardContent className="min-w-0 px-3 sm:px-4 md:px-6">
          <form className="space-y-6" onSubmit={submit}><fieldset disabled className="min-w-0 space-y-6">
            <div>
              <h3 className="text-lg font-semibold">{t("receiptSettings.details")}</h3>
              <p className="text-sm text-muted-foreground">{t("receiptSettings.detailsDescription")}</p>
            </div>
            {error ? <div className="text-sm text-red-600" role="alert">{error}</div> : null}
            <div className="grid gap-4 py-2 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2"><FieldLabel htmlFor="business_header">{t("receiptSettings.businessHeader")}</FieldLabel><Input id="business_header" value={settings.business_header} onChange={(event) => update("business_header", event.target.value)} /></div>
              <div className="space-y-2"><FieldLabel required htmlFor="print_profile">{t("receiptSettings.printFormat")}</FieldLabel><Select value={settings.print_profile} onValueChange={(value) => { const profile = printProfiles[value as keyof typeof printProfiles]; update("print_profile", profile.id); update("receipt_width", profile.paper); }}><SelectTrigger id="print_profile" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.values(printProfiles).map((profile) => <SelectItem key={profile.id} value={profile.id}>{profile.label} — {profile.intendedUse}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><FieldLabel required htmlFor="copies_per_print">{t("receiptSettings.copies")}</FieldLabel><Input id="copies_per_print" required type="number" min="1" value={settings.copies_per_print} onChange={(event) => update("copies_per_print", Number(event.target.value || 1))} /></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor="footer_message">{t("receiptSettings.footer")}</Label><Textarea id="footer_message" rows={4} value={settings.footer_message} onChange={(event) => update("footer_message", event.target.value)} /></div>
              <div className="grid gap-3 md:col-span-2 sm:grid-cols-2">{toggles.map(([key, label]) => <button key={key} type="button" aria-pressed={settings[key]} onClick={() => update(key, !settings[key])} className="flex items-center justify-between rounded-lg border p-3 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="text-sm font-medium">{t(label)}</span><Badge variant={settings[key] ? "outline" : "secondary"}>{settings[key] ? t("receiptSettings.enabled") : t("receiptSettings.disabled")}</Badge></button>)}</div>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => { onReset(); setError(null); }} disabled={!isDirty}>{t("receiptSettings.reset")}</Button><Button type="submit" disabled title="Receipt settings saving is not yet connected">{loading ? t("common.saving") : t("receiptSettings.save")}</Button></div>
          </fieldset></form>
        </CardContent>
      </Card>
      <Card className="min-w-0 xl:sticky xl:top-6"><CardContent className="px-4 sm:px-6"><ReceiptSettingsPreview settings={settings} businessProfile={null} /></CardContent></Card>
    </div>
  );
}
