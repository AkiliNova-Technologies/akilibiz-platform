import { describe,expect,it } from "vitest";
import { mapHostedStockReport, type HostedStockPosition } from "./hosted-inventory-report";
const products=[
 {id:"one",local_product_id:8,name:"Rice",sku:"RIC",stock_unit:"kg",category_id:"cat",
  is_active:true,selling_price_ugx:4500,cost_price_ugx:3100},
 {id:"two",local_product_id:9,name:"Beans",sku:"BEA",stock_unit:"kg",category_id:"cat",
  is_active:true,selling_price_ugx:5000,cost_price_ugx:3500},
];
const categories=[{id:"cat",local_category_id:1,name:"Grains"}];
const position=(product_id:string,on_hand_milli:number|null):HostedStockPosition=>({
 product_id,on_hand_milli,reserved_milli:500,damaged_milli:0,
 minimum_milli:1000,maximum_milli:10000,is_current:true,snapshot_at:"2026-11-10T00:00:00Z",
});
describe("read-only hosted stock mapper",()=>{
 it("keeps on-hand distinct from sellable and handles reserved inventory",()=>{
   expect(mapHostedStockReport(products,categories,[position("one",3000)])).toMatchObject({
     skipped:0,rows:[{id:8,on_hand_milli:3000,available_milli:2500,stock_status:"In stock"}],
   });
 });
 it("reports unknown stock without claiming it is out of stock",()=>{
   expect(mapHostedStockReport(products,categories,[position("one",3000),position("two",null)])).toMatchObject({
     skipped:1,rows:[{id:8}],
   });
 });
 it("rejects conflicting current inventory positions",()=>{
   expect(()=>mapHostedStockReport(products,categories,[position("one",2000),position("one",3000)])).toThrow();
 });
});
