"use client";
import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AkiliFormField } from "@/components/akilibiz/akili-form-field";
import { OnboardingStepper } from "@/components/akilibiz/onboarding-stepper";
import { createClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "@/components/akilibiz/auth/google-sign-in-button";

export function SignUpForm() {
  const router = useRouter();
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [confirm,setConfirm] = useState("");
  const [visible,setVisible] = useState(false);
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage(""); setError("");
    if (password.length < 8) { setError("Use at least 8 characters for your password."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const {data,error:authError} = await createClient().auth.signUp({
        email:email.trim(), password,
        options:{
          data:{display_name:name.trim()},
          emailRedirectTo:`${window.location.origin}/auth/callback?next=/businesses`,
        },
      });
      if (authError) {setError("Could not create your account. Check the details and try again.");return;}
      if (data.session) {router.replace("/businesses");router.refresh();return;}
      setMessage("Check your email for a confirmation link to finish creating your account.");
    } catch {setError("Could not create your account. Please try again.");}
    finally {setBusy(false);}
  }
  const pill="h-11 rounded-full px-4";
  return <div className="mt-7 space-y-6">
    <OnboardingStepper current={1}/>
    <form onSubmit={submit} className="space-y-4">
      <AkiliFormField id="signup-name" label="Full name">
        <Input id="signup-name" className={pill} value={name} maxLength={120} required autoComplete="name" onChange={e=>setName(e.target.value)}/>
      </AkiliFormField>
      <AkiliFormField id="signup-email" label="Email address">
        <Input id="signup-email" className={pill} type="email" value={email} required autoComplete="email" onChange={e=>setEmail(e.target.value)}/>
      </AkiliFormField>
      <AkiliFormField id="signup-password" label="Password">
        <div className="relative">
          <Input id="signup-password" className={pill+" pr-12"} type={visible?"text":"password"} value={password} required minLength={8} autoComplete="new-password" onChange={e=>setPassword(e.target.value)}/>
          <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={()=>setVisible(!visible)} aria-label={visible?"Hide password":"Show password"}>
            {visible?<EyeOff className="size-4"/>:<Eye className="size-4"/>}
          </button>
        </div>
      </AkiliFormField>
      <AkiliFormField id="signup-confirm" label="Confirm password">
        <Input id="signup-confirm" className={pill} type={visible?"text":"password"} value={confirm} required autoComplete="new-password" onChange={e=>setConfirm(e.target.value)}/>
      </AkiliFormField>
      {error?<p role="alert" className="text-sm text-destructive">{error}</p>:null}
      {message?<p role="status" className="text-sm text-muted-foreground">{message}</p>:null}
      <Button type="submit" disabled={busy} className="h-11 w-full rounded-full">{busy?"Creating account…":"Create account"}</Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      <GoogleSignInButton />
      <p className="text-center text-sm text-muted-foreground">Already have an account? <Link className="font-medium text-primary hover:underline" href="/sign-in">Sign in</Link></p>
    </form>
  </div>;
}
