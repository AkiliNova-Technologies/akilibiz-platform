import {describe,expect,it} from "vitest";
import {
  parsePreparedGoodsReceipt,preparedReceiptTotal,receiptLineTotal,
} from "./goods-receipt-draft-validation";

const base={
  id:"11111111-1111-4111-8111-111111111111",
  source_business_public_id:"desktop-a",
  purchase_order_id:8,
  receipt_number:"GR-2026-001",
  receipt_date:"2026-11-16",
  supplier_reference:null,
  due_date:null,
  lines:[{
    purchase_order_line_id:12,
    product_id:4,quantity_milli:1500,unit_cost_ugx:4000,
  }],
  supplier_vat:null,
};
const invoice={
  source_kind:"EFRIS_E_INVOICE",
  invoice_number:"EFRIS-001",
  invoice_date:"2026-11-16",
  evidence_reference:"supplier-document-001",
  supplier_tin:"1000123456",
  declared_vat_ugx:900,
  lines:[{product_id:4,classification_code:"STANDARD_RATED",tax_inclusive:true}],
};
describe("web goods receipt preparation",()=>{
  it("validates a whole-UGX delivery without inventing VAT",()=>{
    expect(parsePreparedGoodsReceipt(base)).toEqual(base);
    expect(receiptLineTotal(base.lines[0])).toBe(6000);
    expect(preparedReceiptTotal(base.lines)).toBe(6000);
    expect(parsePreparedGoodsReceipt(base)?.supplier_vat).toBeNull();
  });
  it("accepts documented VAT evidence but never computes tax from selling classification",()=>{
    expect(parsePreparedGoodsReceipt({...base,supplier_vat:invoice})?.supplier_vat)
      .toMatchObject(invoice);
  });
  it("rejects rounded UGX, duplicate lines, unsafe totals and mixed invoice products",()=>{
    expect(parsePreparedGoodsReceipt({...base,lines:[
      {...base.lines[0],quantity_milli:1001,unit_cost_ugx:1},
    ]})).toBeNull();
    expect(parsePreparedGoodsReceipt({...base,lines:[
      base.lines[0],base.lines[0],
    ]})).toBeNull();
    expect(parsePreparedGoodsReceipt({...base,supplier_vat:{
      ...invoice,lines:[{...invoice.lines[0],product_id:9}],
    }})).toBeNull();
    expect(preparedReceiptTotal([{...base.lines[0],
      quantity_milli:Number.MAX_SAFE_INTEGER,unit_cost_ugx:2000}])).toBeNull();
  });
  it("refuses fake statuses, extra fields, invalid dates, and invalid VAT evidence",()=>{
    expect(parsePreparedGoodsReceipt({...base,status:"posted"})).toBeNull();
    expect(parsePreparedGoodsReceipt({...base,receipt_date:"2026-02-30"})).toBeNull();
    expect(parsePreparedGoodsReceipt({...base,due_date:"2026-11-01"})).toBeNull();
    expect(parsePreparedGoodsReceipt({...base,supplier_vat:{
      ...invoice,source_kind:"UNKNOWN",
    }})).toBeNull();
    expect(parsePreparedGoodsReceipt({...base,supplier_vat:{
      ...invoice,declared_vat_ugx:-1,
    }})).toBeNull();
  });
});
