// GENERATED from the AkiliBiz Desktop repository (src/components/feedback/feedback-state.tsx). Do not edit here:
// change the desktop file, then run `node apps/business/scripts/sync-desktop-i18n.mjs`.
import type { ReactNode } from "react";
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InboxIcon,
  InfoIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type FeedbackKind = "empty" | "success" | "info" | "warning" | "error";
export type FeedbackSize = "compact" | "section" | "page";

export interface FeedbackStateProps {
  kind?: FeedbackKind;
  size?: FeedbackSize;
  title: string;
  titleClassName?: string;
  description?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
}

const stateIcons = {
  empty: InboxIcon,
  success: CircleCheckIcon,
  info: InfoIcon,
  warning: TriangleAlertIcon,
  error: CircleAlertIcon,
} as const;

const sizes = {
  compact: "min-h-28 px-4 py-5",
  section: "min-h-44 px-5 py-8",
  page: "min-h-[60vh] px-6 py-12",
} as const;

/**
 * Shared illustration-free state for empty, success, information, warning,
 * and failure views. Every color comes from existing theme tokens.
 * Action elements are passed by the caller so routing and permissions stay local.
 */
export function FeedbackState({
  kind = "empty",
  size = "section",
  title,
  titleClassName,
  description,
  action,
  secondaryAction,
  className,
}: FeedbackStateProps) {
  const Icon = stateIcons[kind];
  const attention = kind === "warning" || kind === "error";
  return (
    <div
      data-slot="feedback-state"
      data-feedback-kind={kind}
      role={attention ? "alert" : "status"}
      className={cn(
        "flex w-full min-w-0 flex-col items-center justify-center gap-2 text-center",
        sizes[size],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mb-2 inline-flex size-11 items-center justify-center rounded-2xl border bg-muted",
          attention ? "text-destructive" : "text-primary",
        )}
      >
        <Icon className="size-5" />
      </span>
      <h3 className={cn("max-w-lg text-sm font-semibold text-foreground sm:text-base", titleClassName)}>
        {title}
      </h3>
      {description && (
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

export function FeedbackPage(props: Omit<FeedbackStateProps, "size">) {
  return <FeedbackState {...props} size="page" />;
}

export function EmptyState(props: Omit<FeedbackStateProps, "kind">) {
  return <FeedbackState {...props} kind="empty" />;
}
