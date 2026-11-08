import { Suspense } from "react";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="grid min-h-screen bg-muted/30 lg:grid-cols-2">
      <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-md">
          <p className="text-sm font-semibold tracking-wide text-brand-700">
            AkiliBiz Business
          </p>
          <h1 className="mt-3 font-[family-name:var(--font-sora)] text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
            Welcome back
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            Sign in to manage your business with clarity and confidence.
          </p>
          <Suspense fallback={<div aria-hidden="true" className="mt-8" />}>
            <SignInForm />
          </Suspense>
        </div>
      </section>

      <aside className="relative hidden overflow-hidden bg-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10">
          <p className="text-sm font-semibold tracking-wide text-brand-100">
            AkiliBiz
          </p>
          <h2 className="mt-6 max-w-md font-[family-name:var(--font-sora)] text-4xl font-semibold tracking-tight">
            Your business, all in one place.
          </h2>
        </div>
        <p className="relative z-10 max-w-sm text-sm leading-6 text-brand-100">
          Keep your team, business details, and daily work connected in one
          dependable workspace.
        </p>
        <div
          aria-hidden="true"
          className="absolute -right-28 -top-28 size-96 rounded-full bg-brand-700/50"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 left-16 size-80 rounded-full border-[28px] border-brand-700/40"
        />
      </aside>
    </main>
  );
}
