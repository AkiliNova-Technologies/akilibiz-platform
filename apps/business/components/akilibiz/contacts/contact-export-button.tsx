"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExportEntity } from "@/lib/contact-export";

export function ContactExportButton({ entity }: { entity: ExportEntity }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const download = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await fetch(`/api/contacts/export?entity=${entity}`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!result.ok) {
        const body = await result.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not download this directory.");
      }
      const blob = await result.blob();
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = `akilibiz-${entity}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };
  return <div className="flex flex-col gap-1">
    <Button type="button" variant="outline" disabled={busy} onClick={() => void download()}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
      {busy ? "Exporting…" : "Export CSV"}
    </Button>
    {error && <p className="max-w-xs text-xs text-destructive" role="alert">{error}</p>}
  </div>;
}
