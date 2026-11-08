import { Button } from "@/components/ui/button";
import { IconCheck, IconLoader2, IconChevronLeft } from "@tabler/icons-react";
import { useState } from "react";

interface CompletionStepProps {
  onNext: () => void;
  onBack?: () => void;
  onFinish: () => void;
  isLastStep: boolean;
}

export default function CompletionStep({
  onBack,
  onFinish,
}: CompletionStepProps) {
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    setLoading(true);
    await onFinish();
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full justify-between space-y-6">
      <div className="space-y-6 text-left">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
            <IconCheck className="size-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Your System is Ready!
            </h2>
            <p className="text-sm text-muted-foreground">
              You have successfully completed the basic setup for AkiliBiz.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/30 dark:bg-[#121212] p-5 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              What to do next
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Get your business fully running on the dashboard by completing
              these essential steps:
            </p>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5 p-2 rounded-lg bg-background dark:bg-[#323232]/40 border border-border/40">
              <span className="mt-2 block size-1.5 rounded-full bg-primary shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-foreground text-sm">
                  Stock & Inventory
                </p>
                <p className="text-[12px] text-muted-foreground">
                  Add your products and initial stock levels.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2.5 p-2 rounded-lg bg-background dark:bg-[#323232]/40 border border-border/40">
              <span className="mt-2 block size-1.5 rounded-full bg-primary shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-foreground text-sm">
                  Staff & Cashiers
                </p>
                <p className="text-[12px] text-muted-foreground">
                  Create accounts for your shop attendants or managers.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2.5 p-2 rounded-lg bg-background dark:bg-[#323232]/40 border border-border/40">
              <span className="mt-2 block size-1.5 rounded-full bg-primary shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-foreground text-sm">
                  Receipts & Tax Settings
                </p>
                <p className="text-[12px] text-muted-foreground">
                  Customize your invoice headers and tax configurations.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-2.5 p-2 rounded-lg bg-background dark:bg-[#323232]/40 border border-border/40">
              <span className="mt-2 block size-1.5 rounded-full bg-primary shrink-0" />
              <div className="space-y-1">
                <p className="font-medium text-foreground text-sm">
                  Start Selling (POS)
                </p>
                <p className="text-[12px] text-muted-foreground">
                  Open your cash register and begin processing customer sales.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Balanced Layout Action Footer */}
      <div className="flex items-center justify-between gap-4 pt-6 border-t border-border/40 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={loading}
          className="rounded-full h-11 flex items-center gap-1 text-muted-foreground hover:text-foreground dark:bg-[#121212]">
          <IconChevronLeft className="size-5" />
        </Button>

        <Button
          onClick={handleFinish}
          disabled={loading}
          className="rounded-full h-11 px-6 font-medium shadow-md flex items-center gap-1.5 group">
          {loading ? (
            <>
              <IconLoader2 className="mr-1 size-4 animate-spin" />
              Finalizing...
            </>
          ) : (
            "Finish Setup"
          )}
        </Button>
      </div>
    </div>
  );
}
