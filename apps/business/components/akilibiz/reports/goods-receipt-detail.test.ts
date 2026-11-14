import {describe,expect,it} from "vitest";
import {verifyGoodsReceiptLines} from "./goods-receipt-detail";
import type {FinancialMirrorRow} from "@/components/akilibiz/finance/financial-mirror-client";

const receipt={id:18,source_business_public_id:"desktop-a",total_amount_ugx:6000};
const row=(changes:Record<string,unknown>={},source="desktop-a"):FinancialMirrorRow=>({
  localRecordId:26,localBusinessPublicId:source,
  capturedAt:"2026-11-14T12:00:00Z",
  record:{
    goods_receipt_id:18,product_id:4,quantity_milli:1500,
    unit_cost_ugx:4000,line_total_ugx:6000,
    purchase_order_line_id:12,currency_code:"UGX",...changes,
  },
});
describe("exact goods receipt detail",()=>{
  it("requires matching receipt and desktop source and exact whole UGX",()=>{
    expect(verifyGoodsReceiptLines(receipt,[
      row(),row({goods_receipt_id:19}),row({},"desktop-b"),
    ])).toEqual([{
      id:26,product_id:4,quantity_milli:1500,unit_cost_ugx:4000,
      line_total_ugx:6000,purchase_order_line_id:12,
    }]);
  });
  it("rejects missing, partial, inconsistent or duplicate ledger lines",()=>{
    expect(()=>verifyGoodsReceiptLines(receipt,[])).toThrow("not synchronized");
    expect(()=>verifyGoodsReceiptLines({...receipt,total_amount_ugx:6500},[row()])).toThrow("do not match");
    for(const changes of [
      {quantity_milli:0},{unit_cost_ugx:-1},{line_total_ugx:5900},
      {currency_code:"USD"},{purchase_order_line_id:0},
    ])expect(()=>verifyGoodsReceiptLines(receipt,[row(changes)])).toThrow();
    expect(()=>verifyGoodsReceiptLines(receipt,[row(),row()])).toThrow();
  });
});
