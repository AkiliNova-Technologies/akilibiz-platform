"use client";

import { CalendarIcon, ChevronDownIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DateRangePicker({
  from,
  to,
  onRangeChange,
  id = "date-range-picker",
  label = "Date range",
  className,
}: {
  from: string;
  to: string;
  onRangeChange: (from: string, to: string) => void;
  id?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex h-11 items-center gap-2 rounded-md border px-2.5">
        <CalendarIcon className="size-4" />
        <Input
          id={id}
          aria-label={`${label} start`}
          className="h-8 border-0 p-0 shadow-none"
          type="date"
          value={from}
          onChange={(event) => onRangeChange(event.target.value, to)}
        />
        <span className="text-muted-foreground">-</span>
        <Input
          aria-label={`${label} end`}
          className="h-8 border-0 p-0 shadow-none"
          type="date"
          value={to}
          onChange={(event) => onRangeChange(from, event.target.value)}
        />
        <ChevronDownIcon className="ml-auto size-4 opacity-50" />
      </div>
    </div>
  );
}
