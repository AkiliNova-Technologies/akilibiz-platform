import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks=vi.hoisted(()=>({
  createClient:vi.fn(),
  requireActiveBusiness:vi.fn(),
}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.createClient}));
vi.mock("@/lib/business-context",()=>({requireActiveBusiness:mocks.requireActiveBusiness}));
import { GET } from "./route";

const id="22222222-2222-4222-8222-222222222222";
const request=(requestId=id)=>new NextRequest(
  `http://localhost/api/pos/sales/status?requestId=${encodeURIComponent(requestId)}`,
);
function setup(options:{
  role?:string; signedIn?:boolean; error?:string; data?:unknown[];
}={}) {
  mocks.requireActiveBusiness.mockResolvedValue({
    id:"business-a",role:options.role??"owner",
  });
  const rpc=vi.fn().mockResolvedValue({
    data:options.data??[],error:options.error?{code:options.error}:null,
  });
  mocks.createClient.mockResolvedValue({
    auth:{getUser:vi.fn().mockResolvedValue({
      data:{user:options.signedIn===false?null:{id:"actor-a"}},error:null,
    })},
    rpc,
  });
  return rpc;
}

describe("GET /api/pos/sales/status",()=>{
  beforeEach(()=>vi.clearAllMocks());
  it("rejects invalid request IDs without invoking the database",async()=>{
    const rpc=setup();
    expect((await GET(request("bad"))).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("requires sign-in and an authorized role",async()=>{
    const rpc=setup({signedIn:false});
    expect((await GET(request())).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
    setup({role:"accountant"});
    expect((await GET(request())).status).toBe(403);
  });
  it("scopes RPC to selected business and request ID",async()=>{
    const rpc=setup({data:[{
      sale_id:"33333333-3333-4333-8333-333333333333",
      receipt_number:"WEB-42",status:"reconciled",
      total_ugx:12000,change_ugx:2000,requested_at:"2026-11-14T12:00:00Z",
    }]});
    const result=await GET(request());
    expect(result.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("get_web_pos_cash_sale_status",{
      target_business_id:"business-a",request_id:id,
    });
    expect(await result.json()).toMatchObject({state:"reconciled",receiptNumber:"WEB-42"});
  });
  it("returns explicit not-found without claiming no payment happened",async()=>{
    setup();
    const result=await GET(request());
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({state:"not_found"});
  });
  it("fails closed when reconciliation state cannot be verified",async()=>{
    setup({error:"PGRST202"});
    expect((await GET(request())).status).toBe(503);
    setup({data:[{sale_id:id,receipt_number:"WEB-1",status:"unknown"}]});
    expect((await GET(request())).status).toBe(503);
  });
});
