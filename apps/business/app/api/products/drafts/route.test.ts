import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import { NextRequest } from "next/server";

const mocks=vi.hoisted(()=>({
  createClient:vi.fn(),
  requireActiveBusiness:vi.fn(),
}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.createClient}));
vi.mock("@/lib/business-context",()=>({requireActiveBusiness:mocks.requireActiveBusiness}));
import { POST,DELETE,GET } from "./route";

const draft={
  id:"11111111-1111-4111-8111-111111111111",
  name:"Matooke",sku:"MAT-001",
  category_id:"22222222-2222-4222-8222-222222222222",
  barcode:null,brand:null,description:null,stock_unit:"bunch",
  cost_price_ugx:10000,selling_price_ugx:15000,
};
const submit=(body:unknown)=>new NextRequest("http://localhost/api/products/drafts",{
  method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),
});
function setup(options:{role?:string;signedIn?:boolean;category?:boolean}={}) {
  const role=options.role??"owner";
  mocks.requireActiveBusiness.mockResolvedValue({id:"tenant-a",role});
  const writes=vi.fn();
  const rpc=vi.fn().mockResolvedValue({data:[],error:null});
  const categoryQuery={
    select:vi.fn(),eq:vi.fn(),maybeSingle:vi.fn(),order:vi.fn(),range:vi.fn(),
  };
  categoryQuery.select.mockReturnValue(categoryQuery);
  categoryQuery.eq.mockReturnValue(categoryQuery);
  categoryQuery.order.mockReturnValue(categoryQuery);
  categoryQuery.range.mockResolvedValue({data:[],count:0,error:null});
  categoryQuery.maybeSingle.mockResolvedValue({
    data:options.category===false?null:{id:draft.category_id,local_business_public_id:"desktop-a"},
    error:null,
  });
  const writeQuery={
    select:vi.fn(),single:vi.fn(),
  };
  writeQuery.select.mockReturnValue(writeQuery);
  writeQuery.single.mockResolvedValue({
    data:{id:draft.id,updated_at:"2026-11-14T13:00:00Z"},error:null,
  });
  const draftSelect={select:vi.fn(),eq:vi.fn(),order:vi.fn(),range:vi.fn(),delete:vi.fn()};
  draftSelect.select.mockReturnValue(draftSelect);
  draftSelect.eq.mockReturnValue(draftSelect);
  draftSelect.order.mockReturnValue(draftSelect);
  draftSelect.range.mockResolvedValue({data:[],count:0,error:null});
  draftSelect.delete.mockReturnValue(draftSelect);
  const draftTable={...draftSelect,upsert:writes};
  const tables={
    desktop_categories:categoryQuery,
    web_product_drafts:draftTable,
  };
  writes.mockReturnValue(writeQuery);
  const from=vi.fn((table:string)=>tables[table as keyof typeof tables]);
  mocks.createClient.mockResolvedValue({
    auth:{getUser:vi.fn().mockResolvedValue({
      data:{user:options.signedIn===false?null:{id:"actor-a"}},error:null,
    })},
    from,rpc,
  });
  return {from,categoryQuery,writes,draftSelect,rpc};
}
describe("product draft API constraints",()=>{
  afterEach(()=>vi.unstubAllEnvs());
  beforeEach(()=>{
    vi.clearAllMocks();
    vi.stubEnv("AKILIBIZ_ENABLE_WEB_PRODUCT_DRAFTS","1");
  });
  it("denies draft access when the independent feature gate is off",async()=>{
    vi.stubEnv("AKILIBIZ_ENABLE_WEB_PRODUCT_DRAFTS","0");
    const client=setup();
    expect((await GET()).status).toBe(503);
    expect((await POST(submit(draft))).status).toBe(503);
    expect(client.from).not.toHaveBeenCalled();
  });
  it("rejects unauthenticated and unauthorized users before writing",async()=>{
    const unauth=setup({signedIn:false});
    expect((await POST(submit(draft))).status).toBe(401);
    expect(unauth.writes).not.toHaveBeenCalled();
    const cashier=setup({role:"cashier"});
    expect((await POST(submit(draft))).status).toBe(403);
    expect(cashier.writes).not.toHaveBeenCalled();
  });
  it("rejects forged identity and financial fields",async()=>{
    const client=setup();
    expect((await POST(submit({...draft,business_id:"other"}))).status).toBe(400);
    expect((await POST(submit({...draft,stock_quantity:999}))).status).toBe(400);
    expect(client.writes).not.toHaveBeenCalled();
  });
  it("rejects a category outside the active business",async()=>{
    const client=setup({category:false});
    expect((await POST(submit(draft))).status).toBe(409);
    expect(client.categoryQuery.eq).toHaveBeenCalledWith("business_id","tenant-a");
    expect(client.writes).not.toHaveBeenCalled();
  });
  it("writes only a business- and actor-scoped draft with no product mutation",async()=>{
    const client=setup();
    const response=await POST(submit(draft));
    expect(response.status).toBe(200);
    expect(client.writes).toHaveBeenCalledWith({
      ...draft,business_id:"tenant-a",created_by:"actor-a",
    },{onConflict:"id"});
    expect(client.from).not.toHaveBeenCalledWith("desktop_products");
    expect(await response.json()).toMatchObject({id:draft.id,state:"draft"});
  });
  it("stores approved desktop product preparation options without publishing",async()=>{
    const client=setup();
    const options={
      product_type:"stock_item", inventory_type:"count", sales_unit:"pcs",
      purchase_unit:"carton",unit_conversion_factor:12,
      min_stock_level:1,max_stock_level:40,
      allow_decimal_quantity:false,allow_negative_stock:false,
      track_expiry:false,track_batches:true,tax_inclusive:false,
      package_content_quantity:null,package_content_unit:null,
    };
    const response=await POST(submit({...draft,desktop_options:options}));
    expect(response.status).toBe(200);
    expect(client.writes).toHaveBeenCalledWith({
      ...draft,desktop_options:options,business_id:"tenant-a",created_by:"actor-a",
    },{onConflict:"id"});
    expect(client.from).not.toHaveBeenCalledWith("desktop_products");
  });
  it("explains a frozen publication draft conflict without retrying an unsafe write",async()=>{
    const client=setup();
    const writeChain={select:vi.fn(),single:vi.fn()};
    writeChain.select.mockReturnValue(writeChain);
    writeChain.single.mockResolvedValue({data:null,error:{code:"55000"}});
    client.writes.mockReturnValue(writeChain);
    const response=await POST(submit(draft));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toContain("already been sent");
    expect(client.writes).toHaveBeenCalledTimes(1);
  });
  it("rejects malformed draft deletion before touching tables",async()=>{
    const client=setup();
    const result=await DELETE(new NextRequest("http://localhost/api/products/drafts?id=invalid",{method:"DELETE"}));
    expect(result.status).toBe(400);
    expect(client.from).not.toHaveBeenCalled();
  });
  it("recovers submitted draft requests from the hosted source, not local storage",async()=>{
    vi.stubEnv("AKILIBIZ_ENABLE_PRODUCT_CREATE_REQUESTS","1");
    const client=setup();
    const command_id="33333333-3333-4333-8333-333333333333";
    client.rpc.mockResolvedValue({data:[{
      command_id,draft_id:draft.id,state:"applied",requested_at:"2026-11-14T15:00:00Z",
    }],error:null});
    const response=await GET();
    expect(response.status).toBe(200);
    expect(client.rpc).toHaveBeenCalledWith("list_desktop_product_create_statuses",{
      target_business_id:"tenant-a",
    });
    expect(await response.json()).toMatchObject({
      publicationRequestsEnabled:true,
      publicationRequests:[{command_id,draft_id:draft.id,state:"applied"}],
    });
  });
  it("fails closed if the existing publication state cannot be verified",async()=>{
    vi.stubEnv("AKILIBIZ_ENABLE_PRODUCT_CREATE_REQUESTS","1");
    const client=setup();
    client.rpc.mockResolvedValue({data:null,error:{code:"42883"}});
    const response=await GET();
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("Could not confirm");
  });
  it("never fetches request status for a manager or with publication disabled",async()=>{
    vi.stubEnv("AKILIBIZ_ENABLE_PRODUCT_CREATE_REQUESTS","1");
    const manager=setup({role:"manager"});
    expect((await GET()).status).toBe(200);
    expect(manager.rpc).not.toHaveBeenCalled();
    vi.stubEnv("AKILIBIZ_ENABLE_PRODUCT_CREATE_REQUESTS","0");
    const owner=setup();
    expect((await GET()).status).toBe(200);
    expect(owner.rpc).not.toHaveBeenCalled();
  });
  it("loads drafts only for the selected business and the signed-in owner",async()=>{
    const client=setup();
    const result=await GET();
    expect(result.status).toBe(200);
    expect(client.draftSelect.eq).toHaveBeenCalledWith("business_id","tenant-a");
    expect(client.draftSelect.eq).toHaveBeenCalledWith("created_by","actor-a");
  });
});
