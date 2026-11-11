"use client";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function AccountPasswordForm() {
  const [password,setPassword] = useState("");
  const [confirmation,setConfirmation] = useState("");
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [done,setDone] = useState(false);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");setDone(false);
    if(password.length < 8){setError("Use at least 8 characters.");return;}
    if(password !== confirmation){setError("Passwords do not match.");return;}
    setBusy(true);
    try {
      const supabase = createClient();
      const {data:{user},error:userError} = await supabase.auth.getUser();
      if(userError || !user) {setError("Sign in again to change your password.");return;}
      const {error:problem} = await supabase.auth.updateUser({password});
      if(problem) {setError("Could not save your password. Please try again.");return;}
      setDone(true);setPassword("");setConfirmation("");
    }catch {setError("Could not save your password. Please try again.");}
    finally {setBusy(false);}
  }

  return <form className="space-y-3" onSubmit={submit}>
    <div>
      <h3 className="font-semibold">Account password</h3>
      <p className="text-sm text-muted-foreground">Use a password to sign in online, including when connecting your desktop app.</p>
    </div>
    <div className="space-y-1">
      <label htmlFor="account-password" className="text-sm font-medium">New password</label>
      <Input id="account-password" type="password" autoComplete="new-password" className="h-11 rounded-full px-4"
        value={password} minLength={8} maxLength={128} required onChange={e=>setPassword(e.target.value)}/>
    </div>
    <div className="space-y-1">
      <label htmlFor="account-password-confirm" className="text-sm font-medium">Confirm password</label>
      <Input id="account-password-confirm" type="password" autoComplete="new-password" className="h-11 rounded-full px-4"
        value={confirmation} minLength={8} maxLength={128} required onChange={e=>setConfirmation(e.target.value)}/>
    </div>
    {error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}
    {done?<p role="status" className="text-sm text-muted-foreground">Password saved.</p>:null}
    <Button className="h-11 rounded-full" disabled={busy} type="submit">{busy?"Saving…":"Save password"}</Button>
  </form>;
}
