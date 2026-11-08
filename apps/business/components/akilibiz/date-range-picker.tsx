"use client";

import * as React from "react";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DateRangePickerProps {
  from: string;
  to: string;
  onRangeChange: (from: string, to: string) => void;
  id?: string;
  label?: string;
  className?: string;
  align?: "start" | "center" | "end";
  numberOfMonths?: number;
  disableFuture?: boolean;
}

function parseIsoDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  return date;
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** AkiliBiz Desktop-style calendar range, with a single pill trigger and a popover calendar.
 * All consumers retain control of their ISO UTC reporting boundaries.
 */
export function DateRangePicker({
  from, to, onRangeChange, id = "date-range-picker", label = "Date range",
  className, align = "start", numberOfMonths = 2, disableFuture = true,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectionStart, setSelectionStart] = React.useState<string | null>(null);
  const selected: DateRange | undefined = React.useMemo(() => {
    const start = parseIsoDate(from);
    const end = parseIsoDate(to);
    return start ? { from: start, to: end } : undefined;
  }, [from, to]);
  const displayDate = (date: Date) =>
    new Intl.DateTimeFormat("en-UG", { day: "numeric", month: "short", year: "numeric" }).format(date);
  const handleSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      setSelectionStart(null);
      onRangeChange("", "");
      return;
    }
    if (selectionStart === null) {
      const value = toIsoDate(range.from);
      setSelectionStart(value);
      onRangeChange(value, value);
      return;
    }
    const start = parseIsoDate(selectionStart);
    if (start && range.to) {
      onRangeChange(toIsoDate(range.from), toIsoDate(range.to));
      setSelectionStart(null);
      setOpen(false);
    } else {
      const value = toIsoDate(range.from);
      onRangeChange(value, value);
      setSelectionStart(value);
    }
  };

  return (
    <Field className={className}>
      {label ? <FieldLabel htmlFor={id}>{label}</FieldLabel> : null}
      <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSelectionStart(null); }}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" id={id}
            className="h-11 w-full min-w-0 justify-start gap-2 px-3 text-left font-normal">
            <CalendarIcon className="size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">
              {selected?.from
                ? `${displayDate(selected.from)} - ${displayDate(selected.to ?? selected.from)}`
                : "Choose a date range"}
            </span>
            <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto max-w-[calc(100vw-2rem)] overflow-x-auto p-0" align={align}>
          <Calendar mode="range" defaultMonth={selected?.from} selected={selected}
            onSelect={handleSelect} numberOfMonths={numberOfMonths}
            disabled={disableFuture ? { after: new Date() } : undefined} />
        </PopoverContent>
      </Popover>
    </Field>
  );
}
