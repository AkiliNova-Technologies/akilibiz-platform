import {describe,expect,it} from "vitest";
import {salesReportCsv} from "./sales-report-export";

describe("verified sales register CSV export",()=>{
  it("preserves exact UGX tender, zero due and cancellation facts",()=>{
    const csv=salesReportCsv([{
      sale_number:"INV-20261114121300-0500",
      sale_date_utc:"2026-11-14T12:13:00Z",
      customer_name:null,total_amount_ugx:37500,
      amount_paid_ugx:40000,balance_due_ugx:0,tax_amount_ugx:0,
      status:"completed",reversal_status:"none",
    }]);
    expect(csv).toContain('"37500","40000","0","0"');
    expect(csv).toContain("INV-20261114121300-0500");
    expect(csv.split("\r\n")).toHaveLength(3);
  });
  it("escapes commas, quotes and spreadsheet formula cells",()=>{
    const csv=salesReportCsv([{
      sale_number:'="unsafe"',sale_date_utc:"2026-11-14",
      customer_name:'Fresh, "Market"',total_amount_ugx:2000,
      amount_paid_ugx:2000,balance_due_ugx:0,
      tax_amount_ugx:0,status:"completed",reversal_status:"none",
    }]);
    expect(csv).toContain('"'=""unsafe"""');
    expect(csv).toContain('"Fresh, ""Market"""');
  });
});
