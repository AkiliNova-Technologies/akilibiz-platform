import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {NextRequest} from "next/server";
const mocks=vi.hoisted(()=>({createClient:vi.fn(),requireActiveBusiness:vi.fn()}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.createClient}));
vi.mock("@/lib/business-context",()=>({requireActiveBusiness:mocks.requireActiveBusiness}));
import {GET,POST,DELETE} from "./route";

const draft={
  id:"11111111-1111-4111-8111-111111111111",
  source_business_public_id:"desktop-a",
  purchase_order_id:8,receipt_number:"GR-2026-001",
  receipt_date:"2026-11-16",supplier_reference:null,due_date:null,
  lines:[{purchase_order_line_id:12,product_id:4,
    quantity_milli:1500,unit_cost_ugx:4000}],
  supplier_vat:null,
};
const submit=(data:unknown)=>new NextRequest("http://localhost/api/purchasing/receipts/drafts",{
  method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data),
});
function setup(options:{role?:string;signedIn?:boolean;remaining?:number}={}){
  mocks.requireActiveBusiness.mockResolvedValue({id:"tenant-a",role:options.role??"owner"});
  const order={select:vi.fn(),eq:vi.fn(),maybeSingle:vi.fn()};
  order.select.mockReturnValue(order);order.eq.mockReturnValue(order);
  order.maybeSingle.mockResolvedValue({data:{record:{
    status:"Pending",supplier_id:3,
  }},error:null});
  const lines={select:vi.fn(),eq:vi.fn(),range:vi.fn()};
  lines.select.mockReturnValue(lines);lines.eq.mockReturnValue(lines);
  lines.range.mockResolvedValue({data:[{
    local_record_id:12,record:{
      product_id:4,quantity_milli:2000,received_quantity_milli:options.remaining===undefined?0:2000-options.remaining,
    },
  }],error:null});
  const writes={select:vi.fn(),single:vi.fn()};
  writes.select.mockReturnValue(writes);
  writes.single.mockResolvedValue({data:{id:draft.id,updated_at:"2026-11-16T12:00:00Z"},error:null});
  const drafts={select:vi.fn(),eq:vi.fn(),order:vi.fn(),range:vi.fn(),upsert:vi.fn(),delete:vi.fn()};
  drafts.select.mockReturnValue(drafts);drafts.eq.mockReturnValue(drafts);
  drafts.order.mockReturnValue(drafts);drafts.range.mockResolvedValue({data:[],count:0,error:null});
  drafts.upsert.mockReturnValue(writes);drafts.delete.mockReturnValue(drafts);
  const from=vi.fn((table:string)=>table==="desktop_business_records"?
    (from.mock.calls.filter(([name])=>name==="desktop_business_records").length===1?order:lines):drafts);
  mocks.createClient.mockResolvedValue({
    auth:{getUser:vi.fn().mockResolvedValue({
      data:{user:options.signedIn===false?null:{id:"owner-a"}},error:null,
    })},from,
  });
  return {from,drafts,order,lines};
}
describe("goods receipt preparation API",()=>{
  beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("AKILIBIZ_ENABLE_WEB_GOODS_RECEIPT_DRAFTS","1");});
  afterEach(()=>vi.unstubAllEnvs());
  it("defaults off without accessing hosted records",async()=>{
    vi.stubEnv("AKILIBIZ_ENABLE_WEB_GOODS_RECEIPT_DRAFTS","0");
    const mocks=setup();
    expect((await GET()).status).toBe(503);
    expect((await POST(submit(draft))).status).toBe(503);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects unauthenticated and nonowner writes",async()=>{
    setup({signedIn:false});
    expect((await POST(submit(draft))).status).toBe(401);
    const mocks=setup({role:"manager"});
    expect((await POST(submit(draft))).status).toBe(403);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects injected posted state and invalid receipt amounts",async()=>{
    const s=setup();
    expect((await POST(submit({...draft,status:"posted"}))).status).toBe(400);
    expect((await POST(submit({...draft,lines:[{
      ...draft.lines[0],quantity_milli:1001,unit_cost_ugx:1,
    }]}))).status).toBe(400);
    expect(s.from).not.toHaveBeenCalled();
  });
  it("enforces available desktop ordered quantity before saving",async()=>{
    const s=setup({remaining:500});
    expect((await POST(submit(draft))).status).toBe(409);
    expect(s.drafts.upsert).not.toHaveBeenCalled();
  });
  it("saves only owner-scoped unposted goods receipt draft",async()=>{
    const s=setup();
    const response=await POST(submit(draft));
    expect(response.status).toBe(200);
    expect(s.drafts.upsert).toHaveBeenCalledWith({
      ...draft,business_id:"tenant-a",created_by:"owner-a",
    },{onConflict:"id"});
    expect(await response.json()).toMatchObject({state:"draft",totalUgx:6000});
    for(const table of ["goods_receipts","stock_movements","supplier_payables","journal_entries"])
      expect(s.from).not.toHaveBeenCalledWith(table);
  });
  it("rejects malformed discard IDs before a business table query",async()=>{
    const s=setup();
    const response=await DELETE(new NextRequest("http://localhost/api/purchasing/receipts/drafts?id=bad"));
    expect(response.status).toBe(400);
    expect(s.from).not.toHaveBeenCalled();
  });
});
