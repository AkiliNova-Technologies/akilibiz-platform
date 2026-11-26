import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Executable SQL only; comments describe the restore scenario.
const migration = readFileSync(resolve(process.cwd(),
  "../../supabase/migrations/20261127120000_desktop_mirror_generation_read.sql"
), "utf8").replace(/--.*$/gm, "");

describe("desktop mirror generation recovery (source contract)", () => {
  it("authorizes both reads for the paired desktop source only", () => {
    expect(migration.match(/private\.require_desktop_inventory_source\(/g)?.length).toBe(2);
    for (const signature of [
      "public.get_desktop_business_mirror_generation(uuid,text,uuid,text)",
      "public.list_desktop_business_mirror_generations(uuid,text,uuid)",
    ]) {
      expect(migration).toContain(`revoke all on function ${signature}\n  from public,anon,authenticated,service_role;`);
      expect(migration).toContain(`grant execute on function ${signature}\n  to authenticated;`);
    }
  });
  it("only reads committed heads and never exposes business records or writes", () => {
    expect(migration).toContain("from private.desktop_mirror_heads h");
    expect(migration).not.toMatch(/desktop_business_records|desktop_mirror_batch_rows/);
    expect(migration).not.toMatch(/\b(insert|update|delete)\b/i);
  });
});
