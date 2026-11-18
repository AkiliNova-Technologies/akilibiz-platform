# Expense Management Phase 4 qualification — 2026-11-17

## Qualified revisions

- Web implementation: `d6f43d4` (`dev`)
- Desktop implementation: `acfa9f3` (`dev`)
- Production activation: disabled. Every hosted creation/settlement/void path and every desktop receive/apply/acknowledge/UI path requires an explicit opt-in environment gate.

## End-to-end contract

The web prepares immutable, tenant-scoped `create`, `settle`, or `void` commands. It does not post accounting or mutate authoritative balances. A paired desktop stages the command, verifies current hosted ownership/device/access state, and requires a staff decision. Approval invokes the existing authoritative expense, payable settlement, VAT evidence, and accounting services. Rejection records a durable terminal receipt without financial effects. Only a locally committed decision can be acknowledged to the hosted command.

The authoritative expense, settlement, or void source row stores the command idempotency key in the same SQLite transaction as its financial effects. The cloud decision receipt is durable acknowledgement/recovery metadata. If interruption occurs between local commit and that receipt/hosted acknowledgement, replay resolves the already-posted source operation and cannot duplicate inventory, payable, VAT, or journal facts.

## Activation gates (all default off)

- Web request submission: `AKILIBIZ_ENABLE_WEB_EXPENSE_REQUESTS=1`
- Hosted operation controls: `creation_enabled`, `settlement_enabled`, and `void_enabled` in `private.expense_management_controls`
- Desktop receive: `AKILIBIZ_ENABLE_EXPENSE_COMMAND_INBOX=1`
- Desktop apply: `AKILIBIZ_APPLY_EXPENSE_COMMAND_INBOX=1`
- Desktop acknowledgement: `AKILIBIZ_ACK_EXPENSE_COMMAND_INBOX=1`
- Desktop staff UI: `VITE_AKILIBIZ_EXPENSE_COMMAND_REVIEW_UI=1`

## Qualification evidence

### Hosted PostgreSQL 17 (disposable container)

PASS. A clean PostgreSQL 17 container applied the Phase 4 migration and disposable fixtures. Assertions covered identical create replay, create/settle/void pending commands, settlement acknowledgement and replay, excessive settlement rejection, changed-payload replay rejection, tenant isolation, and revoked-device denial. The container was removed after qualification; no production database was accessed.

### Desktop SQLite and services

- PASS: `cargo check`.
- PASS: expense command inbox focused suite, 4/4 (exact create; settlement/void contracts; malformed input; immutable unique receipt and one-way acknowledgement).
- PASS: serialized authoritative expense integration suite, 32/32. This covers paid and supplier-credit expenses, VAT and non-VAT evidence, full settlement, void, correction/refund invariants, closed periods, cross-tenant denial, and rollback behavior.
- PASS: desktop production frontend build.
- PASS: desktop lint.
- PASS with one pre-existing unrelated failure: desktop frontend suite 164/165. The remaining `AccountPage` untranslated-English assertion predates and does not exercise Phase 4.

### Web application

- PASS: TypeScript (`tsc --noEmit`).
- PASS: Phase 4 API tests, 3/3.
- PASS: full web tests, 57 files / 251 tests.
- PASS: web lint.
- PASS: Next production webpack build, including 75/75 generated pages. `experimental.useTypeScriptCli` is disabled so Next uses its installed TypeScript compiler API after its child-process CLI capture returned an empty configuration in this environment; type checking remains enabled.

## Scenario disposition

- Paid expense creation: qualified; exact UGX and journal facts post once.
- Supplier-credit creation and partial/full settlement: qualified; conditional payable updates reject concurrent/excess application.
- VAT evidence: qualified; eligible evidence is persisted atomically with posting.
- Void: qualified; existing authoritative reversal service is reused and replay safe.
- Concurrent or changed replay: qualified; stable request identity plus canonical digest and exact local payload comparison prevent divergent reuse.
- Revoked access/device and tenant isolation: qualified on hosted verification and local business scope.
- Network loss/interruption: qualified; staged commands and decision receipts retry independently, and acknowledgement is one-way after local commit.
- Corrections and refunds: deliberately not exposed as web-originated commands in Phase 4. Existing desktop services remain available locally; exposing them requires a separately qualified replacement/evidence contract.

## Residual operational note

Expense category choices on the web are sourced from synchronized authoritative expense snapshots because no hosted category catalogue contract is currently qualified. Existing businesses can prepare expenses using synchronized categories. A newly linked business with no synchronized expense history must create its first category-backed expense on desktop before web creation is usable. This is a product-scope limitation, not an accounting or idempotency safety gap.

## Decision

Phase 4 is **integration-qualified for the implemented create, settle, and void workflow**, with all production gates disabled. Production activation, corrections/refunds, and a dedicated synchronized expense-category catalogue remain outside this qualification.
