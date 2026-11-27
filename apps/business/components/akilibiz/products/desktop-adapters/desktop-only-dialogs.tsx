"use client";

// Web stand-ins for the desktop's variant, CSV import and import history
// dialogs. Same titles as the desktop; these actions run on the desktop for now.
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";

function DesktopOnly({ open, onOpenChange, title, description }: {
  open: boolean; onOpenChange(open: boolean): void; title: string; description: string;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This is done in AkiliBiz Desktop for now. Changes made there appear here after the next sync.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProductVariantGroupsDialog({ open, onOpenChange }: {
  open: boolean; onOpenChange(open: boolean): void; products?: unknown; canManage?: boolean;
}) {
  return <DesktopOnly open={open} onOpenChange={onOpenChange} title="Product variants"
    description="Organize existing products by size, color or capacity. Each variant remains a separate product with its own SKU, price and stock." />;
}

export function ProductCsvImportDialog({ open, onOpenChange }: {
  open: boolean; onOpenChange(open: boolean): void; onImportComplete?: () => void;
}) {
  const { t } = useI18n();
  return <DesktopOnly open={open} onOpenChange={onOpenChange} title={t("products.import")}
    description="Import products from a CSV file." />;
}

export function CsvImportHistoryDialog({ open, onOpenChange }: {
  open: boolean; onOpenChange(open: boolean): void; importType?: string;
}) {
  return <DesktopOnly open={open} onOpenChange={onOpenChange} title="Product Import History"
    description="Read-only completed CSV imports in backend-provided newest-first order." />;
}
