"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ReceiptText } from "lucide-react";
import type { TaxSettingsFormData } from "@/components/akilibiz/settings/tax-settings-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

type Props = {
  isDirty: boolean;
  loading: boolean;
  onReset: () => void;
  onSave: () => Promise<void>;
  onSettingsChange: React.Dispatch<React.SetStateAction<TaxSettingsFormData>>;
  settings: TaxSettingsFormData;
};

export function TaxSettingsForm({
  isDirty, loading, onReset, onSettingsChange, settings,
}: Props) {
  const setField = <K extends keyof TaxSettingsFormData>(
    key: K, value: TaxSettingsFormData[K],
  ) => onSettingsChange((previous) => ({ ...previous, [key]: value }));

  return (
    <div className="flex min-w-0 flex-col gap-4 md:gap-6">
      <Card>
        <CardContent className="min-w-0 space-y-6 px-3 sm:px-4 md:px-6">
          <section className="space-y-3">
            <h3 className="text-lg font-semibold">VAT Registration</h3>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-1">
                <Label htmlFor="vat_registered">Registered for VAT</Label>
                <p className="text-xs text-muted-foreground">
                  Turn this on if your business is registered for VAT in Uganda.
                </p>
              </div>
              <Switch
                id="vat_registered"
                checked={settings.vat_registered}
                onCheckedChange={(checked) => setField("vat_registered", checked)}
                aria-label="Registered for VAT"
              />
            </div>
            {settings.vat_registered && (
              <div className="max-w-lg space-y-2">
                <Label htmlFor="vat_registration_number">VAT registration number</Label>
                <Input
                  id="vat_registration_number"
                  value={settings.vat_registration_number}
                  onChange={(event) => setField("vat_registration_number", event.target.value)}
                />
              </div>
            )}
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Tax Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel required htmlFor="default_tax_name">Default tax name</FieldLabel>
                <Input
                  id="default_tax_name"
                  required
                  value={settings.default_tax_name}
                  onChange={(event) => setField("default_tax_name", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax_number">Business TIN</Label>
                <Input
                  id="tax_number"
                  value={settings.tax_number}
                  onChange={(event) => setField("tax_number", event.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Current standard VAT rate</p>
                <p className="text-xs text-muted-foreground">
                  The effective rate comes from your business tax records and is not changed here.
                </p>
              </div>
              <Badge variant="outline">Unavailable</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Review VAT treatment for individual products in Tax Management under Finance.
            </p>
          </section>

          <Separator />

          <section className="space-y-3">
            <h3 className="text-lg font-semibold">Receipt Options</h3>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <Label htmlFor="show_tax_on_receipt">Show tax on receipts</Label>
              <Switch
                id="show_tax_on_receipt"
                checked={settings.show_tax_on_receipt}
                onCheckedChange={(checked) => setField("show_tax_on_receipt", checked)}
                aria-label="Show tax on receipts"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Tax amounts and rounding follow the effective tax records. They cannot be edited here.
            </p>
          </section>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onReset} disabled={loading || !isDirty}>
              Reset changes
            </Button>
            <Button type="button" disabled title="Tax settings saving is not yet connected">
              Save changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <ReceiptText className="size-4" /> Tax Management
            </h3>
            <p className="text-sm text-muted-foreground">
              Review VAT on products and purchases, record customs and URA documents, and check monthly tax records under Finance.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard/finance/tax">
              Open Tax Management <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
