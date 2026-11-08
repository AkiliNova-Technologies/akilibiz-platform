import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

type AkiliFormFieldProps = {
  children: ReactNode;
  description?: string;
  error?: string;
  id: string;
  label: string;
  optional?: boolean;
};

export function AkiliFormField({
  children,
  description,
  error,
  id,
  label,
  optional = false,
}: AkiliFormFieldProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {label}
        {optional ? (
          <span className="font-normal text-muted-foreground"> (optional)</span>
        ) : null}
      </Label>
      {children}
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {error ? (
        <p className="text-sm text-error-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
