import {describe,expect,it} from "vitest";
import {dateWithinRange,verifiedSalePaymentOutcome} from "./sales-report-validation";
import type {FinancialMirrorRow} from "@/components/akilibiz/finance/financial-mirror-client";

const sale={total_amount:37500,payment_method:"cash" as const};
const source=(record:Record<string,unknown>):FinancialMirrorRow=>({
  localRecordId:3,localBusinessPublicId:"desktop-a",
  capturedAt:"2026-11-14T13:00:00Z",record,
});

describe("sales report payment and period contract",()=>{
  it("reads the two real-world historical cash-overpayment shapes as zero debt",()=>{
    const examples=[
      {total:37500,paid:40000,change:2500,balance:-2500},
      {total:191500,paid:200000,change:8500,balance:-8500},
    ];
    for(const example of examples){
      expect(verifiedSalePaymentOutcome(
        {total_amount:example.total,payment_method:"cash"},
        source({amount_paid_ugx:example.paid,change_amount_ugx:example.change,
          balance_due_ugx:example.balance}),
      )).toEqual({paid:example.paid,change:example.change,balance:0});
    }
  });
  it("accepts exact tender and credit balances without inventing change",()=>{
    expect(verifiedSalePaymentOutcome(sale,source({
      amount_paid_ugx:37500,balance_due_ugx:0,
    }))).toEqual({paid:37500,change:0,balance:0});
    expect(verifiedSalePaymentOutcome(sale,source({
      amount_paid_ugx:20000,balance_due_ugx:17500,
    }))).toEqual({paid:20000,change:0,balance:17500});
  });
  it("rejects mismatched change, forged negative debt and noncash overpayment",()=>{
    expect(verifiedSalePaymentOutcome(sale,source({
      amount_paid_ugx:40000,change_amount_ugx:2400,balance_due_ugx:-2500,
    }))).toBeNull();
    expect(verifiedSalePaymentOutcome(sale,source({
      amount_paid_ugx:40000,change_amount_ugx:2500,balance_due_ugx:-3000,
    }))).toBeNull();
    expect(verifiedSalePaymentOutcome({...sale,payment_method:"mobile_money"},source({
      amount_paid_ugx:40000,change_amount_ugx:2500,balance_due_ugx:-2500,
    }))).toBeNull();
    expect(verifiedSalePaymentOutcome(sale,source({
      amount_paid_ugx:40000,balance_due_ugx:-2500,
    }))).toBeNull();
  });
  it("includes entire selected UTC date and excludes outside dates",()=>{
    expect(dateWithinRange("2026-11-14T23:59:59Z","2026-11-14","2026-11-14")).toBe(true);
    expect(dateWithinRange("2026-11-15T00:00:00Z","2026-11-14","2026-11-14")).toBe(false);
    expect(dateWithinRange("2026-11-13T23:59:59Z","2026-11-14","2026-11-14")).toBe(false);
    expect(dateWithinRange("2026-11-14T13:00:00Z","2026-11-14")).toBe(true);
  });
});
