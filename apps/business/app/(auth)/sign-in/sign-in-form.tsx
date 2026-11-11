"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { AkiliButton } from "@/components/akilibiz/akili-button";
import { AkiliFormField } from "@/components/akilibiz/akili-form-field";
import { StatusBanner } from "@/components/akilibiz/status-banner";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { GoogleSignInButton } from "@/components/akilibiz/auth/google-sign-in-button";

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { error: signInError } = await createClient().auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (signInError) {
        setError("Could not sign in. Check your email and password.");
        return;
      }
      router.replace("/businesses");
      router.refresh();
    } catch {
      setError("Could not sign in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={signIn}>
      <AkiliFormField id="email" label="Email address">
        <Input autoComplete="email" className="h-11 rounded-full px-4" id="email"
          onChange={(event) => setEmail(event.target.value)} required type="email" value={email}/>
      </AkiliFormField>
      <AkiliFormField id="password" label="Password">
        <div className="relative">
          <Input autoComplete="current-password" className="h-11 rounded-full px-4 pr-12" id="password"
            onChange={(event) => setPassword(event.target.value)} required type={showPassword ? "text" : "password"} value={password}/>
          <button type="button" aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            {showPassword ? <EyeOff className="size-4"/> : <Eye className="size-4"/>}
          </button>
        </div>
      </AkiliFormField>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">Forgot password?</Link>
      </div>
      {error ? <StatusBanner title="We could not sign you in" tone="error">{error}</StatusBanner> : null}
      <AkiliButton className="mt-2 h-11 w-full rounded-full" disabled={isSubmitting} loading={isSubmitting} type="submit">
        {isSubmitting ? "Signing in…" : "Sign in"}
      </AkiliButton>
      <div className="relative flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div>
      <GoogleSignInButton />
      <p className="text-center text-sm text-muted-foreground">New to AkiliBiz? <Link href="/sign-up" className="font-medium text-primary hover:underline">Create account</Link></p>
    </form>
  );
}
