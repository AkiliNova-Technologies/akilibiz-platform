"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SettingsSnapshotStatus({
  state, onRetry,
}: {
  state: "loading" | "ready" | "unavailable" | "error";
  lastSync: string | null;
  onRetry: () => void;
}) {
  if (state === "loading") return <span className="sr-only" role="status">Loading saved desktop settings</span>;
  if (state === "ready") return <p className="text-sm text-muted-foreground" role="status">Read-only desktop settings</p>;
  return <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm text-muted-foreground" role="status">
    <span>{state === "error"
      ? "Could not load settings."
      : "Settings are not available yet."}</span>
    <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={onRetry}>
      <RefreshCw className="size-4" aria-hidden="true" />
      Retry
    </Button>
  </div>;
}
