# AkiliBiz Web — Implementation inventory and completion sequence

**Source inspected:** `AkiliNova-Technologies/akilibiz-platform` `dev`, November 14, 2026.
**Purpose:** Complete web operations before the final disposable-database integration tests. Source capabilities do not establish production availability, complete workflows, or deployed migrations.

## Non-negotiable architecture

- The Tauri/SQLite desktop remains authoritative for inventory, finance,
  receipts, product approval, purchasing, supplier payments, tax and sale
  posting. The browser cannot mutate desktop-owned tables directly.
- The hosted Next.js app runs authenticated Supabase business-scoped read
  models and explicit staged commands where implemented.
- Every hosted mutation needs role checks, idempotency, durable receipt,
  server-side validation and desktop-authority synchronization where applicable.
- Feature gates stay **off** until acceptance on disposable local environments.
- Continue targeted TypeScript/Vitest checks during implementation; run full
  PostgreSQL + disposable SQLite, multi-role and recovery tests at final
  integration. Destructive tests are last.
- Avoid mock records, fake KPI zeroes, or silent fallback to incomplete mirrors.

## Verified code status

| Area | Source present | Outstanding operational work |
| --- | --- | --- |
| Authentication, businesses | Sign-in/up, recovery, active business context, pairing foundation | Full multi-business session and RLS acceptance, lifecycle qualification |
| Dashboard/analytics | Hosted overview and reports pages | KPI correctness by period, stock and finance refresh paths |
| Product catalogue/categories | Hosted synchronized catalogue, pagination, filters, exports | Owner-authorized edit/deactivate desktop command path; synchronization qualification |
| Product preparation | Drafts, request staging, desktop approval, receipt ACK, server recovery | Full isolated migration + end-to-end qualification; user-visible status after real upload |
| Inventory | Hosted positions, movement history and adjustment UI | Full safe adjustment posting and stock/valuation acceptance |
| Customers/suppliers directory | Authenticated hosted directories, pagination/search/export; staged create/update pilots | Create/edit command integration qualification and deletion/deactivation semantics |
| POS | Hosted cash pilot, quote, idempotent request/status APIs | Complete sale/payment/receipt/cancellation lifecycle and noncash methods |
| Sales History/Reports | Financial mirrors, sale drilldown, read-only register | Full receipt support and owner/staff permissions; comprehensive paging/report testing |
| Supplier purchase orders | Page and desktop-like UI; `usePurchaseOrdersData` has empty in-memory list and throws on writes | Implement authoritative hosted order view + staged create/edit/receipt commands |
| Supplier payments | Mirror read adapter; disabled add/edit/settlement | Finish supplier payment evidence, allocation and safe settlement command |
| Expenses/Income/Cashflow | Financial mirror readers; expense add/settle/reverse intentionally unavailable | Desktop-owned finance command workflows, accounting period/approval controls |
| Tax/Accounting | Tax snapshots, journal/ledger/period readers | Qualified tax-settings/period posting, reconciliation and full report behavior |
| Purchasing reports | `useReportsPurchasingData` contains an empty fixed array | Publish/consume verified goods-received records; real date/range and detail |
| Inventory reports | Stock-on-hand reader | Complete movement register, valuation and exceptions from authoritative sources |
| Staff/roles/audit | Hosted staff/listing foundation, desktop-style navigation | Qualified role/staff action RPCs and isolation tests |
| Settings | Authenticated business profile, read-only receipt/tax snapshots, pairing | Explicit authorized settings update commands with audit and sync |
| Backup/restore | Deliberately disabled web actions | Separate hosted backup/restore policy; do not offer SQLite restore from web |

## Implementation order

**Workstream A — Core operations:** complete hosted catalogue lifecycle,
customer/supplier commands and POS/sales, with concurrent stock availability
and durable receipt semantics.

**Workstream B — Purchasing/inventory:** publish purchase order, goods
received, inventory adjustment and stock-cost source contracts. Add web
review/command flows only after authorization and finance/stock semantics.

**Workstream C — Financial operations:** finance posting, supplier payments,
tax/accounting periods and reconciliation with audit and idempotency.

**Workstream D — Management/exports:** staff permissions, settings commands,
reporting, dashboards, exports, pagination and mobile/responsive review.

**Workstream E — One final local qualification:** disposable Supabase-compatible
PostgreSQL plus disposable desktop SQLite; migrate in order, test authorization
boundaries, current and concurrent operations, outbox/ACK and stale recovery,
report reconciliation, production-like build. Destructive/reset tests LAST,
then delete disposable resources.

## This implementation increment

Sales Reports source was changed to prevent real cash-overpayment records from
being incorrectly dropped, apply the requested UTC date period to the actual
visible register, avoid stale results after failure, enable refresh, populate
the register metrics from verified rows, and export only the verified period
as CSV with spreadsheet formula escaping. The source tests cover both
observed historic overpayments, partial credit, bad change, date boundaries
and export integrity.

Do not confuse these source changes with an end-to-end deployment. The live
AkiliBiz Supabase migration history still lags the repository and **must not**
be used as the disposable integration environment.
