import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe,expect,it } from "vitest";

const migration = readFileSync(resolve(process.cwd(),
  "../../supabase/migrations/20261114210000_product_request_recovery_and_draft_freeze.sql"
),"utf8");

describe("web product request recovery migration (source contract)",()=>{
  it("protects both direct draft updates and deletion after queueing",()=>{
    expect(migration).toMatch(/create trigger prevent_requested_product_draft_update\s+before update on public\.web_product_drafts/i);
    expect(migration).toMatch(/create trigger prevent_requested_product_draft_delete\s+before delete on public\.web_product_drafts/i);
    expect(migration).toContain("private.desktop_product_create_commands");
    expect(migration).toContain("c.draft_id=draft_id");
  });
  it("returns only authenticated owner-scoped requests and verified publication",()=>{
    expect(migration).toContain("private.is_active_business_owner(target_business_id)");
    expect(migration).toContain("c.requested_by=(select auth.uid())");
    expect(migration).toContain("p.local_product_id=c.local_product_id");
    expect(migration).toContain("p.category_id=c.category_id");
    expect(migration).toContain("then 'published' else c.state");
  });
  it("does not create products or bypass the feature gates",()=>{
    expect(migration).not.toMatch(/insert\s+into\s+public\.desktop_products/i);
    expect(migration).not.toMatch(/update\s+public\.desktop_products/i);
    expect(migration).not.toMatch(/requests_enabled\s*=\s*true/i);
    expect(migration).toMatch(/grant execute on function public\.list_desktop_product_create_statuses\(uuid\)\s+to authenticated/i);
  });
});
