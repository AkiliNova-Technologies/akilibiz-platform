# Phase 5 POS and sales lifecycle qualification — 2026-11-18

## Decision

**Not integration-qualified. Keep every production activation gate disabled.**

This increment qualifies the cash-sale posting core and desktop exactly-once application in disposable databases. It does not qualify the complete Phase 5 scope or a live paired browser-to-desktop transport.

## Implemented boundary

- Authenticated, business-scoped, default-off web cash submission and status APIs.
- Server-priced whole-UGX cash sale with integer milliquantities and serialized hosted stock holds.
- Cash tender at or above total, with desktop-authoritative change due.
- Atomic canonical desktop sale application using existing stock, tax, accounting, payment, and receipt services.
- Durable hosted request replay protection, durable local apply receipt, idempotent ACK, and authoritative local receipt synchronization.
- Recovery using the original browser request UUID after an interrupted or ambiguous request.
- Hosted provisional identifiers are not exposed as printable receipt numbers.

## Validation evidence

### Web

- Full Vitest suite: **PASS — 57 files, 253 tests**.
- POS route/status focused suites: **PASS — 13 tests**.
- TypeScript `--noEmit`: **PASS**.
- ESLint: **PASS — 0 errors, 5 existing warnings**.
- Next.js webpack production build: **PASS — 75/75 pages**.

### Desktop

- `phase04_sales_workflows`: **PASS — 16/16**, including cash-change financial retention and real staged apply/replay.
- `web_sale_inbox`: **PASS — 1/1**.
- Inventory runtime: **PASS — 6/6**.
- Sale print documents: **PASS — 2/2**.
- `cargo check`: **PASS**.
- Frontend production build: **PASS**.
- Frontend tests: **164/165**; the remaining AccountPage translation assertion predates and is unrelated to Phase 5.
- Frontend lint: **FAIL — one unrelated existing `SettingsBackupRestorePage.tsx` hook dependency error**.
- `cargo fmt --check`: **FAIL — only unrelated existing formatting in dirty `cloud_sync_handler.rs`; Phase 5 files are formatted**.

### Disposable PostgreSQL 17

The relevant staged POS migrations plus `20261118083552_phase5_pos_cash_lifecycle.sql` applied cleanly to a fresh PostgreSQL 17 database. Assertions passed for:

- tender 7,000 UGX, total 5,000 UGX, change 2,000 UGX;
- identical request replay returning the same sale;
- changed request replay rejection;
- exactly one hosted sale, payment, and stock hold;
- retained hosted payment of exactly 5,000 UGX;
- v2 desktop ACK with authoritative local sale `SALE-LOCAL-41`;
- status exposing that local receipt only after application;
- identical ACK replay acceptance and changed-receipt conflict;
- exactly one durable ACK receipt.

The disposable container and data were removed after qualification. No production or shared hosted database was modified.

### Disposable SQLite

The real desktop staged-apply path posted a 5,000 UGX sale with 7,000 UGX tender and 2,000 UGX change. Replaying the same hosted sale returned the existing apply receipt. Assertions confirmed one sale, one retained 5,000 UGX payment, one 5,000 UGX finance transaction, and no duplicate stock or accounting post.

## Remaining acceptance blockers

- No live browser/API/hosted transport/desktop worker/ACK/reconciliation run against one paired disposable environment.
- No hosted credit, split tender, card/mobile-money provider state machine, or partial settlement contract.
- No web returns/refunds/exchanges and no original-sale-linked stock/tax/accounting reversal qualification.
- No product-variant or selling-unit conversion contract and no persisted quote identity/expiry contract.
- No paginated high-volume POS catalogue search or measured 50/500/5,000-product latency acceptance.
- No authoritative hosted cashier-to-local-staff mapping for unattended local application.
- No immediate web rendering/printing of the full canonical desktop receipt payload.
- Revocation, tenant isolation, concurrent cashier, and network interruption have component coverage but not one paired end-to-end acceptance run.

## Activation gates

Leave `AKILIBIZ_ENABLE_WEB_POS_SALES`, `NEXT_PUBLIC_AKILIBIZ_ENABLE_WEB_POS`, the hosted per-business cash-posting control, and all desktop inbound fetch/apply/ACK/reconciliation flags disabled. This qualification authorizes no deployment, production database migration, or real transaction processing.
