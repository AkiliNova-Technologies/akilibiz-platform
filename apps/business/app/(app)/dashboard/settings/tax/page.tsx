"use client";

import { SettingsSnapshotPlaceholder } from "@/components/akilibiz/settings/settings-snapshot-placeholder";
import { TaxSettingsForm } from "@/components/akilibiz/settings/tax-settings-form";
import { useBrowserTaxSettings } from "@/components/akilibiz/settings/tax-settings-data";
import { Button } from "@/components/ui/button";

export default function TaxSettingsPage() {
  const tax = useBrowserTaxSettings();
  return (
    <main className="flex min-w-0 flex-1 flex-col">
      <div className="flex min-w-0 flex-col gap-4 md:gap-6">
        <div className="space-y-2 pt-1">
          <h1 className="text-xl font-semibold sm:text-2xl">Tax Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Manage VAT registration details and how tax appears on receipts.
          </p>
          <p className="text-sm text-muted-foreground">
            Tax details are based on your business records. Confirm your registration and VAT treatment with URA.
          </p>
        </div>
        {tax.snapshotState === "error" && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
          <span>VAT settings could not be loaded.</span>
          <Button variant="outline" size="sm" onClick={tax.retry}>Try again</Button>
        </div>}
        {tax.snapshotState === "loading" && <p role="status" className="text-sm text-muted-foreground">Loading VAT settings…</p>}
        {tax.snapshotState === "ready" ? (
          <TaxSettingsForm
            isDirty={tax.isDirty}
            loading={tax.loading}
            onReset={tax.reset}
            onSave={tax.save}
            onSettingsChange={tax.setSettings}
            settings={tax.settings}
          />
        ) : (
          <SettingsSnapshotPlaceholder kind="tax" state={tax.snapshotState} />
        )}
      </div>
    </main>
  );
}
