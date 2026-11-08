# AkiliBiz desktop → web synchronization: current capabilities

As of 2026-11-08. Desktop SQLite remains the source of truth for offline
operations. All cloud uploads are authenticated against the registered
Supabase business and device. **No SQLite business data is erased or reset.**

## Implemented and deployed
- Desktop-origin business registration and paired desktop device ownership.
- Initial catalogue snapshot with 13 categories and 65 products verified in
  the current hosted project (at the time of verification).
- Durable SQLite change capture for category and product inserts, edits and
  deactivations; an application worker attempts delivery every 45 seconds
  **while an authenticated cloud owner session is present**.
- Cloud receipt table makes retries idempotent. Desktop acknowledges each
  outbox event only after receiving a successful server response.
- In-memory cloud session renewal while the application remains open.
  A fresh sign-in is required after application restart.
- Contact directory snapshot: explicit desktop action, owner-only cloud reads,
  source UUID upserts and source-scoped soft-deactivation. Only customer and
  supplier contact details, types, loyalty points and supplier payment terms are
  uploaded; financial balances are excluded.
- Inventory stock-position snapshot: explicit desktop action, exact integer
  milli-quantities only (or NULL when unknown). Inventory movements, valuation,
  COGS and journals are not duplicated or posted.
- Web Products, Categories, Customers, Suppliers and Inventory primary screens
  now read hosted snapshots for the selected authenticated business.
- Web dashboard derives only available directory/stock counts from hosted
  records. Financial amounts are shown unavailable, not made-up zeros.

## Next safety gates before declaring full business synchronization
1. Validate Rust compile with a correctly generated Cargo.lock. CI currently
   cannot pass `cargo test --locked` because the repository lockfile is stale.
2. Exercise live owner/device incremental updates and replay under network loss,
   auth expiry and concurrent local edits; verify owner revocation.
3. Add durable, independently audited sales, sale_items, payment, expense, tax,
   receivable, payable, supplier purchase and posted journal contracts. Use
   exact UGX and milli quantities, immutable source IDs and local audit
   provenance; never recompute legacy REAL columns or post cloud-side
   accounting transactions during replication.
4. Add contact and inventory change capture and authenticated automatic
   delivery if ongoing uploads are desired rather than manual snapshots.
5. Add cross-device restore/downstream read-only hydration only after identity,
   conflict resolution and local accounting consistency have been audited.
6. Review retention/consent and staff permissions for personal contact data.
7. Scale upload paging beyond the initial 5,000-row safeguards and audit
   hard-delete/tombstone semantics across business modules.

## Verification
Supabase RPCs and RLS are deployed. Anonymous callers are denied execution.
The hosted database still contains only the previously confirmed catalogue
records until the owner's desktop explicitly uploads contact and stock data.
Do not infer success solely from the existence of source code or migrations.
No automatic post-restart sync without cloud sign-in is claimed.
