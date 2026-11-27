// GENERATED from the AkiliBiz Desktop repository (src/components/documents/ReceiptSettingsPreview.tsx). Do not edit here:
// change the desktop file, then run `node apps/business/scripts/sync-desktop-i18n.mjs`.
"use client";

import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
import {
  ReceiptPresentation,
} from "@/components/akilibiz/documents/desktop/ReceiptPresentation";
import {
  normalizeReceiptSettingsExample,
  resolveReceiptHeader,
  type ReceiptBusinessProfile,
  type ReceiptPresentationSettings,
} from "@/components/akilibiz/documents/desktop/receipt-presentation-utils";

export type ReceiptPreviewSettings = ReceiptPresentationSettings;

export function ReceiptSettingsPreview({
  settings,
  businessProfile,
}: {
  settings: ReceiptPreviewSettings;
  businessProfile: ReceiptBusinessProfile | null;
}) {
  const { t } = useI18n();
  const example = normalizeReceiptSettingsExample();
  const address = [businessProfile?.address, businessProfile?.city, businessProfile?.country]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(", ");
  const receipt = {
    ...example,
    lines: example.lines.map((line) => ({ ...line, name: t("receipt.exampleProduct") })),
    business: {
      ...example.business,
      name: resolveReceiptHeader(
        settings.business_header,
        businessProfile,
        t("receipt.exampleBusiness"),
      ),
      address: address || example.business.address,
      phone: businessProfile?.phone || example.business.phone,
      email: businessProfile?.email || example.business.email,
      tin: businessProfile?.tin || example.business.tin,
    },
  };
  return (
    <section aria-labelledby="receipt-live-preview-title" className="space-y-3">
      <div>
        <h3 id="receipt-live-preview-title" className="text-lg font-semibold">
          {t("receiptPreview.live")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("receiptPreview.hint")}
        </p>
      </div>

      <div className="flex min-h-[34rem] justify-center overflow-auto bg-muted/30 p-4 sm:p-6">
        <ReceiptPresentation
          receipt={receipt}
          settings={settings}
          businessProfile={businessProfile}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground" data-testid="copies-annotation">
        {t("receiptPreview.copies", {count: Math.max(1, Number(settings.copies_per_print) || 1), label: Number(settings.copies_per_print) === 1 ? t("receiptPreview.copy") : t("receiptPreview.copiesPlural")})}
      </p>
    </section>
  );
}
