# Phase 1G — implementation progress (not a pass report)

Date: 2026-11-09

## Changes committed directly to GitHub `dev`

### Desktop

- `src-tauri/tests/hosted_worker_qualification.rs`: added a controlled loopback HTTPS proxy connection-refusal attempt via the real `run_cloud_sync_tick` Rust worker.
- The test restores the original environment proxy settings, verifies the initial catalogue dirty marker remains pending, and then resumes the existing real-worker hosted qualification to test delivery recovery.
- The test is intentionally ignored outside the opt-in disposable hosted qualification run. It has **not yet been executed** against the newly added fault path. A connection refusal does not cover a stalled read timeout or connection drop after server acknowledgement.

### Platform

- `apps/business/scripts/check-sync-security-posture.mjs`: read-only regression assertions for eight private table boundaries and 17 authenticated SECURITY DEFINER RPC entry points.
- `apps/business/package.json`: added `pnpm verify:sync-security` command.
- `docs/qualification/phase1g-security-disposition.md`: formal interim disposition of advisor findings, with linked remediation guidance.
- Hosted pg_catalog queries were executed and confirmed all eight protected table boundaries and all 17 fixed `search_path` + anonymous-RPC restrictions. The full local script itself requires a local `psql` binary and protected `DIRECT_URL`; do not mark it as executed until run in that environment.

## Not yet completed

1. Execute updated Phase 1F/1G disposable qualification once to verify the Rust refused-connection assertion and recovery; confirm cleanup remains zero.
2. Add controlled timeout and post-send socket-reset injection using a deterministic local proxy where the real Rust HTTP client can be tested, without disrupting Supabase.
3. Perform authenticated protected-Vercel browser acceptance with disposable identities/businesses. Vercel authentication and private test identity credentials must not be bypassed or embedded in Git.
4. Exercise a correctly signed expired access token using a legitimate short-lived test Auth token or an isolated signer, never the legacy hosted signing secret.
5. Enable leaked-password protection through the authorized Supabase Auth settings, if available, and test Auth flows.

**Production synchronization remains a no-go**. No hosted schema or production feature flags were changed during this work.
