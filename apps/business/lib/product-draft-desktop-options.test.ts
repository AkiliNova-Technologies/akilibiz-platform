import { describe, expect, it } from "vitest";
import { DEFAULT_PRODUCT_OPTIONS, parseDesktopProductOptions, parseProductDraft } from "./product-draft-validation";

const valid = {
  ...DEFAULT_PRODUCT_OPTIONS,
  product_type:"stock_item" as const, inventory_type:"count" as const,
  sales_unit:"pcs",purchase_unit:"carton",unit_conversion_factor:12,
  min_stock_level:2,max_stock_level:100,
  package_content_quantity:500,package_content_unit:"g",
};
const draft={
  id:"11111111-1111-4111-8111-111111111111",
  name:"Rice",sku:"RICE-01",category_id:"22222222-2222-4222-8222-222222222222",
  barcode:null,brand:null,description:null,stock_unit:"kg",
  cost_price_ugx:5000,selling_price_ugx:7000,desktop_options:valid,
};
describe("desktop-compatible product draft options",()=>{
  it("accepts a complete exact set of desktop units and stock settings",()=>{
    expect(parseDesktopProductOptions(valid)).toEqual(valid);
    expect(parseProductDraft(draft)?.desktop_options).toEqual(valid);
  });
  it("rejects invalid product or inventory types",()=>{
    expect(parseDesktopProductOptions({...valid,product_type:"unknown"})).toBeNull();
    expect(parseDesktopProductOptions({...valid,inventory_type:"pieces"})).toBeNull();
  });
  it("rejects malformed conversion factors and stock thresholds",()=>{
    expect(parseDesktopProductOptions({...valid,unit_conversion_factor:0})).toBeNull();
    expect(parseDesktopProductOptions({...valid,max_stock_level:1})).toBeNull();
    expect(parseDesktopProductOptions({...valid,min_stock_level:Infinity})).toBeNull();
  });
  it("requires package content and the unit together",()=>{
    expect(parseDesktopProductOptions({...valid,package_content_unit:null})).toBeNull();
    expect(parseDesktopProductOptions({...valid,package_content_quantity:null})).toBeNull();
    expect(parseDesktopProductOptions({...valid,package_content_unit:"bottle"})).toBeNull();
    expect(parseDesktopProductOptions({...valid,package_content_quantity:null,package_content_unit:null})).not.toBeNull();
  });
  it("rejects unknown financial, identity or tax fields in options",()=>{
    expect(parseDesktopProductOptions({...valid,category_id:99})).toBeNull();
    expect(parseProductDraft({...draft,desktop_options:{...valid,stock_quantity:100}})).toBeNull();
    expect(parseDesktopProductOptions({...valid,tax_classification_id:5})).toBeNull();
  });
  it("keeps older drafts valid until their extra details are supplied",()=>{
    const {desktop_options:unused,...old}=draft;
    expect(parseProductDraft(old)).not.toBeNull();
  });
});
