# Phase 1E credential transition plan

## Verified consumers

| Consumer | Current key class | Required state |
|---|---|---|
| Desktop Tauri sync | `sb_publishable_` via compiled default or `AKILIBIZ_SUPABASE_PUBLISHABLE_KEY` | Ready |
| Next.js browser, server session client, and proxy | `sb_publishable_` via `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Ready |
| Phase 1 qualification setup and cleanup | `sb_secret_` via server-only `SUPABASE_SECRET_KEY` | Ready; provision a dedicated named qualification key before production |
| CI | No hosted Supabase credential | No change |
| Database migrations mentioning `anon`/`service_role` | PostgreSQL role grants/revocations, not stored credentials | No change |

No Edge Functions, database webhooks, `pg_net` callers, cron workers, or other
repository consumers of legacy keys were found. External deployment secret
stores and integrations still require an operator inventory because they are
not visible in source control.

The production browser-static build contained zero secret-key values, legacy
HS256 JWTs, or server-only credential variable names. New qualification runs
now reject a legacy key supplied in either the publishable or administrative
configuration slot.

## Current hosted state

- Project health: `ACTIVE_HEALTHY`.
- New disposable Auth sessions are signed with `ES256`.
- The public JWKS endpoint advertises one elliptic-curve ES256 key.
- Publishable and secret API keys exist and work.
- Legacy `anon` and `service_role` API keys are still listed and must be treated
  as enabled until disabled in the Dashboard.
- The exact current/previous/standby signing-key labels are visible only in the
  Dashboard. Do not revoke a key until that screen confirms the ES256 key is
  current and the legacy key is previous.

## Approval boundary and exact operations

The following live changes were **not** performed.

1. Create a named `qualification` secret key in **Settings → API Keys →
   Publishable and secret API keys**. Replace the default key in the protected
   qualification-runner secret store, validate Auth-admin creation/cleanup,
   then revoke only the old qualification secret key. Secret-key revocation is
   disruptive to consumers holding that individual key.
2. Confirm deployment variables use the publishable key and confirm the API-key
   last-use indicators for legacy keys are quiet for the agreed observation
   window. In **Settings → API Keys**, disable legacy `anon` and `service_role`.
   Disabling is reversible, but any missed legacy client immediately fails.
3. For the genuine expiry test, temporarily set the Auth access-token lifetime
   to **120 seconds**, create a disposable user/session, wait past expiry, verify
   the correctly signed token returns HTTP 401, verify refresh recovery, then
   restore the original lifetime. This affects every session minted during the
   short test window and therefore requires an announced maintenance window.
4. In **Authentication → JWT Signing Keys**, verify ES256 is current and legacy
   is previous. After at least the configured token lifetime plus 15 minutes
   from the last legacy-signed token, choose **Revoke** on the previous legacy
   key. Revocation invalidates every remaining token signed by that key.
5. Do not permanently delete either signing key during this change. Permanent
   deletion removes rollback capability and requires separate approval.
6. Enable leaked-password protection in **Authentication → Password Security**
   only after confirming the project is on Pro or above. Test rejection and
   ordinary sign-in/reset with disposable identities.

After each operation rerun the hosted qualification, verify cleanup, inspect
Auth/Data API logs for legacy-key failures, and run security advisors. Before
revocation, rollback is to re-enable legacy API keys or rotate the previous
signing key back into use. After revocation, clients must refresh or sign in
again; after permanent deletion no cryptographic rollback exists.
