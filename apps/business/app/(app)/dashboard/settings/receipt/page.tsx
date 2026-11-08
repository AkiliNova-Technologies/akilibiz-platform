"use client";

import { ReceiptSettingsForm } from "@/components/akilibiz/settings/receipt-settings-form";
import { useBrowserReceiptSettings } from "@/components/akilibiz/settings/receipt-settings-data";

export default function ReceiptSettingsPage() {
  const receipt = useBrowserReceiptSettings();

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-8xl space-y-6">
        <div className="space-y-1 pt-1">
          <h1 className="text-2xl font-semibold tracking-tight">Receipt Settings</h1>
          <p className="text-sm text-muted-foreground">Configure how receipts are displayed and printed.</p>
        </div>
        <ReceiptSettingsForm
          isDirty={receipt.isDirty}
          loading={receipt.loading}
          onReset={receipt.reset}
          onSave={receipt.save}
          onSettingsChange={receipt.setSettings}
          settings={receipt.settings}
        />
      </div>
    </main>
  );
}
