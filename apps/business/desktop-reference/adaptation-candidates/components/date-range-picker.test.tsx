import { describe, expect, it } from "vitest";
import { getDateRangePreset } from "@/components/date-range-utils";

describe("getDateRangePreset", () => {
  const reference = new Date("2026-09-08T15:30:00Z");

  it("maps today and the inclusive 7- and 30-day UTC periods", () => {
    expect(getDateRangePreset("today", reference)).toEqual({ from: "2026-09-08", to: "2026-09-08" });
    expect(getDateRangePreset("7", reference)).toEqual({ from: "2026-09-02", to: "2026-09-08" });
    expect(getDateRangePreset("30", reference)).toEqual({ from: "2026-08-10", to: "2026-09-08" });
  });

  it("starts this month at its first UTC date", () => {
    expect(getDateRangePreset("this_month", reference)).toEqual({ from: "2026-09-01", to: "2026-09-08" });
  });

  it("ends 7- and 30-day shortcuts at the selected UTC end date", () => {
    expect(getDateRangePreset("7", reference, "2026-09-05")).toEqual({ from: "2026-08-30", to: "2026-09-05" });
    expect(getDateRangePreset("30", reference, "2026-09-05")).toEqual({ from: "2026-08-07", to: "2026-09-05" });
  });
});
