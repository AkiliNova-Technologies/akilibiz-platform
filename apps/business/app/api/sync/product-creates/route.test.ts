import {beforeEach,afterEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const mocks=vi.hoisted(()=>({createClient:vi.fn(),requireActiveBusiness:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.createClient}));
vi.mock("@/lib/business-context",()=>({requireActiveBusiness:mocks.requireActiveBusiness}));
import {GET,POST} from "./route";

const draftId="11111111-1111-4111-8111-111111111111";
const requestId="22222222-2222-4222-8222-222222222222";
const commandId="33333333-3333-4333-8333-333333333333";
const request=(body:unknown)=>new NextRequest("http://localhost/api/sync/product-creates",{
  method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),
});
function setup(role="owner", signedIn=true, rpcError?:string){
  mocks.requireActiveBusiness.mockResolvedValue({id:"business-a",role});
  const rpc=vi.fn().mockImplementation(async(name:string)=>{
    if(rpcError)return {data:null,error:{code:rpcError}};
    if(name==="request_desktop_product_create")return {data:commandId,error:null};
    return {data:[{command_id:commandId,draft_id:draftId,
      state:"pending",requested_at:"2026-11-14T14:00:00Z"}],error:null};
  });
  mocks.createClient.mockResolvedValue({auth:{getUser:vi.fn().mockResolvedValue({
    data:{user:signedIn?{id:"user-a"}:null},error:null,
  })},rpc});
  return rpc;
}
describe("guarded desktop product creation request API",()=>{
  beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("AKILIBIZ_ENABLE_PRODUCT_CREATE_REQUESTS","1");});
  afterEach(()=>vi.unstubAllEnvs());
  it("is disabled by default with no database calls",async()=>{
    const rpc=setup();
    vi.stubEnv("AKILIBIZ_ENABLE_PRODUCT_CREATE_REQUESTS","0");
    expect((await POST(request({draftId,requestId}))).status).toBe(503);
    expect((await GET(new NextRequest(`http://localhost/api/sync/product-creates?id=${commandId}`))).status).toBe(503);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("requires an authenticated owner",async()=>{
    const anon=setup("owner",false);
    expect((await POST(request({draftId,requestId}))).status).toBe(401);
    expect(anon).not.toHaveBeenCalled();
    const manager=setup("manager");
    expect((await POST(request({draftId,requestId}))).status).toBe(403);
    expect(manager).not.toHaveBeenCalled();
  });
  it("rejects forged business fields and arbitrary product payloads",async()=>{
    const rpc=setup();
    for(const body of [
      {draftId,requestId,businessId:"other"},
      {draftId,requestId,stock_quantity:100},
      {draftId:"invalid",requestId},
      {draftId,requestId:"invalid"},
    ])expect((await POST(request(body))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("submits only draft and request references for selected business",async()=>{
    const rpc=setup();
    const response=await POST(request({draftId,requestId}));
    expect(response.status).toBe(202);
    expect(rpc).toHaveBeenCalledWith("request_desktop_product_create",{
      target_business_id:"business-a",target_draft_id:draftId,request_id:requestId,
    });
    expect(await response.json()).toMatchObject({commandId,state:"pending"});
  });
  it("does not mistake a closed database gate for a published product",async()=>{
    setup("owner",true,"55000");
    const response=await POST(request({draftId,requestId}));
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({error:"Product requests are not ready for this business."});
  });
  it("looks up status by owner and business, not by arbitrary product ID",async()=>{
    const rpc=setup();
    const response=await GET(new NextRequest(`http://localhost/api/sync/product-creates?id=${commandId}`));
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("desktop_product_create_status",{
      target_business_id:"business-a",target_command_id:commandId,
    });
    expect(await response.json()).toMatchObject({state:"pending",draftId});
  });
});
