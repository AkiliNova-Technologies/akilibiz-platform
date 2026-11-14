import { describe, expect, it } from "vitest";
import { formatMilliStock, sourceProductKey, validateHostedMovement } from "./hosted-stock-movement-history";

const valid = {
  movement_id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  local_business_public_id:"desktop-A",
  local_product_id:5,
  source_movement_id:10,
  delta_milli:-1250,
  before_milli:5000,
  after_milli:3750,
  movement_type:"stock_out",
  reason:"Sale",
  notes:null,
  accepted_at:"2026-11-14T08:00:00Z",
  total_count:3,
};
describe("hosted stock movement read model",()=>{
  it("uses source and local ID together to avoid multi-desktop collisions",()=>{
    expect(sourceProductKey("A",1)).not.toBe(sourceProductKey("B",1));
    expect(sourceProductKey("A",1)).not.toBe(sourceProductKey("A",2));
  });
  it("requires safe exact quantity arithmetic",()=>{
    expect(validateHostedMovement(valid)).toBe(true);
    expect(validateHostedMovement({...valid,after_milli:3751})).toBe(false);
    expect(validateHostedMovement({...valid,before_milli:Number.MAX_SAFE_INTEGER+1})).toBe(false);
    expect(validateHostedMovement({...valid,accepted_at:"not-a-date"})).toBe(false);
  });
  it("formats milli quantities without rounding to an integer",()=>{
    expect(formatMilliStock(1250)).toBe("1.25");
    expect(formatMilliStock(-500)).toBe("-0.5");
  });
});
