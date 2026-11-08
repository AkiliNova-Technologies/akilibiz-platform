"use client";

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ReportPeriodSelect({ id, selectedEndDate, onRangeChange }: { id: string; selectedEndDate: string; onRangeChange: (from: string, to: string) => void }) {
  const selectPeriod = (value: string) => {
    const end = selectedEndDate || new Date().toISOString().slice(0, 10);
    const endDate = new Date(`${end}T00:00:00Z`);
    const startDate = new Date(endDate);
    if (value === "week") startDate.setUTCDate(startDate.getUTCDate() - 6);
    if (value === "month") startDate.setUTCDate(startDate.getUTCDate() - 29);
    if (value === "quarter") startDate.setUTCDate(startDate.getUTCDate() - 89);
    onRangeChange(startDate.toISOString().slice(0, 10), end);
  };
  return <div className="grid gap-2"><Label htmlFor={id}>Report period</Label><Select onValueChange={selectPeriod}><SelectTrigger id={id} className="h-11"><SelectValue placeholder="Choose a period" /></SelectTrigger><SelectContent><SelectItem value="week">Last 7 days</SelectItem><SelectItem value="month">Last 30 days</SelectItem><SelectItem value="quarter">Last 90 days</SelectItem></SelectContent></Select></div>;
}
