"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function AccountNameForm({ name }: { name: string }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    setError("");
    const fullName = value.trim();
    if (!fullName || fullName.length > 120) {
      setError("Enter your name (up to 120 characters).");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError("Your session expired. Sign in again.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: fullName },
      });
      if (updateError) {
        setError("Could not save your name. Please try again.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Could not save your name. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={save} className="space-y-3">
    <div>
      <h3 className="font-semibold">Your name</h3>
      <p className="text-sm text-muted-foreground">How your name appears in your AkiliBiz account.</p>
    </div>
    <label className="block space-y-1" htmlFor="account-full-name">
      <span className="text-sm font-medium">Full name</span>
      <Input id="account-full-name" className="h-11 rounded-full px-4"
        value={value} onChange={e => setValue(e.target.value)} maxLength={120}
        autoComplete="name" required disabled={busy} />
    </label>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    {saved ? <p role="status" className="text-sm text-muted-foreground">Name saved.</p> : null}
    <Button type="submit" className="h-11 rounded-full" disabled={busy || !value.trim()}>
      {busy ? "Saving…" : "Save name"}
    </Button>
  </form>;
}
