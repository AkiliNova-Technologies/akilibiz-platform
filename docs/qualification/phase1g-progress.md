# Phase 1G — implementation status (qualification execution pending)

Date: 2026-11-09  
Branches: both repositories' `dev` branches; production synchronization remains **disabled**.

## Implemented and committed

### Real desktop Rust worker (desktop repository)

- The opt-in `hosted_worker_qualification.rs` now exercises transport refusal, dropped HTTPS CONNECT tunnel, and stalled HTTPS CONNECT tunnel using the real production `run_cloud_sync_tick` path and an isolated local proxy.
- Asserts pending catalogue and stock evidence are not acknowledged by transport failures.
- Verifies the movement retry-backoff deadline, then makes the **disposable test database only** eligible for immediate retesting to avoid waiting out the normal backoff. Production retry behavior is unchanged.
- Reuses the existing hosted worker restart/financial/inventory acceptance checks.

The stalled tunnel is subject to a bounded **test deadline**; this does not establish the exact reqwest request-timeout duration. An HTTPS CONNECT failure occurs before the hosted business RPC can be accepted. The Node harness independently covers interrupted hosted response/lost acknowledgement.

### Platform hosted qualification and browser

- `apps/business/scripts/qualify-phase1c-hosted.mjs` now has an **opt-in** `AKILIBIZ_PHASE1G_BROWSER=1` child that runs while the two run-scoped temporary Auth identities and business records are present, before `finally` cleanup.
- `apps/business/scripts/phase1g-browser-acceptance.mjs` uses a locally available Playwright Chromium installation and authorized Vercel deployment-protection bypass (or private Vercel SSO storage state). It tests actual sign-in/business selection, required business pages, tenant-specific customer/supplier/product rendering, financial mirror data separation, exact amounts, empty-page sync timestamp and invalid-entity rejection.
- No browser storage state, screenshots, HARs, or credentials are written to the repository or report.
- **Security correction:** Rust and browser qualification subprocesses now use explicit environment allowlists. The administrative `SUPABASE_SECRET_KEY` and `DIRECT_URL` are **not** inherited by either child.
- Optional expired-token qualification now verifies an already-expired **ES256** fixture cryptographically against hosted public JWKS, rather than requiring the production legacy signing secret.
- `check-sync-security-posture.mjs` provides a read-only structural regression for eight private tables and 17 authenticated RPCs. The live pg_catalog checks passed when this was implemented.
- `.gitignore` ignores private browser session files.
- `phase1g-security-disposition.md` documents the outstanding security advisor decisions.

### Preview deployment

The GitHub `dev` branch deploys automatically to the protected Vercel Preview. Recent builds reached `READY`. This is **build-only** evidence, not browser acceptance evidence.

## Required single qualification execution

Follow [phase1g-local-validation.md](./phase1g-local-validation.md) in the secure development environment after pulling `dev` in both repositories. This run requires the dedicated qualification key, a local PostgreSQL client, Cargo, optional Playwright Chromium, and authorized preview protection access.

The new Rust fault test, local `node --check` checks, complete browser acceptance, and signed-expired-token fixture have **not** been executed by this remote-repository session. Do not represent them as passed.

## Remaining qualification gates

- Execute the consolidated disposable Phase 1G hosted run and inspect the cleanup result.
- Resolve any detected Rust/Node/browser failures and repeat only necessary targeted checks.
- Supply a genuinely expired, correctly signed test fixture or explicitly carry the expiry skip.
- Separate proof of reqwest native timeout and after-server-acceptance socket failure remains a coverage gap.
- Leaked-password protection remains disabled until an authorized configuration change is made.
- Production activation is a **no-go** until these are addressed and signed off.
