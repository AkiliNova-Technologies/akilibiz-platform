import {describe,expect,it} from "vitest";
import {
  mapPurchaseOrderLines,mapPurchaseOrderReceipts,verifyOrderLinesTotal,
} from "./purchase-order-detail";
import type {FinancialMirrorRow} from "@/components/akilibiz/finance/financial-mirror-client";

const order={id:7,localBusinessPublicId:"desktop-a"};
const line=(overrides:Record<string,unknown>={},source="desktop-a"):FinancialMirrorRow=>({
  localRecordId:12,localBusinessPublicId:source,
  capturedAt:"2026-11-14T12:00:00Z",
  record:{
    purchase_order_id:7,product_id:4,quantity_milli:1500,
    received_quantity_milli:500,unit_price_ugx:4000,
    line_total_ugx:6000,stock_unit_snapshot:"kg",currency_code:"UGX",
    ...overrides,
  },
});
const receipt=(overrides:Record<string,unknown>={},source="desktop-a"):FinancialMirrorRow=>({
  localRecordId:16,localBusinessPublicId:source,
  capturedAt:"2026-11-14T12:00:00Z",
  record:{
    purchase_order_id:7,receipt_number:"GR-16",receipt_date:"2026-11-14",
    total_amount_ugx:6000,status:"posted",currency_code:"UGX",
    ...overrides,
  },
});

describe("source-scoped desktop purchasing detail",()=>{
  it("includes only the same order and same desktop business",()=>{
    const lines=mapPurchaseOrderLines(order,[
      line(),line({purchase_order_id:8}),line({},"desktop-b"),
    ]);
    expect(lines).toEqual([{
      id:12,product_id:4,ordered_quantity_milli:1500,
      received_quantity_milli:500,unit_price_ugx:4000,
      line_total_ugx:6000,stock_unit:"kg",
    }]);
    expect(verifyOrderLinesTotal(6000,lines)).toBe(true);
    expect(verifyOrderLinesTotal(6001,lines)).toBe(false);
    expect(verifyOrderLinesTotal(0,[])).toBe(false);
  });
  it("rejects invalid received stock and inaccurate exact UGX amounts",()=>{
    for(const bad of [
      {received_quantity_milli:1501},
      {received_quantity_milli:-1},
      {quantity_milli:0},
      {unit_price_ugx:4001},
      {line_total_ugx:6001},
      {currency_code:"USD"},
    ]){
      expect(()=>mapPurchaseOrderLines(order,[line(bad)])).toThrow();
    }
  });
  it("returns only linked posted or voided goods receipts",()=>{
    expect(mapPurchaseOrderReceipts(order,[
      receipt(),receipt({purchase_order_id:8}),receipt({},"desktop-b"),
    ])).toEqual([{
      id:16,receipt_number:"GR-16",receipt_date:"2026-11-14",
      status:"posted",total_amount_ugx:6000,
    }]);
    expect(mapPurchaseOrderReceipts(order,[receipt({status:"voided"})])[0].status).toBe("voided");
  });
  it("rejects malformed linked receipts and duplicate local identities",()=>{
    for(const bad of [
      {total_amount_ugx:-1},{status:"pending"},
      {receipt_date:"invalid"},{receipt_number:""},
      {currency_code:"USD"},
    ])expect(()=>mapPurchaseOrderReceipts(order,[receipt(bad)])).toThrow();
    expect(()=>mapPurchaseOrderLines(order,[line(),line()])).toThrow();
    expect(()=>mapPurchaseOrderReceipts(order,[receipt(),receipt()])).toThrow();
  });
});
