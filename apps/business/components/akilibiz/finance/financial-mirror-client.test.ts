import {afterEach,describe,expect,it,vi} from "vitest";
import {loadAllFinancialMirrorRows} from "./financial-mirror-client";

afterEach(()=>vi.unstubAllGlobals());

const payload=(page:number,total:number,count:number)=>({
  entity:"supplier_payments",
  page,pageSize:100,total,readOnly:true,
  lastSuccessfulSync:"2026-11-14T15:00:00Z",isStale:false,
  rows:Array.from({length:count},(_,i)=>({
    localRecordId:(page-1)*100+i+1,
    capturedAt:"2026-11-14T15:00:00Z",
    record:{amount_ugx:1500},
  })),
});

describe("complete financial mirror pagination",()=>{
  it("loads every page instead of silently returning the first 100 records",async()=>{
    const fetcher=vi.fn(async(url:string)=>{
      const page=Number(new URL(url,"http://localhost").searchParams.get("page"));
      return new Response(JSON.stringify(payload(page,101,page===1?100:1)),{status:200});
    });
    vi.stubGlobal("fetch",fetcher);
    const rows=await loadAllFinancialMirrorRows("supplier_payments");
    expect(rows).toHaveLength(101);
    expect(rows[100].localRecordId).toBe(101);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("fails closed rather than using a partial payment ledger",async()=>{
    const fetcher=vi.fn(async(url:string)=>{
      const page=Number(new URL(url,"http://localhost").searchParams.get("page"));
      return new Response(JSON.stringify(payload(page,120,page===1?100:0)),{status:200});
    });
    vi.stubGlobal("fetch",fetcher);
    await expect(loadAllFinancialMirrorRows("supplier_payments")).rejects.toThrow(
      "synchronized records changed",
    );
  });
  it("rejects a changed total during two-page retrieval",async()=>{
    vi.stubGlobal("fetch",vi.fn(async(url:string)=>{
      const page=Number(new URL(url,"http://localhost").searchParams.get("page"));
      return new Response(JSON.stringify(payload(page,page===1?101:100,page===1?100:0)),{status:200});
    }));
    await expect(loadAllFinancialMirrorRows("supplier_payments")).rejects.toThrow(
      "synchronized records changed",
    );
  });
  it("rejects mixed publication generations during multi-page retrieval",async()=>{
    vi.stubGlobal("fetch",vi.fn(async(url:string)=>{
      const page=Number(new URL(url,"http://localhost").searchParams.get("page"));
      const body=payload(page,101,page===1?100:1);
      if(page===2)body.lastSuccessfulSync="2026-11-14T16:00:00Z";
      return new Response(JSON.stringify(body),{status:200});
    }));
    await expect(loadAllFinancialMirrorRows("authoritative_expenses")).rejects.toThrow(
      "synchronized records changed",
    );
  });
  it("fails safely when a business exceeds the bounded reporting limit",async()=>{
    vi.stubGlobal("fetch",vi.fn(async()=>
      new Response(JSON.stringify(payload(1,5001,100)),{status:200})));
    await expect(loadAllFinancialMirrorRows("authoritative_expenses")).rejects.toThrow(
      "more synchronized records",
    );
  });
});
