import { describe,expect,it } from "vitest";
import type { FinancialMirrorRow } from "@/components/akilibiz/finance/financial-mirror-client";
import { mapAccountingPeriod } from "../settings/accounting-periods-data";
import { mapHostedJournalReports } from "./reports-financial-data";

const row=(id:number,record:Record<string,unknown>):FinancialMirrorRow=>({
  localRecordId:id,record,capturedAt:"2026-11-11T00:00:00Z",
});
describe("synchronized accounting period",()=>{
  it("keeps an open-ended accounting period without mutating its source date",()=>{
    expect(mapAccountingPeriod(row(1,{
      date_from:"2026-09-24",date_to:"9999-12-31",state:"open",
      created_at:"2026-09-24T10:00:00Z",
    }))).toMatchObject({id:"1",dateTo:"9999-12-31",state:"open"});
  });
  it("rejects an invalid close timestamp or dates",()=>{
    expect(mapAccountingPeriod(row(1,{
      date_from:"2026-01-01",date_to:"2026-12-31",state:"closed",
      closed_at:null,
    }))).toBeNull();
    expect(mapAccountingPeriod(row(2,{
      date_from:"2026-12-31",date_to:"2026-01-01",state:"open",
    }))).toBeNull();
  });
});
const accounts=[row(1,{code:"100",name:"Cash"}),row(2,{code:"400",name:"Sales"})];
const journal=[row(9,{status:"posted",entry_date:"2026-11-10",journal_number:"JR-9"})];
const lines=[
  row(21,{journal_entry_id:9,account_id:1,debit_ugx:2500,credit_ugx:0}),
  row(22,{journal_entry_id:9,account_id:2,debit_ugx:0,credit_ugx:2500}),
];
describe("journal mirror integration",()=>{
  it("produces balanced trial accounts only from fully matched posted lines",()=>{
    const mapped=mapHostedJournalReports(accounts,journal,lines);
    expect(mapped.journals).toHaveLength(2);
    expect(mapped.trial).toHaveLength(2);
    expect(mapped.summary).toEqual({
      total_debit_ugx:2500,total_credit_ugx:2500,balances_equal:true,
    });
  });
  it("fails closed for missing accounts, unbalanced journals and negative money",()=>{
    expect(()=>mapHostedJournalReports(accounts,journal,lines.slice(0,1))).toThrow();
    expect(()=>mapHostedJournalReports(accounts.slice(0,1),journal,lines)).toThrow();
    expect(()=>mapHostedJournalReports(accounts,journal,[
      lines[0],row(22,{journal_entry_id:9,account_id:2,debit_ugx:0,credit_ugx:-1}),
    ])).toThrow();
  });
});
