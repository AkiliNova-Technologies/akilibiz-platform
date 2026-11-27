"use client";

import { SettingsSnapshotPlaceholder } from "@/components/akilibiz/settings/settings-snapshot-placeholder";
import { SettingsSnapshotStatus } from "@/components/akilibiz/settings/settings-snapshot-status";
import { ReceiptSettingsForm } from "@/components/akilibiz/settings/receipt-settings-form";
import { useBrowserReceiptSettings } from "@/components/akilibiz/settings/receipt-settings-data";

import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
export default function ReceiptSettingsPage() {
  const { t } = useI18n();
  const receipt = useBrowserReceiptSettings();

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-8xl space-y-6">
        <div className="space-y-1 pt-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t("nav.receiptSettings")}</h1>
          <p className="text-sm text-muted-foreground">{t("receiptSettings.description")}</p>
        </div>
        <SettingsSnapshotStatus state={receipt.snapshotState} lastSync={receipt.snapshotDate} onRetry={receipt.retry} />
        {receipt.snapshotState === "ready" ? (
          <ReceiptSettingsForm
            isDirty={receipt.isDirty}
            loading={receipt.loading}
            onReset={receipt.reset}
            onSave={receipt.save}
            onSettingsChange={receipt.setSettings}
            settings={receipt.settings}
          />
        ) : (
          <SettingsSnapshotPlaceholder kind="receipt" state={receipt.snapshotState} />
        )}
      </div>
    </main>
  );
}
