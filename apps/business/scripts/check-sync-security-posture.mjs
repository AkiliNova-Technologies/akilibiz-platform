// Read-only regression check for the hosted synchronization security boundary.
// Uses the same DIRECT_URL as the opt-in hosted qualification harness.
// No data changes, no secret output, and no security-advisor suppression.
import { spawnSync } from "node:child_process";

const EXPECTED_PRIVATE_TABLES = [
  "desktop_inventory_checkpoint_product_balances",
  "desktop_inventory_checkpoints",
  "desktop_inventory_current_metadata",
  "desktop_inventory_movement_cursors",
  "desktop_inventory_movement_receipts",
  "desktop_mirror_batch_rows",
  "desktop_mirror_batches",
  "desktop_mirror_heads",
];

const EXPECTED_AUTHENTICATED_RPCS = [
  "apply_desktop_catalogue_event",
  "apply_desktop_inventory_movement",
  "claim_desktop_pairing",
  "confirm_desktop_inventory_checkpoint",
  "create_desktop_pairing",
  "deactivate_business_staff",
  "finalize_desktop_business_snapshot",
  "grant_business_staff",
  "list_business_staff",
  "list_desktop_effective_inventory",
  "onboard_business",
  "register_desktop_business",
  "stage_desktop_business_snapshot_chunk",
  "upload_desktop_catalogue",
  "upload_desktop_contacts",
  "upload_desktop_inventory_metadata",
  "upload_desktop_inventory_positions",
];

if (!process.env.DIRECT_URL) {
  console.error("DIRECT_URL is required in the local qualification environment.");
  process.exit(2);
}

// Queries pg_catalog only. Explicitly mark the session read-only even when
// a privileged qualification connection is supplied.
const sql = `
BEGIN READ ONLY;
SELECT json_build_object(
  'tables', (
    SELECT coalesce(json_agg(json_build_object(
      'name', c.relname,
      'rls', c.relrowsecurity,
      'policies', (SELECT count(*) FROM pg_policy po WHERE po.polrelid=c.oid),
      'client_grants', EXISTS (
        SELECT 1 FROM aclexplode(coalesce(c.relacl, acldefault('r', c.relowner))) a
        WHERE a.grantee IN (
          0,
          (SELECT oid FROM pg_roles WHERE rolname='anon'),
          (SELECT oid FROM pg_roles WHERE rolname='authenticated')
        ) AND a.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')
      )
    ) ORDER BY c.relname), '[]'::json)
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='private' AND c.relkind IN ('r','p')
    AND c.relname LIKE 'desktop_%'
  ),
  'functions', (
    SELECT coalesce(json_agg(json_build_object(
      'name', p.proname,
      'auth_execute', has_function_privilege('authenticated',p.oid,'EXECUTE'),
      'anon_execute', has_function_privilege('anon',p.oid,'EXECUTE'),
      'fixed_search_path', coalesce('search_path=""'=ANY(p.proconfig),false)
    ) ORDER BY p.proname), '[]'::json)
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef
    AND has_function_privilege('authenticated',p.oid,'EXECUTE')
  )
)::text;
COMMIT;
`;

const run = spawnSync("psql", [process.env.DIRECT_URL, "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1"], {
  input: sql,
  encoding: "utf8",
  env: { ...process.env, PGOPTIONS: "-c default_transaction_read_only=on" },
  maxBuffer: 1024 * 1024,
});
if (run.error || run.status !== 0) {
  // psql errors can contain connection information; never echo stderr.
  console.error("Read-only security posture query failed; check database access and psql installation.");
  process.exit(2);
}
let result;
try {
  const jsonLine = run.stdout.split("\n").find((line) => line.trim().startsWith("{"));
  result = JSON.parse(jsonLine);
} catch {
  console.error("Security posture query did not return valid JSON.");
  process.exit(2);
}
const problems = [];
const actualTables = new Map(result.tables.map((row) => [row.name, row]));
const actualFunctions = new Map(result.functions.map((row) => [row.name, row]));
for (const name of EXPECTED_PRIVATE_TABLES) {
  const row = actualTables.get(name);
  if (!row) problems.push(`Missing private table: ${name}`);
  else if (!row.rls || row.policies !== 0 || row.client_grants) {
    problems.push(`Private table access boundary changed: ${name}`);
  }
}
for (const row of result.tables) {
  if (row.client_grants) problems.push(`Client table grant exists: private.${row.name}`);
}
for (const name of EXPECTED_AUTHENTICATED_RPCS) {
  const row = actualFunctions.get(name);
  if (!row) problems.push(`Missing authorized RPC: ${name}`);
  else if (!row.auth_execute || row.anon_execute || !row.fixed_search_path) {
    problems.push(`RPC security boundary changed: ${name}`);
  }
}
for (const row of result.functions) {
  if (!EXPECTED_AUTHENTICATED_RPCS.includes(row.name)) {
    problems.push(`New authenticated SECURITY DEFINER RPC requires review: ${row.name}`);
  }
}
if (problems.length) {
  console.error("Hosted synchronization security regression detected:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log(`PASS: ${EXPECTED_PRIVATE_TABLES.length} private tables protected; ${EXPECTED_AUTHENTICATED_RPCS.length} authenticated RPCs constrained.`);
console.log("This structural check supplements, and does not replace, cross-tenant/revoked-device runtime tests.");
