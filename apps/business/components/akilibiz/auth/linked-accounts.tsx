"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/** Linking is explicit and only starts from an authenticated account. */
export function LinkedAccounts({ googleConnected }: { googleConnected: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function linkGoogle() {
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("Sign in again before connecting your Google account.");
        return;
      }
      const { error: linkingError } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/account` },
      });
      if (linkingError) setError("Unable to connect Google. Please check your account or ask an administrator to enable identity linking.");
    } catch {
      setError("Unable to connect Google. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="font-semibold">Google account</h3>
        <p className="text-sm text-muted-foreground">{googleConnected ? "Connected" : "Not connected"}</p>
      </div>
      {!googleConnected ? <Button type="button" variant="outline" className="rounded-full" disabled={busy}
        onClick={() => void linkGoogle()}>{busy ? "Connecting…" : "Connect Google"}</Button> : null}
    </div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
  </div>;
}
