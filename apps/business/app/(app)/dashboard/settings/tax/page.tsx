"use client";

import { TaxSettingsForm } from "@/components/akilibiz/settings/tax-settings-form";
import { useBrowserTaxSettings } from "@/components/akilibiz/settings/tax-settings-data";

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
        <div role="status" className="text-sm text-muted-foreground">
          {tax.snapshotState === "loading" ? "Loading desktop settings…" :
            tax.snapshotState === "error" ? "Could not load the desktop settings. Check the connection and your account access." :
            tax.snapshotState === "unavailable" ? "No verified desktop settings snapshot is available for this business." :
            "Read-only settings synchronized from desktop. Changes must be made in the desktop app."}
          {tax.snapshotState === "ready" && tax.snapshotDate ? (
            <span className="ml-1">Last synchronized: {new Date(tax.snapshotDate).toLocaleString("en-UG", { timeZone: "Africa/Kampala" })}</span>
          ) : null}
        </div>
        {tax.snapshotState === "ready" ? (
        <TaxSettingsForm
          isDirty={tax.isDirty}
          loading={tax.loading}
          onReset={tax.reset}
          onSave={tax.save}
          onSettingsChange={tax.setSettings}
          settings={tax.settings}
        />
        ) : null}
      </div>
    </main>
  );
}
