"use client";
import { type FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AkiliFormField } from "@/components/akilibiz/akili-form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [email,setEmail]=useState("");
  const [busy,setBusy]=useState(false);
  const [sent,setSent]=useState(false);
  const [failed,setFailed]=useState(false);
  async function submit(e:FormEvent) {
    e.preventDefault();
    setFailed(false);setBusy(true);
    try {
      const {error}=await createClient().auth.resetPasswordForEmail(email.trim(),{
        redirectTo:`${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if(error){setFailed(true);return;}
      setSent(true);
    } catch {setFailed(true);} finally{setBusy(false);}
  }
  return <form onSubmit={submit} className="mt-8 space-y-5">
    {sent?<p role="status" className="text-sm text-muted-foreground">If this email belongs to an AkiliBiz account, you will receive a reset link.</p>:
      <AkiliFormField id="recovery-email" label="Email address">
        <Input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} className="h-11 rounded-full px-4"/>
      </AkiliFormField>}
    {failed?<p role="alert" className="text-sm text-destructive">Could not send your reset link. Please try again.</p>:null}
    {!sent?<Button className="h-11 w-full rounded-full" type="submit" disabled={busy}>{busy?"Sending…":"Send reset link"}</Button>:null}
    <p className="text-center text-sm"><Link className="font-medium text-primary hover:underline" href="/sign-in">Back to sign in</Link></p>
  </form>;
}
