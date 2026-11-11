"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

/** Google OAuth is a hosted sign-in, never a local desktop credential. */
export function GoogleSignInButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function continueWithGoogle() {
    setBusy(true);
    setError(false);
    try {
      const { error: authError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/businesses` },
      });
      if (authError) {
        setError(true);
        setBusy(false);
      }
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return <div className="space-y-2">
    <Button type="button" variant="outline" className="h-11 w-full rounded-full" disabled={busy}
      onClick={() => void continueWithGoogle()}>
      {busy ? "Connecting…" : "Continue with Google"}
    </Button>
    {error ? <p role="alert" className="text-sm text-destructive">Google sign-in is unavailable. Try again or sign in with email.</p> : null}
  </div>;
}
