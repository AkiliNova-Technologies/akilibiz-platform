import { getDateRangePreset, type DateRangePreset } from "@/components/date-range-utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const options: Array<{ value: DateRangePreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7", label: "Last 7 UTC days" },
  { value: "30", label: "Last 30 UTC days" },
  { value: "this_month", label: "This month" },
];

export function ReportPeriodSelect({
  id,
  selectedEndDate,
  onRangeChange,
}: {
  id: string;
  selectedEndDate?: string;
  onRangeChange: (from: string, to: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Report period</Label>
      <Select onValueChange={(value) => {
        const range = getDateRangePreset(value as DateRangePreset, new Date(), selectedEndDate);
        onRangeChange(range.from, range.to);
      }}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Choose a period" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
