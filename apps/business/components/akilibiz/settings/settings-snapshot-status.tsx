"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SettingsSnapshotStatus({
  state, lastSync, onRetry,
}: {
  state: "loading" | "ready" | "unavailable" | "error";
  lastSync: string | null;
  onRetry: () => void;
}) {
  if (state === "loading") return <span className="sr-only" role="status">Loading saved desktop settings</span>;
  if (state === "ready") return <p className="text-sm text-muted-foreground" role="status">
    Read-only desktop settings
    {lastSync && !Number.isNaN(Date.parse(lastSync))
      ? <> · Last synchronized {new Intl.DateTimeFormat("en-UG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kampala" }).format(new Date(lastSync))}</>
      : null}
  </p>;
  return <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm text-muted-foreground" role="status">
    <span>{state === "error"
      ? "Could not retrieve desktop settings. The fields below remain unavailable."
      : "No verified desktop settings have been synchronized for this business."}</span>
    <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={onRetry}>
      <RefreshCw className="size-4" aria-hidden="true" />
      Retry
    </Button>
  </div>;
}
