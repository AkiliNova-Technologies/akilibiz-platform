import type { ReactNode } from "react";
import { Inbox, LoaderCircle, TriangleAlert } from "lucide-react";
import { AkiliButton } from "./akili-button";

type StateProps = {
  action?: ReactNode;
  description: string;
  title: string;
};

export function EmptyState({ action, description, title }: StateProps) {
  return (
    <StateFrame
      action={action}
      description={description}
      icon={<Inbox />}
      title={title}
    />
  );
}

export function LoadingState({
  description = "Please wait while we load this information.",
}: {
  description?: string;
}) {
  return (
    <StateFrame
      description={description}
      icon={<LoaderCircle className="animate-spin" />}
      title="Loading"
    />
  );
}

export function ErrorState({
  action,
  description,
  title = "Something went wrong",
}: StateProps) {
  return (
    <StateFrame
      action={action}
      description={description}
      icon={<TriangleAlert className="text-error-600" />}
      title={title}
    />
  );
}

function StateFrame({
  action,
  description,
  icon,
  title,
}: StateProps & { icon: ReactNode }) {
  return (
    <section className="flex min-h-48 max-w-xl flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-700 [&_svg]:size-5">
        {icon}
      </span>
      <h2 className="mt-4 text-lg font-semibold text-ink-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}

export const RetryButton = ({ onClick }: { onClick: () => void }) => (
  <AkiliButton onClick={onClick} variant="secondary">
    Try again
  </AkiliButton>
);
