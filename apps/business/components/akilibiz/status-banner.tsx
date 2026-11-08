import type { ReactNode } from "react";
import { CheckCircle2, CircleAlert, Info, TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

type StatusBannerProps = {
  children?: ReactNode;
  title: string;
  tone?: "info" | "success" | "warning" | "error";
};

const tones = {
  error: {
    className: "border-error-600/30 bg-error-50 text-error-600",
    icon: CircleAlert,
  },
  info: {
    className: "border-brand-200 bg-brand-50 text-brand-800",
    icon: Info,
  },
  success: {
    className: "border-success-600/30 bg-success-50 text-success-600",
    icon: CheckCircle2,
  },
  warning: {
    className: "border-warning-600/30 bg-warning-50 text-warning-600",
    icon: TriangleAlert,
  },
};

export function StatusBanner({
  children,
  title,
  tone = "info",
}: StatusBannerProps) {
  const { className, icon: Icon } = tones[tone];

  return (
    <Alert className={cn(className)}>
      <Icon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      {children ? (
        <AlertDescription className="text-current/80">
          {children}
        </AlertDescription>
      ) : null}
    </Alert>
  );
}
