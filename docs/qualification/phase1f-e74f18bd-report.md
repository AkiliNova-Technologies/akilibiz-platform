# Phase 1F real desktop-worker qualification

- Date: 2026-11-09
- Hosted project: `vntqfaheiwotinpuefzl`
- Run: `e74f18bd-d343-4aaf-9f6f-304d9f128cb0`
- Result: 57 passed, 0 failed, 1 skipped
- Production synchronization gates: disabled

## Real worker coverage

The opt-in qualification runner created two disposable businesses and identities, then launched the ignored Rust integration test against an isolated temporary SQLite database. The test invoked the same `run_cloud_sync_tick` function used by the 45-second Tauri loop. Stock-movement and business-mirror flags were enabled only in the child qualification process.

The production worker completed Auth refresh, initial and incremental catalogue delivery, customer and supplier snapshots, inventory-position delivery, checkpoint confirmation, ordered movement replay, and financial-mirror publication. Reconstructing application state over the same file-backed database verified durable restart recovery. Hosted verification preserved the exact `12345` UGX financial amount and produced the expected `1500` milli-unit inventory balance.

The surrounding hosted suite verified real PostgREST lost-acknowledgement retries, transport socket interruption and recovery, duplicate protection, pairing retry, tenant isolation, staff restrictions, device revocation, incomplete mirror rejection, atomic publication, and prior-generation visibility.

## Qualification boundary

The Rust worker itself was not subjected to an injected socket failure or request timeout. Those transport cases were exercised by the real hosted Node harness, while Rust regression tests cover durable queue retry and restart behavior. Revoked membership, cross-business rejection, and incomplete mirror behavior were also exercised through the hosted harness rather than by the Rust entry point.

The correctly signed expired legacy-JWT test was skipped because `SUPABASE_LEGACY_JWT_SECRET` was intentionally not supplied. The worker did exercise the production refresh-token path by starting with an expired local access-session timestamp.

No linked Vercel project metadata, preview URL, or browser-test configuration was available in this checkout, so protected-preview rendering was not executed. The authenticated Supabase read models and financial values were verified through the hosted API.

## Cleanup

Cleanup ran in `finally` and removed only run-scoped records and identities. A separate read-only query confirmed zero remaining test businesses, memberships, desktop origins, financial mirror records, and Auth users. No credentials or tokens are retained in this report or its cleanup manifest.

## Security advisor status

The post-run advisor reported informational no-policy notices for eight private staging tables, warnings for 17 intentionally authenticated `SECURITY DEFINER` RPCs, and disabled leaked-password protection. The qualification verified RPC authorization, device checks, owner/staff restrictions, and cross-business isolation, but the warnings remain production-readiness review items.

## Assessment

The disposable real-worker path is qualified for the tested synchronization contracts, with SQLite remaining authoritative and hosted publication idempotent. Production activation remains a **no-go** until the skipped signed-expired-token case, direct Rust transport-fault injection, protected-preview browser acceptance, and security-advisor disposition are completed.
