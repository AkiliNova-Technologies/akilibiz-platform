import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe,expect,it} from "vitest";

const migration=readFileSync(resolve(process.cwd(),
  "../../supabase/migrations/20261114220000_web_purchase_order_preparation.sql"),"utf8");
const route=readFileSync(resolve(process.cwd(),
  "app/api/purchasing/drafts/route.ts"),"utf8");

describe("gated purchase order preparation (migration/source contract)",()=>{
  it("uses RLS and a recorded owner, never posting to desktop/stock/payables",()=>{
    expect(migration).toContain("alter table public.web_purchase_order_drafts force row level security");
    expect(migration).toContain("new.created_by is distinct from old.created_by");
    expect(migration).toContain("new.source_business_public_id is distinct from old.source_business_public_id");
    expect(migration).not.toMatch(/insert\s+into\s+(?:public\.)?(?:desktop_products|goods_receipts|supplier_payables|stock_movements)/i);
    expect(route).toContain('AKILIBIZ_ENABLE_WEB_PURCHASE_ORDER_DRAFTS!=="1"');
    expect(route).toContain("createClient()");
    expect(route).toContain("requireActiveBusiness()");
  });
  it("checks supplier and product origin and whole-UGX line totals at database boundary",()=>{
    expect(migration).toContain("s.local_business_public_id");
    expect(migration).toContain("p.local_business_public_id");
    expect(migration).toContain("qty::numeric*price");
    expect(migration).toContain("(qty::numeric*price)%1000<>0");
    expect(migration).toContain("Duplicate product in purchase order");
  });
});
