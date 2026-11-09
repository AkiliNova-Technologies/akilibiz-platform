import Image from "next/image";
import type { ReactNode } from "react";
import images from "@/assets/images";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-2">
      <section className="flex min-w-0 flex-col justify-center px-5 py-10 sm:px-10 lg:px-12 xl:px-20">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </section>
      <aside className="relative hidden min-h-svh overflow-hidden bg-muted lg:block" aria-label="AkiliBiz">
        <Image
          src={images.placeholder}
          alt="AkiliBiz business workspace"
          fill
          priority
          sizes="50vw"
          className="object-cover dark:brightness-[0.2]"
        />
      </aside>
    </main>
  );
}
