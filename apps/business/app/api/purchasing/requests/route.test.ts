import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const mocks=vi.hoisted(()=>({createClient:vi.fn(),requireActiveBusiness:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.createClient}));
vi.mock("@/lib/business-context",()=>({requireActiveBusiness:mocks.requireActiveBusiness}));
import {GET,POST} from "./route";

const request={draftId:"11111111-1111-4111-8111-111111111111",
  requestId:"22222222-2222-4222-8222-222222222222"};
const make=(data:unknown)=>new NextRequest("http://localhost/api/purchasing/requests",{
  method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data),
});
function setup(options:{role?:string;user?:boolean;error?:string}={}){
  mocks.requireActiveBusiness.mockResolvedValue({id:"business-a",role:options.role??"owner"});
  const rpc=vi.fn().mockResolvedValue({
    data:"33333333-3333-4333-8333-333333333333",
    error:options.error?{code:options.error}:null,
  });
  mocks.createClient.mockResolvedValue({
    auth:{getUser:vi.fn().mockResolvedValue({
      data:{user:options.user===false?null:{id:"owner-a"}},error:null,
    })},rpc,
  });
  return {rpc};
}
describe("desktop purchase order request API",()=>{
  beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("AKILIBIZ_ENABLE_PURCHASE_ORDER_REVIEW_REQUESTS","1");});
  afterEach(()=>vi.unstubAllEnvs());
  it("defaults to a hard disabled route independent of draft preparation",async()=>{
    vi.stubEnv("AKILIBIZ_ENABLE_PURCHASE_ORDER_REVIEW_REQUESTS","0");
    const s=setup();
    expect((await POST(make(request))).status).toBe(503);
    expect((await GET()).status).toBe(503);
    expect(s.rpc).not.toHaveBeenCalled();
  });
  it("requires an owner and authenticated session before staging",async()=>{
    setup({user:false});
    expect((await POST(make(request))).status).toBe(401);
    const s=setup({role:"manager"});
    expect((await POST(make(request))).status).toBe(403);
    expect(s.rpc).not.toHaveBeenCalled();
  });
  it("rejects injected transaction fields and invalid request IDs",async()=>{
    const s=setup();
    expect((await POST(make({...request,stock_quantity:100}))).status).toBe(400);
    expect((await POST(make({...request,requestId:"bad"}))).status).toBe(400);
    expect(s.rpc).not.toHaveBeenCalled();
  });
  it("passes only server-verified owner business and opaque draft IDs to SQL",async()=>{
    const s=setup();
    const response=await POST(make(request));
    expect(response.status).toBe(202);
    expect(s.rpc).toHaveBeenCalledWith("request_desktop_purchase_order_review",{
      target_business_id:"business-a",target_draft_id:request.draftId,
      request_id:request.requestId,
    });
    expect(await response.json()).toMatchObject({state:"pending"});
  });
  it("fails closed on SQL permission or immutable-request conflicts",async()=>{
    const permission=setup({error:"42501"});
    expect((await POST(make(request))).status).toBe(403);
    expect(permission.rpc).toHaveBeenCalledTimes(1);
    const conflict=setup({error:"23505"});
    expect((await POST(make(request))).status).toBe(409);
    const disabled=setup({error:"55000"});
    expect((await POST(make(request))).status).toBe(503);
  });
  it("reads only the owner's requests and rejects invalid source results",async()=>{
    const s=setup();
    s.rpc.mockResolvedValueOnce({data:[{
      command_id:"33333333-3333-4333-8333-333333333333",
      draft_id:request.draftId,state:"pending",requested_at:"2026-11-14T16:00:00Z",
    }],error:null});
    const response=await GET();
    expect(response.status).toBe(200);
    expect(s.rpc).toHaveBeenCalledWith("list_desktop_purchase_order_review_statuses",{
      target_business_id:"business-a",
    });
    s.rpc.mockResolvedValueOnce({data:[{command_id:"invalid"}],error:null});
    expect((await GET()).status).toBe(503);
  });
});
