import { Suspense } from "react";
import { AuthShell } from "../auth-shell";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <AuthShell>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">AkiliBiz Business</p>
        <h1 className="pt-2 font-[family-name:var(--font-sora)] text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome back
        </h1>
        <p className="max-w-sm pt-1 text-sm leading-6 text-muted-foreground">
          Sign in to manage your business.
        </p>
      </div>
      <Suspense fallback={<div aria-hidden="true" className="mt-8" />}>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
