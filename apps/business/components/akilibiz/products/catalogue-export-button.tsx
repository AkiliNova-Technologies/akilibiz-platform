"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CatalogueExportEntity } from "@/lib/catalogue-export";

export function CatalogueExportButton({ entity }: { entity: CatalogueExportEntity }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportRecords = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/catalogue/export?entity=${entity}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not export the catalogue.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      try {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `akilibiz-${entity}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Catalogue export failed.");
    } finally {
      setBusy(false);
    }
  };

  return <div className="flex flex-col gap-1">
    <Button variant="outline" type="button" disabled={busy} onClick={() => void exportRecords()}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      {busy ? "Exporting…" : "Export CSV"}
    </Button>
    {error ? <p className="max-w-xs text-xs text-destructive" role="alert">{error}</p> : null}
  </div>;
}
