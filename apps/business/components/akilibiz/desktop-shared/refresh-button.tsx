// GENERATED from the AkiliBiz Desktop repository (src/components/refresh-button.tsx). Do not edit here:
// change the desktop file, then run `node apps/business/scripts/sync-desktop-i18n.mjs`.
import * as React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type RefreshButtonProps = Omit<React.ComponentProps<typeof Button>, "children" | "size" | "variant"> & {
  label?: string;
  loading?: boolean;
};

/** Compact, accessible refresh action for table and report toolbars. */
export function RefreshButton({
  label = "Refresh",
  loading = false,
  disabled,
  type = "button",
  ...props
}: RefreshButtonProps) {
  return (
    <Button
      {...props}
      type={type}
      variant="outline"
      size="icon"
      aria-label={label}
      title={label}
      disabled={disabled || loading}
    >
      <RefreshCw aria-hidden="true" className={`size-4 ${loading ? "animate-spin" : ""}`} />
    </Button>
  );
}
