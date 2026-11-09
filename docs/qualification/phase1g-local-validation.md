# Phase 1G — single local qualification run

**Status:** Implementation prepared on both GitHub `dev` branches. The fault-injection and browser additions must be **executed** in a protected developer environment before Phase 1G can be marked passed. This is not production activation approval.

## Safety and prerequisites

- Preserve the existing installed desktop SQLite database. The runner creates an isolated temporary database.
- Run only with the dedicated qualification `sb_secret_` credential and dedicated `DIRECT_URL`. Keep them out of the terminal history, Git and reports.
- The runner creates **two temporary hosted identities and businesses**, runs the opt-in Rust test, and cleans those run-scoped resources in `finally`. The existing cleanup/recovery manifest is maintained.
- The desktop code enables movement and business-mirror flags **only in the Rust child process**. The production flags remain disabled.
- Never run with `--force`, apply migrations, reset databases, or expose the JWT signing secret.
- The `dev` Vercel preview is protected. Authorized automation must authenticate at Vercel **and** sign in as the temporary AkiliBiz owner.

## 1. One-time browser setup (optional if browser acceptance is not yet enabled)

Install Playwright in a **separate local testing folder**, leaving the repository dependency lockfile untouched:

```bash
mkdir -p "$HOME/.cache/akilibiz-playwright"
npm install --prefix "$HOME/.cache/akilibiz-playwright" --no-save playwright@1.56.1
"$HOME/.cache/akilibiz-playwright/node_modules/.bin/playwright" install chromium
```

Set `AKILIBIZ_PLAYWRIGHT_MODULE` to the absolute location of the installed module, for example `$HOME/.cache/akilibiz-playwright/node_modules/playwright/index.mjs`.

Supply **one** authorized deployment-protection method:

- Recommended: create an automation bypass secret in the project's Vercel Deployment Protection settings; supply its value to the local runner as `AKILIBIZ_VERCEL_BYPASS_SECRET`. It is not a Supabase credential and does not bypass AkiliBiz login or database authorization.
- Alternative: supply the path of an existing, private Playwright `storageState` JSON file already authenticated to Vercel via `AKILIBIZ_VERCEL_STORAGE_STATE`. Keep this file outside Git and restrict its filesystem permissions.

Never publish the bypass token, browser storage state, traces, HARs or session cookies. See [Vercel automation bypass documentation](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

Use the protected `dev` preview hostname from the Vercel project deployment page for `AKILIBIZ_PREVIEW_URL` (just the `https://...vercel.app` origin, no path or query string).

## 2. Read-only structural check

From `~/Desktop/akilibiz-platform/apps/business`:

```bash
node --check scripts/check-sync-security-posture.mjs
node --check scripts/phase1g-browser-acceptance.mjs
node --check scripts/qualify-phase1c-hosted.mjs
```

Then run `pnpm verify:sync-security` in the environment where your dedicated `DIRECT_URL` is securely loaded. This reads pg_catalog only. It must report eight protected staging tables and 17 constrained authenticated RPCs.

## 3. Run disposable real-worker + protected browser acceptance once

Before execution, check out/pull `dev` in **both** repositories and preserve unrelated local changes. Set the following in the **process environment**, not in Git:

| Variable | Value |
| --- | --- |
| `AKILIBIZ_PHASE1C_RUN` | `execute:vntqfaheiwotinpuefzl` |
| `AKILIBIZ_REAL_DESKTOP_WORKER` | `1` |
| `AKILIBIZ_DESKTOP_REPO` | Absolute path to `~/Desktop/akilibiz` |
| `AKILIBIZ_PHASE1G_BROWSER` | `1` |
| `AKILIBIZ_PREVIEW_URL` | Protected `dev` preview origin |
| `AKILIBIZ_PLAYWRIGHT_MODULE` | Absolute path to Playwright `index.mjs` |
| `AKILIBIZ_VERCEL_BYPASS_SECRET` | Local protected bypass token, **or** use `AKILIBIZ_VERCEL_STORAGE_STATE` |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DIRECT_URL` | From the existing secure local qualification configuration |

For example, if these are securely set in your current environment and the local qualification env file is `.env.hosted-rls`:

```bash
cd ~/Desktop/akilibiz-platform/apps/business
node --env-file=.env.hosted-rls scripts/qualify-phase1c-hosted.mjs
```

The script rejects missing opt-in flags. It passes temporary **user-scoped** credentials to the browser test and real Rust worker, and does not give the administrative secret to either. The Rust test now also exercises a refused connection, dropped HTTPS CONNECT tunnel, and stalled HTTPS CONNECT handshake before retry/restart recovery.

The stall assertion is an **outer bounded worker deadline**, not proof that reqwest's configured 20–60-second request timeout itself elapsed. HTTPS CONNECT tests exercise TLS tunnel setup, not a socket reset after the hosted server accepted a business RPC; the Node harness still covers real hosted lost acknowledgements. Treat these limitations as remaining coverage distinctions.

## 4. Signed expired-token option

An additional optional `AKILIBIZ_EXPIRED_ACCESS_TOKEN` can be supplied from a **separate approved, short-lived test-user session** after that token genuinely expires. The harness checks that:

1. The token is already expired, and not older than 14 days.
2. It has the approved project issuer, audience and authenticated role.
3. It is ES256 signed and its signature verifies against the hosted public JWKS.
4. The hosted PostgREST RPC rejects the expired bearer with HTTP 401.

This does **not** require or read `SUPABASE_LEGACY_JWT_SECRET`. Do not use an existing customer's access token or put test tokens into a report. If no expired test token is available, the expiry assertion remains explicitly skipped.

Reference: [Supabase JWT verification documentation](https://supabase.com/docs/guides/auth/jwts).

## 5. Acceptance

Only mark Phase 1G passed if the hosted report confirms the Rust/browser tests passed, the optional expiry test was genuinely executed (not SKIP), the cleanup manifest shows zero run-scoped remaining records, and the security findings have documented dispositions. Leaked-password protection still requires owner approval/configuration in Supabase Auth settings.

**No production sync activation** is authorized by this guide.
