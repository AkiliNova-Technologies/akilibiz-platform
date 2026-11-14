import {describe,expect,it} from "vitest";
import {mapGoodsReceived} from "./reports-purchasing-data";
import type {FinancialMirrorRow} from "@/components/akilibiz/finance/financial-mirror-client";

const row:FinancialMirrorRow={
  localRecordId:18,localBusinessPublicId:"desktop-a",
  capturedAt:"2026-11-14T13:00:00Z",
  record:{
    receipt_number:"GR-18",receipt_date:"2026-11-14",
    supplier_id:3,purchase_order_id:7,
    total_amount_ugx:100000,tax_amount_ugx:18000,
    currency_code:"UGX",status:"posted",
  },
};
describe("goods received report from desktop ledger",()=>{
  it("maps exact receipt facts without inventing a supplier name or full purchase order",()=>{
    expect(mapGoodsReceived(row)).toEqual({
      id:18,receipt_number:"GR-18",receipt_date_utc:"2026-11-14",
      supplier_name:"Supplier #3",purchase_order_id:7,
      source_business_public_id:"desktop-a",
      status:"posted",reversal_status:"not_reversed",
      total_amount_ugx:100000,tax_amount_ugx:18000,currency_code:"UGX",
    });
  });
  it("preserves voided receipt evidence rather than dropping it",()=>{
    expect(mapGoodsReceived({...row,record:{...row.record,status:"voided"}}))
      .toMatchObject({status:"voided",reversal_status:"voided"});
  });
  it("rejects missing tax, fractional UGX, bad supplier and invalid currency",()=>{
    for(const altered of [
      {tax_amount_ugx:null},{total_amount_ugx:100000.5},
      {supplier_id:0},{currency_code:"USD"},{status:"draft"},
      {receipt_date:"invalid"},
    ]){
      expect(mapGoodsReceived({...row,record:{...row.record,...altered}})).toBeNull();
    }
  });
});
