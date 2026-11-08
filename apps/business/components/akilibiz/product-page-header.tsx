import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ProductPageHeaderProps = {
  actions?: ReactNode;
  description?: string;
  display?: boolean;
  eyebrow?: string;
  title: string;
};

export function ProductPageHeader({
  actions,
  description,
  display = false,
  eyebrow,
  title,
}: ProductPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-700">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "font-[family-name:var(--font-sora)] font-semibold tracking-tight text-ink-900",
            display ? "text-3xl sm:text-4xl" : "text-2xl",
            eyebrow && "mt-2",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
