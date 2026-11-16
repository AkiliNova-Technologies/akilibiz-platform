import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe,expect,it} from "vitest";

const sql=readFileSync(resolve(process.cwd(),
  "../../supabase/migrations/20261115000000_web_goods_receipt_preparation.sql"),"utf8");
const api=readFileSync(resolve(process.cwd(),
  "app/api/purchasing/receipts/drafts/route.ts"),"utf8");

describe("source-only receiving preparation contract",()=>{
  it("keeps receiving independent and disabled by default",()=>{
    expect(api).toContain('AKILIBIZ_ENABLE_WEB_GOODS_RECEIPT_DRAFTS!=="1"');
    expect(api).toContain('business.role!=="owner"');
    expect(api).not.toMatch(/\.rpc\(["'](?:create_goods_receipt|receive_purchase_order)/i);
    expect(sql).not.toMatch(/insert\s+into\s+(?:public\.)?(?:goods_receipts|stock_movements|supplier_payables|journal_entries)/i);
  });
  it("enforces tenant/owner RLS and immutable receipt source identity",()=>{
    expect(sql).toContain("alter table public.web_goods_receipt_drafts force row level security");
    expect(sql).toContain("private.is_active_business_owner(web_goods_receipt_drafts.business_id)");
    expect(sql).toContain("new.source_business_public_id is distinct from old.source_business_public_id");
    expect(sql).toContain("new.purchase_order_id is distinct from old.purchase_order_id");
    expect(sql).toContain("unique(business_id,source_business_public_id,receipt_number)");
    expect(sql).toContain("r.entity_type='purchase_orders'");
    expect(sql).toContain("r.entity_type='purchase_order_lines'");
  });
  it("checks exact UGX, remaining delivered quantities and documented supplier invoice",()=>{
    expect(sql).toContain("qty>ordered_qty-received_qty");
    expect(sql).toContain("(qty::numeric*cost)%1000<>0");
    expect(sql).toContain("Supplier invoice item evidence does not match the delivery");
    expect(sql).toContain("EFRIS_E_INVOICE");
    expect(sql).toContain("TAX_INVOICE");
    expect(sql).not.toContain("recoverable_input_vat_ugx");
  });
});
