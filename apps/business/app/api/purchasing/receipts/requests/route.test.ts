import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const mocks=vi.hoisted(()=>({createClient:vi.fn(),requireActiveBusiness:vi.fn(),rpc:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.createClient}));
vi.mock("@/lib/business-context",()=>({requireActiveBusiness:mocks.requireActiveBusiness}));
import {GET,POST} from "./route";
const draftId="11111111-1111-4111-8111-111111111111";
const requestId="22222222-2222-4222-8222-222222222222";
const post=(body:unknown)=>new NextRequest("http://localhost/api/purchasing/receipts/requests",{method:"POST",body:JSON.stringify(body)});
function setup(role="owner"){
  mocks.requireActiveBusiness.mockResolvedValue({id:"tenant-a",role});
  mocks.createClient.mockResolvedValue({auth:{getUser:vi.fn().mockResolvedValue({data:{user:{id:"owner-a"}},error:null})},rpc:mocks.rpc});
}
describe("goods receipt desktop request API",()=>{
  beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("AKILIBIZ_ENABLE_WEB_GOODS_RECEIPT_REQUESTS","1");setup();});
  afterEach(()=>vi.unstubAllEnvs());
  it("is independently default-off",async()=>{
    vi.stubEnv("AKILIBIZ_ENABLE_WEB_GOODS_RECEIPT_REQUESTS","0");
    expect((await POST(post({draftId,requestId}))).status).toBe(503);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects malformed identities before RPC",async()=>{
    expect((await POST(post({draftId:"bad",requestId}))).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("submits an owner-scoped idempotent review request",async()=>{
    mocks.rpc.mockResolvedValue({data:"33333333-3333-4333-8333-333333333333",error:null});
    const response=await POST(post({draftId,requestId}));
    expect(response.status).toBe(202);
    expect(mocks.rpc).toHaveBeenCalledWith("request_desktop_goods_receipt_review",{
      target_business_id:"tenant-a",target_draft_id:draftId,request_id:requestId,
    });
  });
  it("loads hosted acknowledgement status",async()=>{
    mocks.rpc.mockResolvedValue({data:[{draft_id:draftId,state:"applied"}],error:null});
    expect((await GET()).status).toBe(200);
  });
});
