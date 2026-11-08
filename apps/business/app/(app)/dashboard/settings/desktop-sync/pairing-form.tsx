"use client";

import { useActionState } from "react";
import { createPairingCode, type PairingState } from "./actions";

const initialState: PairingState = { error: null, code: null, expiresAt: null };

export function PairingForm() {
  const [state, action, pending] = useActionState(createPairingCode, initialState);
  return (
    <form action={action} className="space-y-4">
      <button type="submit" disabled={pending} className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
        {pending ? "Generating…" : "Generate pairing code"}
      </button>
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      {state.code && (
        <div className="space-y-2 rounded-lg border p-4">
          <p className="text-sm font-medium">One-time pairing code</p>
          <p className="break-all font-mono text-sm select-all">{state.code}</p>
          <p className="text-sm text-muted-foreground">
            Expires {new Date(state.expiresAt!).toLocaleString()}. Sign into the same account on desktop before claiming.
          </p>
          <p className="text-sm text-muted-foreground">Keep this code private. Do not send it in screenshots or support messages.</p>
        </div>
      )}
    </form>
  );
}
