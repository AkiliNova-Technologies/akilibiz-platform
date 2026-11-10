# Phase C — Hosted domain readiness and source contracts

Updated 2026-11-10. Scope: **read-only desktop → hosted web mirrors**.
The SQLite business ledger remains authoritative. No cloud-side financial posting,
journal, payment, stock adjustment, or tax recalculation is permitted here.

## Verified hosted foundation

- `public.desktop_business_records` stores immutable-ish published JSON
  snapshots scoped by `business_id`, `local_business_public_id`,
  `entity_type`, and `local_record_id`.
- Atomic publishing uses staged, generation-aware batches; incomplete batches
  must never appear as complete data.
- The existing `/api/financial-mirrors` endpoint requires the active business
  membership, restricts financial mirrors to `owner`, filters on both business
  and an exact entity allowlist, paginates, and includes sync metadata.
- Read-only receipt, tax and finance views must preserve `null`/unknown,
  never silently convert absent amounts to zero, and must display the source
  of timestamps (publication/snapshot, not necessarily transaction time).

Live project verification on 2026-11-10: `desktop_business_records` had no
rows for receipt settings, tax settings/configurations, sales, customer credit,
supplier payables, stock movements or goods receipts. Code existence alone
does not mean that desktop sync has been qualified and run.

## Domain contracts and gates

| Domain | Desktop source / mirror | Hosted consumer | Readiness gate |
| --- | --- | --- | --- |
| Receipt preferences | `receipt_settings` | Settings → Receipt | Owner-only read; exactly one validated snapshot; web edits disabled |
| VAT preferences | `tax_settings` plus `tax_configurations` | Settings → Tax | Exactly one valid snapshot of **each** entity; no inferred VAT registration |
| Customer purchase history | `sales`, `sale_items`, `sale_payments`, `customer_credit_events` | Customers → History/Credit | Confirm immutable customer identifiers, reconciliation and cancelled/reversed sales semantics before displaying totals |
| Supplier payables | `supplier_payables`, `supplier_payment_allocations`, `supplier_payments` | Suppliers → Payments/Overview | Validate supplier ID mapping, integer UGX balances, allocations and paid/partial statuses; never derive payable totals from contact records |
| Stock movements | `stock_movements` and checkpoint receipts | Inventory → History/Adjustment | Reconcile against qualified checkpoint and source movement IDs; snapshot position timestamp is **not** movement date |
| Purchasing reports | `purchase_orders`, lines, `goods_receipts`, lines | Reports → Purchasing | Verify line totals, received quantities, cancellation and source identity; no demonstration records |
| Sales reports | `sales`, `sale_items`, `sale_payments` | Reports → Sales | Validate historical sale status, refunds, posted settlement and date boundaries |
| Financial reports | `finance_transactions`, `authoritative_expenses`, journals | Finance, Reports | Exact UGX, source states and tax evidence; authoritative summary contract required for aggregate metrics |

## Mandatory integration checks

1. Verify desktop captured generation and explicit upload/acknowledgement under
   authenticated owner/device credentials; an empty local source must publish
   a successful **zero-row generation**, not look like a failed transfer.
2. Confirm policy isolation by testing two businesses and owner vs staff access.
   Never fetch source mirrors into a broadly readable client cache.
3. Page beyond the final source batch: compare totals, detect missing pages,
   show stale/partial state and never silently substitute an empty table.
4. Validate raw JSON types and source IDs against actual SQLite migration
   columns. A field absent from the desktop table must **not** be required
   (e.g. `authoritative_expenses` has `state` and `payment_basis`, not
   a standalone `status` field).
5. Present `—` or a deliberate unavailable state for missing amounts; a
   genuine zero is only displayed when the source explicitly supplied zero.
6. Keep all operations that would mutate desktop-authoritative finance,
   inventory, payments, credit or tax disabled until separately qualified
   bidirectional workflows exist.
7. Test idempotent replay, stale generations, account switching, offline
   recovery and cancellation/reversal edge cases before accepting any totals.

## Implemented in this Phase C increment

- Owner-only `receipt_settings` added to the existing allowlist.
- Receipt and tax pages load validated source snapshots and render read-only
  controls only after successful publication; unknown/failed states are explicit.
- Added strict parsers and regression tests for integer SQLite booleans,
  missing fields, invalid profile names and unverified VAT data.
- Corrected expense mirror validation to respect the actual desktop schema;
  supplier-credit settlement remains unavailable without payable evidence.

**Not delivered:** sale/payment/credit history aggregation; stock movement
ledger qualification; supplier payable summaries; persisted web-side settings
edits; report aggregation; new migrations or production synchronization runs.
