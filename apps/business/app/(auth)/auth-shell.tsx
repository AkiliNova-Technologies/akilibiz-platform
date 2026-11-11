import Image from "next/image";
import type { ReactNode } from "react";
import images from "@/assets/images";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-2">
      <section className="flex min-w-0 flex-col px-6 py-8 sm:px-10 lg:px-12 xl:px-20">
<div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {children}
        </div>
      </section>
      <aside className="relative hidden min-h-svh overflow-hidden bg-muted lg:block" aria-label="Business workspace">
        <Image src={images.placeholder} alt="Small business workspace" fill priority sizes="50vw"
          className="object-cover dark:brightness-[0.65]" />
      </aside>
    </main>
  );
}
