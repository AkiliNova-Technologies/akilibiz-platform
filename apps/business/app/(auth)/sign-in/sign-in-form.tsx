"use client";

import { type FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AkiliButton } from "@/components/akilibiz/akili-button";
import { AkiliFormField } from "@/components/akilibiz/akili-form-field";
import { StatusBanner } from "@/components/akilibiz/status-banner";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const { error: signInError } = await createClient().auth.signInWithPassword(
      {
        email,
        password,
      },
    );

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    const next = searchParams.get("next");
    const destination =
      next?.startsWith("/") && !next.startsWith("//") ? next : "/businesses";
    router.replace(destination);
    router.refresh();
  }

  return (
    <form className="mt-8 space-y-5" onSubmit={signIn}>
      <AkiliFormField id="email" label="Email address">
        <Input
          autoComplete="email"
          className="h-11"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
      </AkiliFormField>
      <AkiliFormField id="password" label="Password">
        <Input
          autoComplete="current-password"
          className="h-11"
          id="password"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </AkiliFormField>
      {error ? (
        <StatusBanner title="We could not sign you in" tone="error">
          {error}
        </StatusBanner>
      ) : null}
      <AkiliButton
        className="mt-2 w-full"
        disabled={isSubmitting}
        loading={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </AkiliButton>
    </form>
  );
}
