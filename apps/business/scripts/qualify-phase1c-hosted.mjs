import { spawnSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { request as httpsRequest } from "node:https";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "vntqfaheiwotinpuefzl";
const RUN_PREFIX = "phase1c-qualification";
const required = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SECRET_KEY", "DIRECT_URL"];
const recoveryMode = process.argv[2] === "cleanup";
const recoveryManifest = process.argv[3];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function redact(error) {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/eyJ[A-Za-z0-9._-]+/g, "<redacted-token>").replace(/sb_secret_[A-Za-z0-9_-]+/g, "<redacted-secret>");
}
function client(key) {
  return createClient(process.env.SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
}
function mark(results, name, status, detail = "") {
  results.push({ name, status, detail });
  console.log(`${status}: ${name}${detail ? ` — ${detail}` : ""}`);
}
function base64url(value) {
  return Buffer.from(value).toString("base64url");
}
function signedExpiredAccessToken(userId) {
  const secret = process.env.SUPABASE_LEGACY_JWT_SECRET;
  if (!secret) return null;
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ aud: "authenticated", exp: now - 60, iat: now - 3600, iss: `${process.env.SUPABASE_URL}/auth/v1`, role: "authenticated", sub: userId }));
  const unsigned = `${header}.${payload}`;
  return `${unsigned}.${createHmac("sha256", secret).update(unsigned).digest("base64url")}`;
}
async function interruptResponseAfterServerReply(url, headers, body) {
  return new Promise((resolveInterrupted, reject) => {
    const target = new URL(url);
    const request = httpsRequest({ hostname: target.hostname, path: target.pathname, method: "POST", headers }, (response) => {
      response.once("data", () => {
        request.destroy();
        response.destroy();
        resolveInterrupted();
      });
      response.once("end", () => reject(new Error("response completed before transport interruption")));
    });
    request.once("error", (error) => {
      if (error.code !== "ECONNRESET") reject(error);
    });
    request.end(body);
  });
}
async function expectSuccess(results, name, promise) {
  const result = await promise;
  if (result.error) throw new Error(`${name}: ${result.error.message}`);
  mark(results, name, "PASS");
  return result.data;
}
async function expectDenied(results, name, promise) {
  const result = await promise;
  if (!result.error) throw new Error(`${name}: request unexpectedly succeeded`);
  mark(results, name, "PASS", `denied (${result.error.code ?? result.error.status ?? "error"})`);
}
function runSql(sql, variables = {}) {
  const args = [process.env.DIRECT_URL, "-X", "-v", "ON_ERROR_STOP=1", "-At"];
  for (const [key, value] of Object.entries(variables)) args.push("-v", `${key}=${value}`);
  const run = spawnSync("psql", args, { input: sql, encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  if (run.status !== 0) throw new Error(`administrative SQL failed: ${run.stderr.trim()}`);
  return run.stdout.trim();
}
async function cleanup(manifest, results = []) {
  const ids = [manifest.businessAId, manifest.businessBId].filter(Boolean);
  if (ids.length) {
    const sql = String.raw`
begin;
set local session_replication_role=replica;
delete from private.desktop_mirror_batch_rows r using private.desktop_mirror_batches b where r.batch_id=b.batch_id and b.business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from private.desktop_inventory_checkpoint_product_balances r using private.desktop_inventory_checkpoints c where r.checkpoint_id=c.id and c.business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from private.desktop_inventory_movement_cursors r using private.desktop_inventory_checkpoints c where r.checkpoint_id=c.id and c.business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from private.desktop_inventory_current_metadata where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from private.desktop_inventory_movement_receipts where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from private.desktop_inventory_checkpoints where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from private.desktop_mirror_heads where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from private.desktop_mirror_batches where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from private.desktop_catalogue_event_receipts where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from private.desktop_pairing_challenges where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from private.desktop_devices where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from private.desktop_business_origins where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from public.desktop_business_records where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from public.desktop_inventory_positions where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from public.desktop_products where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from public.desktop_categories where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from public.desktop_customers where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from public.desktop_suppliers where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from public.audit_events where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from public.business_memberships where business_id in (:'business_a'::uuid,:'business_b'::uuid);
delete from public.businesses where id in (:'business_a'::uuid,:'business_b'::uuid);
commit;`;
    runSql(sql, { business_a: ids[0], business_b: ids[1] ?? ids[0] });
  }
  const admin = client(process.env.SUPABASE_SECRET_KEY);
  for (const userId of [manifest.userAId, manifest.userBId].filter(Boolean)) {
    const { error } = await admin.auth.admin.deleteUser(userId, false);
    if (error && !/not found/i.test(error.message)) throw error;
  }
  const remaining = runSql(
    `select (
      (select count(*) from public.businesses where id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from public.business_memberships where business_id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from public.audit_events where business_id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from public.desktop_business_records where business_id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from public.desktop_categories where business_id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from public.desktop_products where business_id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from public.desktop_customers where business_id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from public.desktop_suppliers where business_id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from public.desktop_inventory_positions where business_id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from private.desktop_business_origins where business_id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from private.desktop_devices where business_id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from private.desktop_pairing_challenges where business_id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from private.desktop_catalogue_event_receipts where business_id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from private.desktop_inventory_checkpoints where business_id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from private.desktop_inventory_movement_receipts where business_id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from private.desktop_inventory_current_metadata where business_id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from private.desktop_mirror_batches where business_id in (:'business_a'::uuid,:'business_b'::uuid))+
      (select count(*) from private.desktop_mirror_heads where business_id in (:'business_a'::uuid,:'business_b'::uuid))
    )||'|'||(select count(*) from auth.users where id in (:'user_a'::uuid,:'user_b'::uuid));`,
    { business_a: ids[0] ?? "00000000-0000-0000-0000-000000000000", business_b: ids[1] ?? "00000000-0000-0000-0000-000000000000", user_a: manifest.userAId ?? "00000000-0000-0000-0000-000000000000", user_b: manifest.userBId ?? "00000000-0000-0000-0000-000000000000" },
  );
  assert(remaining === "0|0", `cleanup verification failed: ${remaining}`);
  mark(results, "cleanup manifest resources removed", "PASS");
}

async function main() {
  for (const name of required) assert(process.env[name], `Missing required environment variable: ${name}`);
  const parsed = new URL(process.env.SUPABASE_URL);
  assert(parsed.hostname === `${PROJECT_REF}.supabase.co`, "Hosted project URL does not match the approved project reference");
  if (recoveryMode) {
    assert(recoveryManifest, "Usage: qualify-phase1c-hosted.mjs cleanup <manifest.json>");
    assert(process.env.AKILIBIZ_PHASE1C_RUN === `cleanup:${PROJECT_REF}`, "Set AKILIBIZ_PHASE1C_RUN=cleanup:vntqfaheiwotinpuefzl");
    await cleanup(JSON.parse(await readFile(resolve(recoveryManifest), "utf8")));
    return;
  }
  assert(process.env.AKILIBIZ_PHASE1C_RUN === `execute:${PROJECT_REF}`, "Explicit opt-in missing: AKILIBIZ_PHASE1C_RUN=execute:vntqfaheiwotinpuefzl");

  const runId = crypto.randomUUID();
  const artifactDir = resolve(process.env.PHASE1C_ARTIFACT_DIR ?? "/tmp", `${RUN_PREFIX}-${runId}`);
  await mkdir(artifactDir, { recursive: true, mode: 0o700 });
  const manifest = { projectRef: PROJECT_REF, runId, prefix: `${RUN_PREFIX}-${runId}`, startedAt: new Date().toISOString() };
  const results = [];
  const manifestPath = resolve(artifactDir, "cleanup-manifest.json");
  const reportPath = resolve(artifactDir, "report.json");
  const save = () => writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });

  try {
    const admin = client(process.env.SUPABASE_SECRET_KEY);
    const password = `Q!${crypto.randomUUID()}a9`;
    for (const label of ["a", "b"]) {
      const email = `${manifest.prefix}-${label}@example.invalid`;
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { phase1c_run_id: runId } });
      if (error || !data.user) throw new Error(`Auth identity ${label} creation failed: ${error?.message ?? "missing user"}`);
      manifest[`user${label.toUpperCase()}Id`] = data.user.id;
      manifest[`user${label.toUpperCase()}Email`] = email;
      await save();
    }
    mark(results, "disposable Auth identities created", "PASS");

    const ownerA = client(process.env.SUPABASE_PUBLISHABLE_KEY);
    const ownerB = client(process.env.SUPABASE_PUBLISHABLE_KEY);
    const signA = await ownerA.auth.signInWithPassword({ email: manifest.userAEmail, password });
    const signB = await ownerB.auth.signInWithPassword({ email: manifest.userBEmail, password });
    assert(signA.data.session && signB.data.session, "owner authentication failed");
    mark(results, "owner authentication", "PASS");
    const refreshed = await ownerA.auth.refreshSession({ refresh_token: signA.data.session.refresh_token });
    assert(refreshed.data.session && !refreshed.error, "session refresh failed");
    mark(results, "refresh token recovery", "PASS");

    const sourceA = runId.replaceAll("-", "");
    const sourceB = crypto.randomUUID().replaceAll("-", "");
    const deviceA = crypto.randomUUID();
    const deviceB = crypto.randomUUID();
    const registrationA = await expectSuccess(results, "business A registration", ownerA.rpc("register_desktop_business", { local_business_public_id: sourceA, device_public_id: deviceA, business_name: `PHASE1C ${runId} A`, business_trading_name: "Phase1C A", business_contact_email: manifest.userAEmail, business_contact_phone: null, business_time_zone: "Africa/Kampala", business_currency_code: "UGX" }));
    manifest.businessAId = registrationA[0].hosted_business_id;
    manifest.deviceAId = deviceA;
    const registrationB = await expectSuccess(results, "business B registration", ownerB.rpc("register_desktop_business", { local_business_public_id: sourceB, device_public_id: deviceB, business_name: `PHASE1C ${runId} B`, business_trading_name: "Phase1C B", business_contact_email: manifest.userBEmail, business_contact_phone: null, business_time_zone: "Africa/Kampala", business_currency_code: "UGX" }));
    manifest.businessBId = registrationB[0].hosted_business_id;
    manifest.deviceBId = deviceB;
    await save();
    const retryRegistration = await ownerA.rpc("register_desktop_business", { local_business_public_id: sourceA, device_public_id: deviceA, business_name: `PHASE1C ${runId} A`, business_trading_name: "Phase1C A", business_contact_email: manifest.userAEmail, business_contact_phone: null, business_time_zone: "Africa/Kampala", business_currency_code: "UGX" });
    assert(!retryRegistration.error && retryRegistration.data[0].created === false, "business registration retry was not idempotent");
    mark(results, "business registration lost-acknowledgement retry", "PASS");

    const pairing = await expectSuccess(results, "pairing code creation", ownerA.rpc("create_desktop_pairing", { target_business_id: manifest.businessAId }));
    const pairedDevice = crypto.randomUUID();
    const pairedSource = crypto.randomUUID().replaceAll("-", "");
    const claimed = await expectSuccess(results, "device pairing", ownerA.rpc("claim_desktop_pairing", { pairing_code: pairing[0].pairing_code, local_business_public_id: pairedSource, device_public_id: pairedDevice }));
    const claimRetry = await expectSuccess(results, "pairing retry", ownerA.rpc("claim_desktop_pairing", { pairing_code: pairing[0].pairing_code, local_business_public_id: pairedSource, device_public_id: pairedDevice }));
    assert(claimed[0].hosted_device_id === claimRetry[0].hosted_device_id, "pairing retry returned a different device");

    const anon = client(process.env.SUPABASE_PUBLISHABLE_KEY);
    await expectDenied(results, "missing bearer token", anon.rpc("upload_desktop_contacts", { target_business_id: manifest.businessAId, source_business_public_id: sourceA, source_device_public_id: deviceA, customers: [], suppliers: [] }));
    const invalidResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/upload_desktop_contacts`, { method: "POST", headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, authorization: "Bearer invalid.phase1c.token", "content-type": "application/json" }, body: JSON.stringify({ target_business_id: manifest.businessAId, source_business_public_id: sourceA, source_device_public_id: deviceA, customers: [], suppliers: [] }) });
    assert(invalidResponse.status === 401, `invalid bearer token returned ${invalidResponse.status}`);
    mark(results, "invalid bearer token rejection", "PASS");
    const expiredToken = signedExpiredAccessToken(manifest.userAId);
    if (expiredToken) {
      const expiredResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/upload_desktop_contacts`, { method: "POST", headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${expiredToken}`, "content-type": "application/json" }, body: JSON.stringify({ target_business_id: manifest.businessAId, source_business_public_id: sourceA, source_device_public_id: deviceA, customers: [], suppliers: [] }) });
      assert(expiredResponse.status === 401, `correctly signed expired bearer token returned ${expiredResponse.status}`);
      mark(results, "correctly signed expired bearer token rejection", "PASS");
    } else {
      mark(results, "correctly signed expired bearer token rejection", "SKIP", "SUPABASE_LEGACY_JWT_SECRET was not supplied");
    }
    await expectDenied(results, "cross-business RPC isolation", ownerB.rpc("upload_desktop_contacts", { target_business_id: manifest.businessAId, source_business_public_id: sourceA, source_device_public_id: deviceA, customers: [], suppliers: [] }));

    await expectSuccess(results, "catalogue snapshot", ownerA.rpc("upload_desktop_catalogue", { target_business_id: manifest.businessAId, source_business_public_id: sourceA, source_device_public_id: deviceA, categories: [{ id: 1, name: "PHASE1C Goods", slug: `phase1c-${runId}`, description: "qualification", active: true }], products: [{ id: 10, category_id: 1, name: "PHASE1C Tea", sku: `P1C-${runId.slice(0, 8)}`, barcode: null, description: "qualification", brand: "AkiliBiz", stock_unit: "item", selling_price_ugx: 5000, cost_price_ugx: 3000, active: true }] }));
    const eventArgs = { target_business_id: manifest.businessAId, source_business_public_id: sourceA, source_device_public_id: deviceA, event_id: crypto.randomUUID().replaceAll("-", ""), entity_type: "product", source_record_id: 10, operation: "upsert", record: { id: 10, category_id: 1, name: "PHASE1C Tea Updated", sku: `P1C-${runId.slice(0, 8)}`, barcode: null, description: "qualification", brand: "AkiliBiz", stock_unit: "item", selling_price_ugx: 5500, cost_price_ugx: 3000, active: true } };
    await expectSuccess(results, "catalogue event", ownerA.rpc("apply_desktop_catalogue_event", eventArgs));
    await expectSuccess(results, "catalogue event lost-acknowledgement retry", ownerA.rpc("apply_desktop_catalogue_event", eventArgs));
    const interruptedEvent = { ...eventArgs, event_id: crypto.randomUUID().replaceAll("-", ""), record: { ...eventArgs.record, name: "PHASE1C Transport Recovery" } };
    const interruptedBody = JSON.stringify(interruptedEvent);
    await interruptResponseAfterServerReply(`${process.env.SUPABASE_URL}/rest/v1/rpc/apply_desktop_catalogue_event`, { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, authorization: `Bearer ${refreshed.data.session.access_token}`, "content-type": "application/json", "content-length": Buffer.byteLength(interruptedBody) }, interruptedBody);
    mark(results, "transport-level response interruption", "PASS");
    await expectSuccess(results, "recovery after interrupted request", ownerA.rpc("apply_desktop_catalogue_event", interruptedEvent));
    await expectSuccess(results, "contact snapshots", ownerA.rpc("upload_desktop_contacts", { target_business_id: manifest.businessAId, source_business_public_id: sourceA, source_device_public_id: deviceA, customers: [{ public_id: crypto.randomUUID(), name: "PHASE1C Customer", email: null, phone: "+256700000001", address: "Kampala", customer_type: "retail", loyalty_points: 0, active: true }], suppliers: [{ public_id: crypto.randomUUID(), name: "PHASE1C Supplier", contact_person: "Qualification", phone: "+256700000002", email: null, address: "Kampala", payment_terms: "cash", active: true }] }));
    const position = [{ product_id: 10, on_hand_milli: 100, reserved_milli: 2, damaged_milli: 1, minimum_milli: 10, maximum_milli: 500 }];
    await expectSuccess(results, "inventory position snapshot", ownerA.rpc("upload_desktop_inventory_positions", { target_business_id: manifest.businessAId, source_business_public_id: sourceA, source_device_public_id: deviceA, positions: position }));
    const checkpointArgs = { target_business_id: manifest.businessAId, source_business_public_id: sourceA, source_device_public_id: deviceA, checkpoint_request_id: crypto.randomUUID(), movement_watermark: 10, positions: position };
    const checkpoint = await expectSuccess(results, "inventory checkpoint", ownerA.rpc("confirm_desktop_inventory_checkpoint", checkpointArgs));
    const checkpointRetry = await expectSuccess(results, "checkpoint retry", ownerA.rpc("confirm_desktop_inventory_checkpoint", checkpointArgs));
    assert(checkpoint[0].hosted_checkpoint_id === checkpointRetry[0].hosted_checkpoint_id, "checkpoint retry duplicated receipt");
    const movementArgs = { target_business_id: manifest.businessAId, source_business_public_id: sourceA, source_device_public_id: deviceA, source_event_id: crypto.randomUUID(), source_movement_id: 11, previous_movement_id: 10, movement_payload: { source_movement_id: 11, product_local_id: 10, quantity_change_milli: 5, stock_before_milli: 100, stock_after_milli: 105 } };
    const movement = await expectSuccess(results, "ordered movement replay", ownerA.rpc("apply_desktop_inventory_movement", movementArgs));
    const movementRetry = await expectSuccess(results, "movement lost-acknowledgement retry", ownerA.rpc("apply_desktop_inventory_movement", movementArgs));
    assert(movement === movementRetry, "movement retry duplicated receipt");
    await expectDenied(results, "out-of-order movement rejection", ownerA.rpc("apply_desktop_inventory_movement", { ...movementArgs, source_event_id: crypto.randomUUID(), source_movement_id: 13, previous_movement_id: 10, movement_payload: { source_movement_id: 13, product_local_id: 10, quantity_change_milli: 1, stock_before_milli: 105, stock_after_milli: 106 } }));
    await expectSuccess(results, "inventory metadata", ownerA.rpc("upload_desktop_inventory_metadata", { target_business_id: manifest.businessAId, source_business_public_id: sourceA, source_device_public_id: deviceA, positions: [{ product_id: 10, reserved_milli: 3, damaged_milli: 1, minimum_milli: 12, maximum_milli: 600 }] }));
    const effective = await expectSuccess(results, "effective inventory read", ownerA.rpc("list_desktop_effective_inventory", { target_business_id: manifest.businessAId }));
    assert(effective[0].on_hand_milli === 105 && effective[0].reserved_milli === 3, "effective inventory values differ");

    const batch1 = crypto.randomUUID();
    const mirrorBase = { target_business_id: manifest.businessAId, source_business_public_id: sourceA, source_device_public_id: deviceA, source_batch_id: batch1, entity_type: "sales", source_generation: 1 };
    await expectSuccess(results, "financial mirror chunk", ownerA.rpc("stage_desktop_business_snapshot_chunk", { ...mirrorBase, expected_count: 1, records: [{ id: 1, record: { id: 1, sale_number: `P1C-${runId}`, total_amount_ugx: 5000, phase1c_run_id: runId } }] }));
    await expectSuccess(results, "financial mirror chunk retry", ownerA.rpc("stage_desktop_business_snapshot_chunk", { ...mirrorBase, expected_count: 1, records: [{ id: 1, record: { id: 1, sale_number: `P1C-${runId}`, total_amount_ugx: 5000, phase1c_run_id: runId } }] }));
    await expectSuccess(results, "atomic mirror finalization", ownerA.rpc("finalize_desktop_business_snapshot", mirrorBase));
    const batch2 = crypto.randomUUID();
    const mirror2 = { ...mirrorBase, source_batch_id: batch2, source_generation: 2 };
    await expectSuccess(results, "incomplete mirror staging", ownerA.rpc("stage_desktop_business_snapshot_chunk", { ...mirror2, expected_count: 2, records: [{ id: 2, record: { id: 2, total_amount_ugx: 7000, phase1c_run_id: runId } }] }));
    await expectDenied(results, "incomplete mirror rejection", ownerA.rpc("finalize_desktop_business_snapshot", mirror2));
    const mirrorRows = await expectSuccess(results, "web financial mirror owner read", ownerA.from("desktop_business_records").select("local_record_id,record").eq("business_id", manifest.businessAId).eq("entity_type", "sales"));
    assert(mirrorRows.length === 1 && mirrorRows[0].local_record_id === 1, "failed generation replaced prior mirror");
    const foreignMirror = await expectSuccess(results, "cross-business mirror read", ownerB.from("desktop_business_records").select("local_record_id").eq("business_id", manifest.businessAId));
    assert(foreignMirror.length === 0, "business B read business A mirror");

    await expectSuccess(results, "staff grant", ownerA.rpc("grant_business_staff", { target_business_id: manifest.businessAId, target_email: manifest.userBEmail, target_role: "cashier" }));
    await expectDenied(results, "non-owner mirror restriction", ownerB.from("desktop_business_records").select("local_record_id").eq("business_id", manifest.businessAId).then((data) => data.data?.length ? data : ({ error: { message: "RLS empty result", code: "RLS" } })));
    await expectDenied(results, "non-owner synchronization mutation", ownerB.rpc("upload_desktop_contacts", { target_business_id: manifest.businessAId, source_business_public_id: sourceA, source_device_public_id: deviceA, customers: [], suppliers: [] }));
    await expectSuccess(results, "staff deactivation", ownerA.rpc("deactivate_business_staff", { target_business_id: manifest.businessAId, target_user_id: manifest.userBId }));

    runSql("update private.desktop_devices set revoked_at=now() where business_id=:'business_id'::uuid and device_public_id=:'device_id'::uuid;", { business_id: manifest.businessAId, device_id: pairedDevice });
    await expectDenied(results, "revoked device rejection", ownerA.rpc("upload_desktop_contacts", { target_business_id: manifest.businessAId, source_business_public_id: pairedSource, source_device_public_id: pairedDevice, customers: [], suppliers: [] }));
  } catch (error) {
    mark(results, "qualification run", "FAIL", redact(error));
    throw error;
  } finally {
    manifest.finishedAt = new Date().toISOString();
    await save().catch(() => {});
    try { await cleanup(manifest, results); } catch (cleanupError) { mark(results, "cleanup", "FAIL", redact(cleanupError)); }
    const summary = { projectRef: PROJECT_REF, runId, results, passed: results.filter((r) => r.status === "PASS").length, failed: results.filter((r) => r.status === "FAIL").length, manifest: { ...manifest, userAEmail: "<redacted>", userBEmail: "<redacted>" } };
    await writeFile(reportPath, `${JSON.stringify(summary, null, 2)}\n`, { mode: 0o600 });
    console.log(`Sanitized report: ${reportPath}`);
    console.log(`Cleanup manifest: ${manifestPath}`);
  }
}

main().catch((error) => { console.error(`FAIL: ${redact(error)}`); process.exitCode = 1; });
