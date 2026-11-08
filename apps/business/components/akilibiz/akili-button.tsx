"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AkiliButtonProps = Omit<React.ComponentProps<typeof Button>, "variant"> & {
  loading?: boolean;
  variant?: "primary" | "secondary" | "destructive" | "ghost" | "link";
};

const variantMap = {
  primary: "default",
  secondary: "outline",
  destructive: "destructive",
  ghost: "ghost",
  link: "link",
} as const;

export function AkiliButton({
  children,
  className,
  disabled,
  loading = false,
  variant = "primary",
  ...props
}: AkiliButtonProps) {
  return (
    <Button
      className={cn("h-10 gap-2 px-4 font-semibold", className)}
      disabled={disabled || loading}
      variant={variantMap[variant]}
      {...props}
    >
      {loading ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" />
      ) : null}
      {children}
    </Button>
  );
}
