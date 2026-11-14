import { beforeEach,describe,expect,it,vi } from "vitest";
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
  const categoryQuery={
    select:vi.fn(),eq:vi.fn(),maybeSingle:vi.fn(),
  };
  categoryQuery.select.mockReturnValue(categoryQuery);
  categoryQuery.eq.mockReturnValue(categoryQuery);
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
  const tables={
    desktop_categories:categoryQuery,
    web_product_drafts:{upsert:writes},
  };
  writes.mockReturnValue(writeQuery);
  const from=vi.fn((table:string)=>tables[table as keyof typeof tables]);
  mocks.createClient.mockResolvedValue({
    auth:{getUser:vi.fn().mockResolvedValue({
      data:{user:options.signedIn===false?null:{id:"actor-a"}},error:null,
    })},
    from,
  });
  return {from,categoryQuery,writes};
}
describe("product draft API constraints",()=>{
  beforeEach(()=>vi.clearAllMocks());
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
  it("rejects malformed draft deletion before touching tables",async()=>{
    const client=setup();
    const result=await DELETE(new NextRequest("http://localhost/api/products/drafts?id=invalid",{method:"DELETE"}));
    expect(result.status).toBe(400);
    expect(client.from).not.toHaveBeenCalled();
  });
});
