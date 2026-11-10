# Web-originated POS sales — implementation contract

**Status:** Implementation in progress on `dev`. No live web checkout.

AkiliBiz Phase 1G established desktop-to-hosted synchronization, not bidirectional posting. The hosted catalogue and inventory RPC are authoritative read projections of the latest acknowledged desktop state. They are **not** a transactionally locked checkout balance.

## Non-negotiable posting guarantees

1. Authenticate on the server and resolve the active business there. Never accept tenant/user identity or UGX selling prices from the browser.
2. Every sale submission uses a client-generated UUID v4 idempotency key, unique within the business. Replaying an accepted request returns its original authoritative result. A reused key with changed payload is a conflict.
3. Sale lines use hosted product UUIDs, **integer milliquantities**, and server-priced UGX integer amounts. Reject duplicate lines, inactive items, missing prices and unknown unit/currency metadata. Do not silently assume zero VAT: tax rules must be resolved from verified business tax settings.
4. One database transaction serializes all sale and stock operations for the business and source (including competing desktop checkpoints and movements), revalidates availability **after acquiring the lock**, and atomically commits the sale, lines, payment state, stock reservation/deduction, financial and audit entries, and a durable desktop-reconciliation event.
5. Check sale quantity against effective stock **net of reserved and damaged units, net of existing web reservations**. The current `list_desktop_effective_inventory` RPC does not yet subtract web-originated stock holds; do not enable posting until this is implemented and tested.
6. A successful request must not be acknowledged until the database transaction commits; network uncertainty must be resolved using the idempotency key, not by posting a second sale.
7. Payment states distinguish cash received, external-payment pending, confirmed, failed, and unknown. An unconfirmed mobile-money initiation is not a paid sale. Keep payment-provider secrets out of the browser.
8. Credit orders require a verified hosted customer identity and explicit permission and credit checks. Do not map a local desktop numeric customer ID directly to a hosted UUID.
9. Generate receipt identity and immutable totals from committed records, not the preflight response.
10. Web-originated sales must be consumed by the desktop exactly once. The desktop must apply the corresponding stock and accounting effects with source IDs and idempotent acknowledgements; incoming desktop stock checkpoints must not erase unconsumed web stock reservations. Test offline, reordering, concurrent checkout, retries and recovered receipts.

## Delivery order

- **Completed on dev:** authenticated read-only cart preflight, exact server UGX subtotal and milliquantities, business-scoped inventory access, fail-closed invalid inputs; POS stock display updated to net out reserved/damaged units.
- **Staged on dev (not applied to the hosted database):** additive private sale/line/payment/stock-hold/reconciliation-outbox schema, restricted cash-sale posting RPC, no-client-table grants, forced RLS, per-tenant and per-desktop-source locks, idempotent receipts, verified tax rule requirements, and a default-off posting gate. The REST endpoint is present but cannot post without explicit controlled database activation.
- **Mandatory next qualification:** apply the migration to an **isolated development PostgreSQL database** and execute syntax/security tests plus real concurrent cash sale, duplicate idempotency key, stock-exhaustion, tax calculation, tenant isolation, and error rollback tests before any production schema application. Validate that the stock read/quote models account for all pending web holds before enabling posting.
- **Then:** desktop reconciliation worker and durable applied/acknowledged state; reconcile stock and accounting. Implement a device-authorized, idempotent outbox consumer; verify that holds are released only when the corresponding desktop movement is visibly reflected in hosted stock.
- **Only after qualification:** connect checkout UI, permit supported payment methods and receipt printing, and run full acceptance with two concurrent cashiers and offline desktop recovery.

## Release gates

**Do not manually insert a row with `cash_posting_enabled=true` in production.** No operator activation procedure exists until the isolated transactional and desktop consumer tests have passed. The new schema and endpoint are a tested TypeScript integration foundation, **not** an accepted database transaction implementation yet.


The production synchronization switch does not authorize web-originated sales. `canSubmitSale = false` must remain until the complete posting/reconciliation contract is proven. No direct browser writes to the inventory mirror or desktop financial snapshots.
