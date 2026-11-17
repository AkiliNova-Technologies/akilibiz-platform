# Supplier payments Phase 3 qualification — 2026-11-17

## Outcome

Phase 3 is integration-qualified with all production activation gates disabled. A web user can prepare an immutable, tenant-scoped supplier-payment request; an authorized paired desktop can stage it, require an explicit staff decision, atomically post it through the existing supplier-payment service exactly once, persist a durable decision receipt, and retry the hosted acknowledgement after interruption. Rejection is durable and cannot later be approved.

Implementation commits:

- Web: `5e8daaa` (`feat: add supplier payment request workflow`)
- Desktop: `2896fcb` (`feat: qualify supplier payment review workflow`)

No production deployment or production database change was performed.

## Contracts and migrations

- Hosted migration: `supabase/migrations/20261117195919_supplier_payment_requests.sql`
- Desktop migrations: `0123_cloud_supplier_payment_review_inbox.sql` and `0124_cloud_supplier_payment_decision_receipts.sql`
- Hosted payloads use exact whole-UGX integers and a SHA-256 payload digest. An identical idempotency replay returns the original command; a changed replay conflicts.
- Hosted preparation validates owner access, active device pairing, tenant ownership, one supplier, mirrored payable balances, allocation totals, supported method, and non-over-allocation. It never posts inventory, payable, journal, VAT, or cash/bank transactions.
- Desktop approval revalidates hosted pending authorization and calls the existing atomic `allocate_supplier_payment` path. That service now rejects invalid dates/methods, closed periods, stale balances, and changed payment-reference replays.
- The immutable desktop decision receipt is committed with the authoritative payment. Hosted ACK is a separate retryable transition, so loss of network after local commit cannot duplicate posting.

## Default-off activation gates

- Web request preparation: `AKILIBIZ_ENABLE_WEB_SUPPLIER_PAYMENT_REQUESTS=1`
- Desktop receive: `AKILIBIZ_ENABLE_SUPPLIER_PAYMENT_REVIEW_INBOX=1`
- Desktop apply: `AKILIBIZ_APPLY_SUPPLIER_PAYMENT_REVIEW_INBOX=1`
- Desktop ACK: `AKILIBIZ_ACK_SUPPLIER_PAYMENT_REVIEW_INBOX=1`
- Desktop review UI: `VITE_AKILIBIZ_SUPPLIER_PAYMENT_REVIEW_UI=1`

Every gate requires the exact value `1`; none was enabled in repository configuration.

## Qualification evidence

### Disposable PostgreSQL 17

A clean `postgres:17` container with the minimum hosted fixture applied the migration successfully. The qualification script verified:

- identical request replay returns the same command;
- changed replay is rejected;
- over-allocation and mixed-supplier allocation are rejected;
- cross-tenant access is rejected;
- one pending command is delivered to the intended active device;
- applied acknowledgement is idempotent;
- a revoked device cannot fetch/verify the command.

The disposable container was removed after the run.

### Disposable SQLite and desktop

- `phase04_purchasing_workflows`: 6/6 passed before the added concurrency case; the new concurrent double-settlement case also passed independently (1/1).
- Supplier-payment inbox unit tests: 3/3 passed, covering exact multi-allocation parsing, malformed input, immutable unique decisions, and single ACK transition.
- `cargo check`: passed.
- Desktop frontend production build: passed (existing bundle-size warning only).
- Targeted Phase 3 frontend ESLint: passed.
- Desktop frontend test suite: 164/165 passed. The sole failure is the pre-existing AccountPage untranslated-English assertion and is unrelated to Phase 3.

### Web

- Vitest: 56 files, 248 tests passed, including API and cross-repository contract tests.
- TypeScript typecheck: passed.
- ESLint: zero errors and five pre-existing warnings.
- Next.js webpack production build remains blocked before compilation by `Could not parse output from TypeScript's --showConfig`. Running the same local TypeScript binary with `--showConfig` produced valid parseable JSON, so this is recorded as a tooling/environment blocker rather than an application or type failure.

## Scenarios covered

The combined PostgreSQL, SQLite, API, contract, and inbox tests cover partial and full settlement, multiple payables, over-settlement, changed and identical replay, concurrent requests, stale payable state, closed accounting periods, revoked device access, tenant isolation, rejection, acknowledgement retry, and network interruption after local commit.

## Deployment order and activation prerequisites

1. Back up and apply the hosted migration; leave the web gate disabled.
2. Ship desktop migrations and code; leave receive/apply/ACK/UI gates disabled.
3. Resolve the Next.js webpack tooling failure and rerun the production build.
4. In a non-production pilot tenant, enable receive and UI first and verify staging only.
5. Enable apply for trained staff and verify the authoritative payment, allocations, journal/cash-or-bank effects, and durable receipt.
6. Enable ACK last; test loss of network between local commit and hosted ACK.
7. Enable web preparation only after monitoring, rollback, support, and reconciliation procedures are approved.

Rollback means disabling the gates. Never delete local decision receipts or authoritative payments to force a replay; pending acknowledgements are designed to retry safely.
