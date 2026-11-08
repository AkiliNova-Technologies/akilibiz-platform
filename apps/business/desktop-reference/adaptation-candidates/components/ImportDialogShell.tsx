import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ImportDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  steps?: readonly string[];
  currentStep?: string;
  children: ReactNode;
  footer: ReactNode;
}

/** Shared responsive frame; importers keep their own workflow and business logic. */
export function ImportDialogShell({
  open,
  onOpenChange,
  title,
  description,
  steps,
  currentStep,
  children,
  footer,
}: ImportDialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(70vh,760px)] min-w-[40vw] w-[95vw] max-w-5xl flex-col overflow-hidden p-0 sm:w-[90vw]"
        showCloseButton={false}>
        <DialogHeader className="shrink-0 border-b px-5 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
          {steps && (
            <div
              className="flex flex-wrap gap-2 pt-2"
              aria-label="Import steps">
              {steps.map((step) => (
                <Badge
                  key={step}
                  variant={step === currentStep ? "default" : "outline"}>
                  {step}
                </Badge>
              ))}
            </div>
          )}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
        <DialogFooter className="shrink-0 border-t bg-dialog px-5 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] sm:justify-between">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
