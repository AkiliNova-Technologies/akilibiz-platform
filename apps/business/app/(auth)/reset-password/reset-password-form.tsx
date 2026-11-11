"use client";
import {type FormEvent, useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/client";
import {AkiliFormField} from "@/components/akilibiz/akili-form-field";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";

export function ResetPasswordForm(){
  const router=useRouter();
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [done,setDone]=useState(false);
  async function submit(e:FormEvent){
    e.preventDefault();setError("");
    if(password.length<8){setError("Use at least 8 characters.");return;}
    if(password!==confirm){setError("Passwords do not match.");return;}
    setBusy(true);
    try {
      const {data:{user}}=await createClient().auth.getUser();
      if(!user){setError("This reset link is no longer valid. Request a new one.");return;}
      const {error:problem}=await createClient().auth.updateUser({password});
      if(problem){setError("Could not change your password. Request a new reset link.");return;}
      setDone(true);
      await createClient().auth.signOut();
      router.refresh();
    }catch{setError("Could not change your password. Please try again.");}
    finally{setBusy(false);}
  }
  if(done)return <div className="mt-8 space-y-4">
    <p role="status" className="text-sm text-muted-foreground">Your password has been updated.</p>
    <Link className="font-medium text-primary hover:underline" href="/sign-in">Sign in</Link>
  </div>;
  return <form className="mt-8 space-y-5" onSubmit={submit}>
    <AkiliFormField id="reset-new" label="New password">
      <Input id="reset-new" required type="password" minLength={8} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="h-11 rounded-full px-4"/>
    </AkiliFormField>
    <AkiliFormField id="reset-confirm" label="Confirm password">
      <Input id="reset-confirm" required type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="h-11 rounded-full px-4"/>
    </AkiliFormField>
    {error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}
    <Button type="submit" disabled={busy} className="h-11 w-full rounded-full">{busy?"Saving…":"Update password"}</Button>
    <p className="text-center text-sm"><Link className="text-primary hover:underline" href="/forgot-password">Request a new link</Link></p>
  </form>;
}
