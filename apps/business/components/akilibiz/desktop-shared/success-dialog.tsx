// GENERATED from the AkiliBiz Desktop repository (src/components/feedback/success-dialog.tsx). Do not edit here:
// change the desktop file, then run `node apps/business/scripts/sync-desktop-i18n.mjs`.
import type { ReactNode } from "react";
import { CircleCheckIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface SuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  details?: ReactNode;
  primaryLabel?: string;
  onPrimaryAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}

export function SuccessDialog({
  open,
  onOpenChange,
  title,
  description,
  details,
  primaryLabel = "Done",
  onPrimaryAction,
  secondaryLabel,
  onSecondaryAction,
}: SuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center sm:items-center sm:text-center">
          <span
            aria-hidden="true"
            className="mb-2 inline-flex size-14 items-center justify-center rounded-2xl border bg-muted text-primary"
          >
            <CircleCheckIcon className="size-7" />
          </span>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {details && <div className="rounded-lg border bg-card p-4 text-sm">{details}</div>}
        <DialogFooter className="sm:justify-center">
          {secondaryLabel && onSecondaryAction && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onSecondaryAction();
                onOpenChange(false);
              }}
            >
              {secondaryLabel}
            </Button>
          )}
          <Button
            type="button"
            onClick={() => {
              onPrimaryAction?.();
              onOpenChange(false);
            }}
          >
            {primaryLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
