// GENERATED from the AkiliBiz Desktop repository (src/components/date-range-picker.tsx). Do not edit here:
// change the desktop file, then run `node apps/business/scripts/sync-desktop-i18n.mjs`.
"use client";

import * as React from "react";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
import { type DateRange } from "react-day-picker";
import {
  dateRangePresetLabels,
  getDateRangePreset,
  type DateRangePreset,
} from "@/components/akilibiz/date-range-utils";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DateRangePickerProps {
  /** ISO "yyyy-MM-dd" start date */
  from: string;
  /** ISO "yyyy-MM-dd" end date */
  to: string;
  /** Called with the new ISO "yyyy-MM-dd" from/to whenever the selection changes */
  onRangeChange: (from: string, to: string) => void;
  id?: string;
  label?: string;
  className?: string;
  align?: "start" | "center" | "end";
  numberOfMonths?: number;
  disableFuture?: boolean;
  presets?: DateRangePreset[];
}

function parseIsoDate(value: string): Date | undefined {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Uniform date-range picker built on the shadcn Calendar/Popover primitives.
 * Consumers keep owning their own `from`/`to` string state — this component
 * only translates between that state and the Calendar's DateRange shape.
 */
export function DateRangePicker({
  from,
  to,
  onRangeChange,
  id = "date-range-picker",
  label,
  className,
  align = "start",
  numberOfMonths = 2,
  disableFuture = true,
  presets = [],
}: DateRangePickerProps) {
  const { t, locale } = useI18n();
  const displayLabel = label ?? t("dateRange.label");
  const displayDate = (date: Date) => new Intl.DateTimeFormat(locale, {year: "numeric", month: "short", day: "numeric"}).format(date);
  const presetLabels: Record<DateRangePreset, string> = {
    today: t("dashboard.today"), "7": t("dateRange.last7"), "30": t("dateRange.last30"), this_month: t("reports.thisMonth"),
  };
  const selected: DateRange | undefined = React.useMemo(() => {
    const fromDate = parseIsoDate(from);
    const toDate = parseIsoDate(to);
    if (!fromDate && !toDate) return undefined;
    return { from: fromDate, to: toDate };
  }, [from, to]);

  const handleSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      onRangeChange("", "");
      return;
    }
    const nextFrom = toIsoDate(range.from);
    // While the user has only clicked one end, mirror it to `to` so callers
    // that immediately use `to` (e.g. as another field's min/max) stay valid.
    const nextTo = range.to ? toIsoDate(range.to) : nextFrom;
    onRangeChange(nextFrom, nextTo);
  };

  const handlePreset = (preset: string) => {
    if (!(preset in dateRangePresetLabels)) return;
    const range = getDateRangePreset(preset as DateRangePreset);
    onRangeChange(range.from, range.to);
  };

  return (
    <Field className={className}>
      {displayLabel ? <FieldLabel htmlFor={id}>{displayLabel}</FieldLabel> : null}
      {presets.length > 0 && (
        <Select onValueChange={handlePreset}>
          <SelectTrigger aria-label={t("dateRange.preset", {label: displayLabel})} className="w-full">
            <SelectValue placeholder={t("dateRange.choose")} />
          </SelectTrigger>
          <SelectContent>
            {presets.map((preset) => (
              <SelectItem key={preset} value={preset}>
                {presetLabels[preset]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={id}
            className="w-full h-11 justify-start px-2.5 font-normal">
            <CalendarIcon className="mr-2 size-4" />
            {selected?.from ? (
              selected.to ? (
                <>
                  {displayDate(selected.from)} -{" "}
                  {displayDate(selected.to)}
                </>
              ) : (
                displayDate(selected.from)
              )
            ) : (
              <span>{t("dateRange.pick")}</span>
            )}
            <ChevronDownIcon className="ml-auto size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            mode="range"
            defaultMonth={selected?.from}
            selected={selected}
            onSelect={handleSelect}
            numberOfMonths={numberOfMonths}
            disabled={disableFuture ? { after: new Date() } : undefined}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}
