import { describe, expect, it } from "vitest";
import { catalogueExportColumns, catalogueExportCsv } from "./catalogue-export";

describe("catalogue CSV export",()=>{
  it("restricts columns to the approved catalogue fields",()=>{
    expect(catalogueExportColumns("products")).toEqual([
      "name","sku","barcode","brand","stock_unit","selling_price_ugx",
      "cost_price_ugx","is_active","updated_at",
    ]);
    expect(catalogueExportColumns("categories")).toEqual([
      "name","slug","description","is_active","updated_at",
    ]);
    expect(catalogueExportColumns("products")).not.toContain("business_id");
  });
  it("escapes spreadsheet formulas and multiline values",()=>{
    const text=catalogueExportCsv("products",[{
      name:"=HYPERLINK(\"url\")",sku:"A,B",barcode:null,brand:"+CMD",
      stock_unit:"piece",selling_price_ugx:10000,cost_price_ugx:6000,
      is_active:true,updated_at:"2026-11-14T12:00:00Z",
      business_id:"not-for-export",
    }]);
    expect(text).toContain('"'=HYPERLINK(""url"")"');
    expect(text).toContain('"A,B"');
    expect(text).toContain('"'+CMD"');
    expect(text).not.toContain("not-for-export");
    expect(text.endsWith("\r\n")).toBe(true);
  });
  it("exports category names and leaves missing optional values empty",()=>{
    expect(catalogueExportCsv("categories",[{name:"Food",slug:"food",description:null,
      is_active:true,updated_at:"2026-11-14"}]))
      .toContain('"Food","food","","true","2026-11-14"');
  });
});
