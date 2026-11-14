import { describe,expect,it } from "vitest";
import { parseProductDraft } from "./product-draft-validation";

const valid={
  id:"11111111-1111-4111-8111-111111111111",
  name:" Kisenyi Flour ",sku:" FL-01 ",
  category_id:"22222222-2222-4222-8222-222222222222",
  barcode:null,brand:null,description:null,stock_unit:"kg",
  cost_price_ugx:3500,selling_price_ugx:4500,
};
describe("product preparation draft validation",()=>{
  it("normalizes values but never creates opening inventory",()=>{
    expect(parseProductDraft(valid)).toEqual({...valid,name:"Kisenyi Flour",sku:"FL-01"});
  });
  it("rejects forged business, staff, stock and tax fields",()=>{
    for(const key of ["business_id","created_by","stock_quantity","tax_classification_id","is_active"]){
      expect(parseProductDraft({...valid,[key]:1})).toBeNull();
    }
  });
  it("rejects invalid currencies, incomplete fields and invalid identities",()=>{
    expect(parseProductDraft({...valid,cost_price_ugx:12.5})).toBeNull();
    expect(parseProductDraft({...valid,selling_price_ugx:-2})).toBeNull();
    expect(parseProductDraft({...valid,name:"   "})).toBeNull();
    expect(parseProductDraft({...valid,category_id:"external-category"})).toBeNull();
    expect(parseProductDraft({...valid,id:"not-v4"})).toBeNull();
  });
  it("rejects control characters and overlong text",()=>{
    expect(parseProductDraft({...valid,sku:"SKU\u0000"})).toBeNull();
    expect(parseProductDraft({...valid,description:"x".repeat(3001)})).toBeNull();
    expect(parseProductDraft({...valid,name:"x".repeat(201)})).toBeNull();
  });
});
