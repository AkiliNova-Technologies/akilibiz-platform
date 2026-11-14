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
    expect(migration).toContain("m.business_id=web_purchase_order_drafts.business_id");
    expect(migration).not.toContain("m.business_id=business_id");
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

const staging=readFileSync(resolve(process.cwd(),
  "../../supabase/migrations/20261114230000_web_purchase_order_review_requests.sql"),"utf8");
const requestRoute=readFileSync(resolve(process.cwd(),
  "app/api/purchasing/requests/route.ts"),"utf8");

describe("staging-only desktop purchasing review requests",()=>{
  it("keeps the database control and independent web switch disabled by default",()=>{
    expect(staging).toContain("requests_enabled boolean not null default false");
    expect(staging).toContain("private.require_desktop_inventory_source");
    expect(requestRoute).toContain('AKILIBIZ_ENABLE_PURCHASE_ORDER_REVIEW_REQUESTS!=="1"');
    expect(staging).not.toMatch(/insert\s+into\s+(?:public\.)?(?:goods_receipts|purchase_orders|supplier_payables|stock_movements)/i);
  });
  it("takes immutable paired-source purchase snapshots and freezes submitted drafts",()=>{
    for(const statement of [
      "supplier.source_public_id","product.local_product_id",
      "pg_advisory_xact_lock","source_device_public_id",
      "unique(business_id,draft_id)","freeze_requested_purchase_order_update",
      "freeze_requested_purchase_order_delete",
      "requested_by=(select auth.uid())",
    ])expect(staging).toContain(statement);
  });
  it("only exposes the authorized desktop source's pending requests",()=>{
    expect(staging).toContain("c.source_business_public_id=list_pending_desktop_purchase_order_reviews.source_business_public_id");
    expect(staging).toContain("c.source_device_public_id=list_pending_desktop_purchase_order_reviews.source_device_public_id");
    expect(staging).toContain("c.state='pending'");
    expect(staging).toContain("grant execute on function public.list_pending_desktop_purchase_order_reviews");
  });
});
