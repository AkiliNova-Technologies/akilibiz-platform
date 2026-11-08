export type DateRangePreset = "today" | "7" | "30" | "this_month";

export const dateRangePresetLabels: Record<DateRangePreset, string> = {
  today: "Today",
  "7": "Last 7 days",
  "30": "Last 30 days",
  this_month: "This month",
};

const utcIsoDate = (date: Date) => date.toISOString().slice(0, 10);

/** Returns inclusive UTC date boundaries, matching the reporting APIs. */
export function getDateRangePreset(
  preset: DateRangePreset,
  reference = new Date(),
  selectedEndDate?: string,
): { from: string; to: string } {
  const currentUtcDate = utcIsoDate(reference);
  const to = (preset === "7" || preset === "30") && selectedEndDate
    ? selectedEndDate
    : currentUtcDate;
  const start = new Date(`${to}T00:00:00Z`);
  if (preset === "today") return { from: to, to };
  if (preset === "this_month") {
    const currentMonthStart = new Date(`${currentUtcDate}T00:00:00Z`);
    currentMonthStart.setUTCDate(1);
    return { from: utcIsoDate(currentMonthStart), to: currentUtcDate };
  }
  start.setUTCDate(start.getUTCDate() - (preset === "7" ? 6 : 29));
  return { from: utcIsoDate(start), to };
}
