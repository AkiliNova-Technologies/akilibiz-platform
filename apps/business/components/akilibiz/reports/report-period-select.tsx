"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useI18n } from "@/components/akilibiz/i18n/i18n-provider";
export function ReportPeriodSelect({ id, selectedEndDate, onRangeChange }: { id: string; selectedEndDate: string; onRangeChange: (from: string, to: string) => void }) {
  const { t } = useI18n();
  const selectPeriod = (value: string) => {
    const end = selectedEndDate || new Date().toISOString().slice(0, 10);
    const endDate = new Date(`${end}T00:00:00Z`);
    const startDate = new Date(endDate);
    if (value === "week") startDate.setUTCDate(startDate.getUTCDate() - 6);
    if (value === "month") startDate.setUTCDate(startDate.getUTCDate() - 29);
    if (value === "quarter") startDate.setUTCDate(startDate.getUTCDate() - 89);
    onRangeChange(startDate.toISOString().slice(0, 10), end);
  };
  return <div className="grid gap-2"><Label htmlFor={id}>{t("reports.periodSelector")}</Label><Select onValueChange={selectPeriod}><SelectTrigger id={id} className="h-11"><SelectValue placeholder={t("reports.choosePeriod")} /></SelectTrigger><SelectContent><SelectItem value="week">{t("dateRange.last7")}</SelectItem><SelectItem value="month">{t("dateRange.last30")}</SelectItem><SelectItem value="quarter">Last 90 days</SelectItem></SelectContent></Select></div>;
}
