import { describe, expect, it } from "vitest";
import { csvSafeCell, exportColumns, formatContactExport } from "./contact-export";

describe("contact CSV export", () => {
  it("exports only approved columns", () => {
    expect(exportColumns("customers")).toEqual([
      "name", "email", "phone", "address", "customer_type",
      "loyalty_points", "is_active", "updated_at",
    ]);
    expect(exportColumns("suppliers")).toContain("payment_terms");
    expect(exportColumns("customers")).not.toContain("business_id");
  });

  it("quotes embedded commas, line breaks and quotation marks", () => {
    expect(csvSafeCell('A, "quoted"\ncontact')).toBe('"A, ""quoted""\ncontact"');
    expect(csvSafeCell(null)).toBe('""');
  });

  it("prevents formula interpretation when opened in a spreadsheet", () => {
    for (const value of ["=1+1", "+cmd", "-2", "@evil", "  =SUM(A1)", "\t+cmd"]) {
      expect(csvSafeCell(value)).toBe(`"'${value}"`);
    }
    expect(csvSafeCell("Normal shop")).toBe('"Normal shop"');
  });

  it("exports a stable ordered header and encoded cells", () => {
    const result = formatContactExport("customers", [{
      name: "A,B", email: null, phone: "+256700000000", address: "Kampala",
      customer_type: "retail", loyalty_points: 2, is_active: true,
      updated_at: "2026-11-14",
      business_id: "must-not-export",
    }]);
    expect(result).toContain('"name","email","phone","address"');
    expect(result).toContain('"A,B","",');
    expect(result).not.toContain("must-not-export");
    expect(result.endsWith("\r\n")).toBe(true);
  });
});
