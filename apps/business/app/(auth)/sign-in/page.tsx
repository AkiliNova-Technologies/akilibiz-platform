import { Suspense } from "react";
import { AuthShell } from "../auth-shell";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return <AuthShell>
    <div className="space-y-2">
      <h1 className="font-[family-name:var(--font-sora)] text-3xl font-semibold tracking-tight sm:text-4xl">
        Welcome back
      </h1>
      <p className="text-sm leading-6 text-muted-foreground">Sign in to manage your business.</p>
    </div>
    <Suspense fallback={<div aria-hidden="true" className="mt-8"/>}><SignInForm/></Suspense>
  </AuthShell>;
}
