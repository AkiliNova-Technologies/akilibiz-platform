import { describe,expect,it } from "vitest";
import { indexLatestProductVatReviews, productVatReviewKey } from "./tax-review-matching";
import type { TaxEvidence } from "./tax-management-data";

const review=(source:string, productId:number, date:string):TaxEvidence=>({
  id:`${source}:${productId}:${date}`,
  localBusinessPublicId:source,productId,date,
  source:"Product VAT review",title:"STANDARD_RATED",detail:"VAT not included",
  status:"Confirmed",amountUgx:null,
});
describe("product VAT read model identity",()=>{
  it("does not attribute one desktop source's confirmation to another source's product",()=>{
    const records=indexLatestProductVatReviews([review("desktop-a",4,"2026-11-10")]);
    expect(records.get(productVatReviewKey("desktop-a",4))).toBeDefined();
    expect(records.get(productVatReviewKey("desktop-b",4))).toBeUndefined();
  });
  it("chooses the latest recorded review and never matches source-less evidence",()=>{
    const index=indexLatestProductVatReviews([
      review("desktop-a",4,"2026-11-09"),
      review("desktop-a",4,"2026-11-10"),
      {...review("desktop-a",7,"2026-11-10"),localBusinessPublicId:undefined},
    ]);
    expect(index.get(productVatReviewKey("desktop-a",4))?.date).toBe("2026-11-10");
    expect(index.has(productVatReviewKey("desktop-a",7))).toBe(false);
  });
});
