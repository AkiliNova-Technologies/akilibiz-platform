// GENERATED from the AkiliBiz Desktop repository (src/components/documents/SalePrintPreviewDialog.tsx). Do not edit here:
// change the desktop file, then run `node apps/business/scripts/sync-desktop-i18n.mjs`.
"use client";

import { useEffect, useState } from "react";
import { IconPrinter, IconReceipt, IconRefresh } from "@tabler/icons-react";
import { toast } from "sonner";
import { ReceiptPresentation } from "@/components/akilibiz/documents/desktop/ReceiptPresentation";
import { defaultReceiptPresentationSettings } from "@/components/akilibiz/documents/desktop/receipt-presentation-utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReduxSettings } from "@/components/akilibiz/documents/desktop-adapters/use-redux-settings";
import { tauriDocumentsService } from "@/components/akilibiz/documents/desktop-adapters/documents";
import {
  buildReceiptPrintHtml,
  printReceiptDocument,
} from "@/lib/desktop-shared/receipt-print-service";
import type {
  CanonicalReceipt,
  ReceiptPresentationContext,
} from "@/lib/desktop-shared/receipt-types";
import {
  printProfiles,
  type PrintProfileId,
} from "@/lib/desktop-shared/receipt-print-profiles";
import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";

function receiptLoadMessage(cause: unknown, saleId: number): string {
  const message = cause instanceof Error ? cause.message :
    typeof cause === "string" ? cause : "";
  if (/Missing permission: pos\.view_sales|Permission denied|Unauthorized/i.test(message)) {
    return "Your account is not allowed to view sales receipts. Ask an administrator to check your View Sales permission.";
  }
  if (/Sale not found/i.test(message)) {
    return `Sale #${saleId} could not be found in the selected business.`;
  }
  if (/Receipt unavailable because|Receipt tax exceeds|Receipt amounts exceed/i.test(message)) {
    // Show an actionable domain validation issue, not a raw SQL/database error.
    return message.replace(/^(?:Validation error:\s*)/i, "");
  }
  return "The receipt could not be loaded. The sale may still be recorded; check Sales History before attempting another sale.";
}

/** One receipt boundary for POS originals and Sales History reprints. */
export function SalePrintPreviewDialog({
  saleId,
  open,
  onOpenChange,
  context = { mode: "original" },
}: {
  saleId: number | null;
  open: boolean;
  onOpenChange(v: boolean): void;
  context?: ReceiptPresentationContext;
}) {
  const { t } = useI18n();
  const {
    businessProfile,
    receiptSettings,
    getBusinessProfile,
    getReceiptSettings,
  } = useReduxSettings();
  const [receipt, setReceipt] = useState<CanonicalReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [profileOverride, setProfileOverride] = useState<PrintProfileId | null>(
    null,
  );
  useEffect(() => {
    if (!open || saleId === null) {
      setLoadError(null);
      setReceipt(null);
      setConfirm(false);
      setShowAllItems(false);
      setLoading(false);
      return;
    }
    let current = true;
    setReceipt(null);
    setShowAllItems(false);
    setLoadError(null);
    setConfirm(false);
    setLoading(true);
    void Promise.allSettled([getBusinessProfile(), getReceiptSettings()]);
    void tauriDocumentsService
      .getCanonicalReceipt(saleId)
      .then((value) => {
        if (current) setReceipt(value);
      })
      .catch((cause: unknown) => {
        if (current) {
          setLoadError(receiptLoadMessage(cause, saleId));
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [getBusinessProfile, getReceiptSettings, open, saleId, retryCount]);
  const print = async () => {
    if (!receipt || printing) return;
    try {
      setPrinting(true);
      const settings = {
        ...(receiptSettings ?? defaultReceiptPresentationSettings),
        ...(profileOverride ? { print_profile: profileOverride } : {}),
      };
      const started = await printReceiptDocument(
        buildReceiptPrintHtml({ receipt, settings, businessProfile, context }),
      );
      if (started) setConfirm(true);
    } catch {
      toast.error(t("receipt.printingUnavailable"));
    } finally {
      setPrinting(false);
    }
  };
  const confirmPrint = async () => {
    if (!receipt) return;
    setPrinting(true);
    try {
      await tauriDocumentsService.recordSalePrintAudit(receipt.sale.sale_id);
      toast.success(t("receipt.printRecorded"));
      setConfirm(false);
    } catch {
      toast.error(t("receipt.printAuditFailed"));
    } finally {
      setPrinting(false);
    }
  };
  const settings = {
    ...(receiptSettings ?? defaultReceiptPresentationSettings),
    ...(profileOverride ? { print_profile: profileOverride } : {}),
  };
  const hasManyItems = (receipt?.lines.length ?? 0) > 12;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90dvh,880px)] max-h-[90dvh] min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 space-y-1 border-b px-5 py-4 pr-12">
          <DialogTitle>{t("receipt.preview")}</DialogTitle>
          <DialogDescription>
            {receipt
              ? `${receipt.sale.sale_number} · ${printProfiles[settings.print_profile as PrintProfileId]?.label ?? "Thermal 80 mm"}`
              : loading ? "Preparing your receipt…" : "Sale receipt"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/30 px-4 py-5 sm:px-6" data-testid="receipt-preview-scroll">
          {loading && (
            <div className="mx-auto w-full max-w-sm space-y-5" role="status" aria-live="polite" aria-busy="true">
              <div className="flex items-center justify-center gap-3 text-sm font-medium text-foreground">
                <IconRefresh className="size-4 animate-spin" aria-hidden="true" />
                Loading receipt…
              </div>
              <div className="space-y-4 bg-white p-5 shadow-sm ring-1 ring-black/10" aria-hidden="true">
                <div className="mx-auto h-4 w-36 animate-pulse rounded bg-slate-200" />
                <div className="mx-auto h-3 w-24 animate-pulse rounded bg-slate-100" />
                <div className="h-px bg-slate-200" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100" />
                <div className="h-px bg-slate-200" />
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="flex justify-between gap-4">
                    <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                    <div className="h-3 w-14 animate-pulse rounded bg-slate-100" />
                  </div>
                ))}
                <div className="h-px bg-slate-200" />
                <div className="ml-auto h-4 w-28 animate-pulse rounded bg-slate-200" />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Checking saved sale and payment details. No new sale is being created.
              </p>
            </div>
          )}
          {loadError && !loading && (
            <div className="mx-auto max-w-md space-y-3 rounded-lg border border-destructive/30 bg-background p-5" role="alert">
              <p className="text-sm font-medium text-destructive">Could not display receipt</p>
              <p className="text-sm text-muted-foreground">{loadError}</p>
              <p className="text-xs text-muted-foreground">
                The sale may already be saved. Check Sales History before making another sale.
              </p>
              <Button type="button" variant="outline" onClick={() => setRetryCount(value => value + 1)}>
                <IconRefresh className="size-4" aria-hidden="true" />
                Retry loading receipt
              </Button>
            </div>
          )}
          {receipt && (
            <div className="flex min-h-full min-w-0 flex-col items-center justify-center">
              <ReceiptPresentation
                receipt={receipt}
                settings={settings}
                businessProfile={businessProfile}
                context={context}
                previewItemLimit={hasManyItems && !showAllItems ? 12 : undefined}
                testId="sale-receipt-paper"
              />
            </div>
          )}
        </div>

        {receipt && (
          <div className="shrink-0 space-y-3 border-t bg-background px-4 py-3 sm:px-5">
            {hasManyItems && (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span><IconReceipt className="mr-1 inline size-4" aria-hidden="true" />
                  {receipt.lines.length} line items · Full receipt always prints
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-expanded={showAllItems}
                  onClick={() => setShowAllItems(value => !value)}>
                  {showAllItems ? "Show compact preview" : `Show all ${receipt.lines.length} items`}
                </Button>
              </div>
            )}
            {receipt.lines.length > 24 && settings.print_profile !== "document-a4" && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs">
                <span className="text-muted-foreground">
                  Large purchase? A4 is easier to read across multiple pages than a long thermal roll.
                </span>
                <Button type="button" size="sm" variant="outline"
                  onClick={() => setProfileOverride("document-a4")}>
                  Use A4 format
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Select
                value={settings.print_profile}
                onValueChange={(value) => setProfileOverride(value as PrintProfileId)}>
                <SelectTrigger aria-label="Temporary print format" className="w-full min-w-0 sm:w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(printProfiles).map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t("receipt.close")}
                </Button>
                <Button type="button" disabled={printing} onClick={() => void print()}>
                  <IconPrinter className="size-4" aria-hidden="true" />
                  {printing ? "Preparing receipt…" : t("receipt.print")}
                </Button>
              </div>
            </div>
            {confirm && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm">
                <span>Did you complete printing in the system dialog?</span>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setConfirm(false)}>
                    {t("receipt.no")}
                  </Button>
                  <Button type="button" size="sm" disabled={printing} onClick={() => void confirmPrint()}>
                    {t("receipt.recordPrint")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        {!receipt && !loading && (
          <div className="shrink-0 flex justify-end border-t bg-background px-5 py-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("receipt.close")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
