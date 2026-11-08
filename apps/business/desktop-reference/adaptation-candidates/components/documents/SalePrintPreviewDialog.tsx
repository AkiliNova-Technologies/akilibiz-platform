import { useEffect, useState } from "react";
import { IconPrinter } from "@tabler/icons-react";
import { toast } from "sonner";
import {
  defaultReceiptPresentationSettings,
  ReceiptPresentation,
} from "@/components/documents/ReceiptPresentation";
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
import { useReduxSettings } from "@/hooks/useReduxSettings";
import { tauriDocumentsService } from "@/services/tauri/documents";
import {
  buildReceiptPrintHtml,
  printReceiptDocument,
} from "@/services/receipt-print-service";
import type {
  CanonicalReceipt,
  ReceiptPresentationContext,
} from "@/types/receipt";
import {
  printProfiles,
  type PrintProfileId,
} from "@/services/receipt-print-profiles";
import { useI18n } from "@/hooks/useI18n";

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
  const [printing, setPrinting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [profileOverride, setProfileOverride] = useState<PrintProfileId | null>(
    null,
  );
  useEffect(() => {
    if (!open || saleId === null) {
      setReceipt(null);
      setConfirm(false);
      return;
    }
    let current = true;
    setReceipt(null);
    setConfirm(false);
    setLoading(true);
    void Promise.allSettled([getBusinessProfile(), getReceiptSettings()]);
    void tauriDocumentsService
      .getCanonicalReceipt(saleId)
      .then((value) => {
        if (current) setReceipt(value);
      })
      .catch(() => {
        if (current) {
          toast.error(t("sales.receiptUnavailable"));
          onOpenChange(false);
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [getBusinessProfile, getReceiptSettings, onOpenChange, open, saleId, t]);
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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("receipt.preview")}</DialogTitle>
          <DialogDescription>
            {receipt
              ? `${receipt.sale.sale_number} · ${printProfiles[settings.print_profile as PrintProfileId]?.label ?? "Thermal 80 mm"}`
              : "Loading receipt…"}
          </DialogDescription>
        </DialogHeader>
        {loading && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Loading receipt…
          </div>
        )}
        {receipt && (
          <>
            <div className="flex justify-center overflow-auto bg-muted/30 p-4 sm:p-6">
              <ReceiptPresentation
                receipt={receipt}
                settings={settings}
                businessProfile={businessProfile}
                context={context}
                testId="sale-receipt-paper"
              />
            </div>
            <Select
              value={settings.print_profile}
              onValueChange={(value) =>
                setProfileOverride(value as PrintProfileId)
              }>
              <SelectTrigger aria-label="Temporary print format" className="w-full">
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
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("receipt.close")}
              </Button>
              <Button disabled={printing} onClick={() => void print()}>
                <IconPrinter className="size-4" />
                {printing ? "Preparing receipt…" : t("receipt.print")}
              </Button>
            </div>
            {confirm && (
              <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span>
                  System print dialog was opened. Record your confirmation if
                  you completed it.
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirm(false)}>
                    {t("receipt.no")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={printing}
                    onClick={() => void confirmPrint()}>
                    {t("receipt.recordPrint")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
