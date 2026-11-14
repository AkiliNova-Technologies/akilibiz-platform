// @vitest-environment jsdom
import {act,renderHook,waitFor} from "@testing-library/react";
import {beforeEach,describe,expect,it,vi} from "vitest";
import {useReportsSalesData} from "./reports-sales-data";

const mocks=vi.hoisted(()=>({loadAll:vi.fn()}));
vi.mock("@/components/akilibiz/finance/financial-mirror-client",()=>({
  loadAllFinancialMirrorRows:mocks.loadAll,
}));
const sale=(id:number,date:string)=>({
  localRecordId:id,capturedAt:"2026-11-14T12:00:00Z",
  record:{
    sale_number:`INV-${id}`,created_at:date,
    total_amount_ugx:37500,subtotal_ugx:37500,
    discount_amount_ugx:0,tax_amount_ugx:0,status:"completed",
    payment_method:"cash",items_count:1,amount_paid_ugx:40000,
    change_amount_ugx:2500,balance_due_ugx:-2500,
  },
});

describe("hosted sales report state",()=>{
  beforeEach(()=>vi.clearAllMocks());
  it("shows only requested period, not all loaded sales, and normalizes legacy cash debt",async()=>{
    mocks.loadAll.mockResolvedValue([
      sale(1,"2026-11-13T10:00:00Z"),
      sale(2,"2026-11-14T23:00:00Z"),
      sale(3,"2026-11-15T00:00:00Z"),
    ]);
    const {result}=renderHook(()=>useReportsSalesData());
    await act(async()=>{
      await result.current.getSalesRegister({
        date_from:"2026-11-14",date_to:"2026-11-14",skip:0,limit:5000,
      });
    });
    expect(result.current.sales).toHaveLength(1);
    expect(result.current.sales[0]).toMatchObject({
      id:2,amount_paid_ugx:40000,balance_due_ugx:0,
    });
  });
  it("discards a stale register when its next fetch fails",async()=>{
    mocks.loadAll.mockResolvedValueOnce([sale(1,"2026-11-14T13:00:00Z")])
      .mockRejectedValueOnce(new Error("Sync unavailable"));
    const {result}=renderHook(()=>useReportsSalesData());
    await act(async()=>{await result.current.getSalesRegister({skip:0,limit:5000});});
    expect(result.current.sales).toHaveLength(1);
    await act(async()=>{await result.current.getSalesRegister({skip:0,limit:5000});});
    await waitFor(()=>expect(result.current.sales).toHaveLength(0));
    expect(result.current.error).toContain("Sync unavailable");
  });
});
