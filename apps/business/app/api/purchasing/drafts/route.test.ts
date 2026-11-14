import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const mocks=vi.hoisted(()=>({createClient:vi.fn(),requireActiveBusiness:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.createClient}));
vi.mock("@/lib/business-context",()=>({requireActiveBusiness:mocks.requireActiveBusiness}));
import {GET,POST,DELETE} from "./route";

const draft={
  id:"11111111-1111-4111-8111-111111111111",
  po_number:"PO-17",supplier_id:"22222222-2222-4222-8222-222222222222",
  source_business_public_id:"desktop-a",order_date:"2026-11-14",
  expected_delivery:null,notes:null,
  lines:[{product_id:"33333333-3333-4333-8333-333333333333",
    quantity_milli:1500,unit_price_ugx:4000}],
};
const submit=(payload:unknown)=>new NextRequest("http://localhost/api/purchasing/drafts",{
  method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),
});
function setup(options:{role?:string;signedIn?:boolean;source?:string}={}){
  mocks.requireActiveBusiness.mockResolvedValue({id:"business-a",role:options.role??"owner"});
  const source=options.source??"desktop-a";
  const supplierQuery={select:vi.fn(),eq:vi.fn(),maybeSingle:vi.fn(),order:vi.fn(),range:vi.fn()};
  supplierQuery.select.mockReturnValue(supplierQuery);
  supplierQuery.eq.mockReturnValue(supplierQuery);
  supplierQuery.order.mockReturnValue(supplierQuery);
  supplierQuery.maybeSingle.mockResolvedValue({data:{id:draft.supplier_id,local_business_public_id:source},error:null});
  supplierQuery.range.mockResolvedValue({data:[],count:0,error:null});
  const productQuery={select:vi.fn(),eq:vi.fn(),in:vi.fn(),order:vi.fn(),range:vi.fn()};
  productQuery.select.mockReturnValue(productQuery);
  productQuery.eq.mockReturnValue(productQuery);
  productQuery.in.mockResolvedValue({data:[{id:draft.lines[0].product_id,local_business_public_id:source}],error:null});
  productQuery.order.mockReturnValue(productQuery);
  productQuery.range.mockResolvedValue({data:[],count:0,error:null});
  const writeResult={select:vi.fn(),single:vi.fn()};
  writeResult.select.mockReturnValue(writeResult);
  writeResult.single.mockResolvedValue({data:{id:draft.id,updated_at:"2026-11-14T12:00:00Z"},error:null});
  const draftQuery={select:vi.fn(),eq:vi.fn(),order:vi.fn(),range:vi.fn(),delete:vi.fn()};
  draftQuery.select.mockReturnValue(draftQuery);
  draftQuery.eq.mockReturnValue(draftQuery);
  draftQuery.order.mockReturnValue(draftQuery);
  draftQuery.range.mockResolvedValue({data:[],count:0,error:null});
  draftQuery.delete.mockReturnValue(draftQuery);
  const upsert=vi.fn().mockReturnValue(writeResult);
  const from=vi.fn((table:string)=>table==="desktop_suppliers"?supplierQuery:
    table==="desktop_products"?productQuery:{...draftQuery,upsert});
  mocks.createClient.mockResolvedValue({
    auth:{getUser:vi.fn().mockResolvedValue({
      data:{user:options.signedIn===false?null:{id:"actor-a"}},error:null,
    })},from,
  });
  return {from,upsert,supplierQuery,productQuery};
}
describe("purchase-order preparation API",()=>{
  beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("AKILIBIZ_ENABLE_WEB_PURCHASE_ORDER_DRAFTS","1");});
  afterEach(()=>vi.unstubAllEnvs());
  it("fails closed when the independent web draft gate is off",async()=>{
    vi.stubEnv("AKILIBIZ_ENABLE_WEB_PURCHASE_ORDER_DRAFTS","0");
    const s=setup();
    expect((await GET()).status).toBe(503);
    expect((await POST(submit(draft))).status).toBe(503);
    expect(s.from).not.toHaveBeenCalled();
  });
  it("requires an authenticated owner or manager",async()=>{
    setup({signedIn:false});
    expect((await POST(submit(draft))).status).toBe(401);
    const s=setup({role:"cashier"});
    expect((await POST(submit(draft))).status).toBe(403);
    expect(s.upsert).not.toHaveBeenCalled();
  });
  it("rejects injected stock, payable or business identity fields",async()=>{
    const s=setup();
    for(const altered of [{business_id:"other"},{status:"Received"},{stock_movement:500}]){
      expect((await POST(submit({...draft,...altered}))).status).toBe(400);
    }
    expect(s.upsert).not.toHaveBeenCalled();
  });
  it("rejects a supplier or product from another desktop source",async()=>{
    const s=setup({source:"desktop-b"});
    expect((await POST(submit(draft))).status).toBe(409);
    expect(s.upsert).not.toHaveBeenCalled();
  });
  it("persists only a scoped non-posting draft and returns exact UGX",async()=>{
    const s=setup();
    const result=await POST(submit(draft));
    expect(result.status).toBe(200);
    expect(s.upsert).toHaveBeenCalledWith({
      ...draft,business_id:"business-a",created_by:"actor-a",
    },{onConflict:"id"});
    expect(await result.json()).toMatchObject({state:"draft",totalUgx:6000});
    expect(s.from).not.toHaveBeenCalledWith("goods_receipts");
    expect(s.from).not.toHaveBeenCalledWith("supplier_payables");
    expect(s.from).not.toHaveBeenCalledWith("stock_movements");
  });
  it("rejects malformed discard IDs before querying any table",async()=>{
    const s=setup();
    const response=await DELETE(new NextRequest("http://localhost/api/purchasing/drafts?id=wrong"));
    expect(response.status).toBe(400);
    expect(s.from).not.toHaveBeenCalled();
  });
});
