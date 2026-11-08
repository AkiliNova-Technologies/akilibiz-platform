import {
  normalizeReceiptSettingsExample,
  ReceiptPresentation,
  resolveReceiptHeader,
  type ReceiptBusinessProfile,
  type ReceiptPresentationSettings,
} from "@/components/documents/ReceiptPresentation";

export type ReceiptPreviewSettings = ReceiptPresentationSettings;

export function ReceiptSettingsPreview({
  settings,
  businessProfile,
}: {
  settings: ReceiptPreviewSettings;
  businessProfile: ReceiptBusinessProfile | null;
}) {
  const example = normalizeReceiptSettingsExample();
  const address = [businessProfile?.address, businessProfile?.city, businessProfile?.country]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(", ");
  const receipt = {
    ...example,
    business: {
      ...example.business,
      name: resolveReceiptHeader(
        settings.business_header,
        businessProfile,
        example.business.name,
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
          Live receipt preview
        </h3>
        <p className="text-sm text-muted-foreground">
          Example content only. Changes appear here before you save.
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
        Previewing one receipt · {Math.max(1, Number(settings.copies_per_print) || 1)} {Number(settings.copies_per_print) === 1 ? "copy" : "copies"} will print per sale
      </p>
    </section>
  );
}
