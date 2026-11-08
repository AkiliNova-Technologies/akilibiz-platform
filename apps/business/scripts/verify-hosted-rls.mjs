import { createClient } from "@supabase/supabase-js";

const requiredEnvironment = [
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "TEST_USER_A_EMAIL",
  "TEST_USER_A_PASSWORD",
  "TEST_USER_B_EMAIL",
  "TEST_USER_B_PASSWORD",
];

for (const name of requiredEnvironment) {
  if (!process.env[name]) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

const url = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const userAEmail = process.env.TEST_USER_A_EMAIL;
const userAPassword = process.env.TEST_USER_A_PASSWORD;
const userBEmail = process.env.TEST_USER_B_EMAIL;
const userBPassword = process.env.TEST_USER_B_PASSWORD;

function createTestClient() {
  return createClient(url, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

function fail(message) {
  throw new Error(`FAIL: ${message}`);
}

async function signIn(client, label, email, password) {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    fail(`${label} could not sign in${error ? `: ${error.message}` : ""}`);
  }

  pass(`${label} signed in`);
}

function verifyDenied(result, resource) {
  if (result.error || !result.data || result.data.length === 0) {
    pass(`User B cannot read User A's ${resource}`);
    return;
  }

  fail(`User B received ${result.data.length} ${resource} record(s)`);
}

async function main() {
  const unauthenticated = createTestClient();
  const unauthenticatedBusinesses = await unauthenticated
    .from("businesses")
    .select("id");

  if (
    !unauthenticatedBusinesses.error &&
    unauthenticatedBusinesses.data &&
    unauthenticatedBusinesses.data.length > 0
  ) {
    fail("unauthenticated client can list protected business data");
  }
  pass("unauthenticated client cannot list protected business data");

  const userA = createTestClient();
  const userB = createTestClient();
  await signIn(userA, "User A", userAEmail, userAPassword);
  await signIn(userB, "User B", userBEmail, userBPassword);

  const testBusinessName = `PHASE1 RLS verification ${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const { data: business, error: createBusinessError } = await userA
    .from("businesses")
    .insert({ name: testBusinessName })
    .select("id, name")
    .single();

  if (createBusinessError || !business) {
    fail(
      `User A could not create the verification business${createBusinessError ? `: ${createBusinessError.message}` : ""}`,
    );
  }
  pass("User A created the verification business");

  const { data: ownBusinesses, error: ownBusinessError } = await userA
    .from("businesses")
    .select("id, name")
    .eq("id", business.id);
  if (ownBusinessError || ownBusinesses?.length !== 1) {
    fail("User A cannot read the verification business");
  }
  pass("User A can read the verification business");

  const { data: ownMemberships, error: ownMembershipError } = await userA
    .from("business_memberships")
    .select("business_id, user_id, role, active")
    .eq("business_id", business.id);
  if (ownMembershipError || ownMemberships?.length !== 1) {
    fail("User A cannot read the owner membership");
  }
  pass("User A can read the owner membership");

  const { data: ownAuditEvents, error: ownAuditError } = await userA
    .from("audit_events")
    .select("id, business_id, event_type, entity_type, entity_id")
    .eq("business_id", business.id);
  if (ownAuditError || ownAuditEvents?.length !== 1) {
    fail("User A cannot read the business-created audit event");
  }
  pass("User A can read the business-created audit event");

  verifyDenied(
    await userB.from("businesses").select("id").eq("id", business.id),
    "business",
  );
  verifyDenied(
    await userB
      .from("business_memberships")
      .select("business_id, user_id")
      .eq("business_id", business.id),
    "membership",
  );
  verifyDenied(
    await userB
      .from("audit_events")
      .select("id")
      .eq("business_id", business.id),
    "audit event",
  );

  console.log("\nCreated verification records:");
  console.log(`business_id=${business.id}`);
  console.log(`membership_business_id=${ownMemberships[0].business_id}`);
  console.log(`membership_user_id=${ownMemberships[0].user_id}`);
  console.log(`audit_event_id=${ownAuditEvents[0].id}`);
  console.log(`business_name=${business.name}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
