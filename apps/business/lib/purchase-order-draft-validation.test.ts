import {describe,expect,it} from "vitest";
import {parsePurchaseOrderDraft,purchaseOrderDraftTotal,purchaseOrderLineTotal} from "./purchase-order-draft-validation";

const draft={
  id:"11111111-1111-4111-8111-111111111111",
  po_number:"PO-2026-001",
  supplier_id:"22222222-2222-4222-8222-222222222222",
  source_business_public_id:"desktop-business-a",
  order_date:"2026-11-14",expected_delivery:"2026-11-17",notes:null,
  lines:[
    {product_id:"33333333-3333-4333-8333-333333333333",quantity_milli:1500,unit_price_ugx:4000},
    {product_id:"44444444-4444-4444-8444-444444444444",quantity_milli:2000,unit_price_ugx:5000},
  ],
};
describe("desktop-authoritative purchasing draft preparation",()=>{
  it("accepts two products and computes exact milliquantity totals",()=>{
    expect(parsePurchaseOrderDraft(draft)).toMatchObject(draft);
    expect(purchaseOrderDraftTotal(draft.lines)).toBe(16000);
    expect(purchaseOrderLineTotal(draft.lines[0])).toBe(6000);
  });
  it("refuses fraction-of-a-UGX prices and unsafe products",()=>{
    expect(purchaseOrderLineTotal({...draft.lines[0],quantity_milli:1001,unit_price_ugx:1})).toBeNull();
    expect(parsePurchaseOrderDraft({...draft,lines:[
      {...draft.lines[0],quantity_milli:1001,unit_price_ugx:1},
    ]})).toBeNull();
    expect(parsePurchaseOrderDraft({...draft,lines:[draft.lines[0],draft.lines[0]]})).toBeNull();
    expect(parsePurchaseOrderDraft({...draft,lines:[{...draft.lines[0],quantity_milli:-1}]})).toBeNull();
  });
  it("rejects changed fields, mismatched types, dates and missing source",()=>{
    expect(parsePurchaseOrderDraft({...draft,business_id:"attacker"})).toBeNull();
    expect(parsePurchaseOrderDraft({...draft,expected_delivery:"2026-11-01"})).toBeNull();
    expect(parsePurchaseOrderDraft({...draft,order_date:"2026-02-30"})).toBeNull();
    expect(parsePurchaseOrderDraft({...draft,source_business_public_id:""})).toBeNull();
    expect(parsePurchaseOrderDraft({...draft,notes:"x".repeat(2001)})).toBeNull();
  });
  it("rejects precision overflow instead of rounding or unsafe integer arithmetic",()=>{
    expect(purchaseOrderDraftTotal([{
      product_id:draft.lines[0].product_id,
      quantity_milli:Number.MAX_SAFE_INTEGER,unit_price_ugx:Number.MAX_SAFE_INTEGER,
    }])).toBeNull();
    expect(parsePurchaseOrderDraft({...draft,lines:[]})).toBeNull();
  });
});
