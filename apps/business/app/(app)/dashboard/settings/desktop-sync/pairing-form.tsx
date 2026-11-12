"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPairingCode, type PairingState } from "./actions";

const initialState: PairingState = { error: null, code: null, expiresAt: null };

export function PairingForm() {
  const [state, action, pending] = useActionState(createPairingCode, initialState);
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    if (!state.code) return;
    try {
      await navigator.clipboard.writeText(state.code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <form action={action} onSubmit={() => setCopied(false)} className="space-y-3">
      <Button type="submit" disabled={pending} className="h-10 rounded-full">
        <Link2 className="size-4" />
        {pending ? "Generating code…" : state.code ? "Generate new code" : "Generate pairing code"}
      </Button>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      {state.code && (
        <div className="space-y-3 rounded-xl border bg-card p-3 sm:p-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Your one-time pairing code</p>
            <p className="text-xs text-muted-foreground">Paste this code into the Desktop sync section of your desktop application.</p>
          </div>
          <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start">
            <code className="min-w-0 flex-1 break-all rounded-full bg-muted px-5 py-3 font-mono text-xs leading-relaxed select-all">
              {state.code}
            </code>
            <Button type="button" variant="outline" className="shrink-0 rounded-full" onClick={() => void copyCode()}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copied" : "Copy code"}
            </Button>
          </div>
          {state.expiresAt && <p className="text-xs text-muted-foreground">
            Expires {new Intl.DateTimeFormat("en-UG", {
              dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kampala"
            }).format(new Date(state.expiresAt))} (Kampala time).
          </p>}
          <p className="text-xs text-muted-foreground">
            Sign in to the same AkiliBiz online account on Desktop before entering the code.
            Keep the code private. Never include it in screenshots or support messages.
          </p>
        </div>
      )}
    </form>
  );
}
