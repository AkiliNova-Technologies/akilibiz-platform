# AkiliBiz Web — Functional Readiness Register

Updated: 2026-11-14. Branch: `dev`.

## Important distinction

Navigation parity with AkiliBiz Desktop is **not** functional parity. Web screens must not report zero business records when no hosted API has been implemented. The desktop and web systems also use different persistence (local per-business SQLite versus hosted authenticated business-scoped records).

## Confirmed from source in this increment

| Route / feature | Current implementation | Next acceptance requirement |
| --- | --- | --- |
| Dashboard overview | Hosted operational summary plus permitted financial mirror data | Verify each KPI's source, correctness, permissions and date windows; never show an unavailable KPI as zero |
| Business insights | Dedicated analytics page exists | Verify hosted analytics completeness and date window behavior |
| Customers / suppliers | Hosted business-scoped directory | Server-side 50-record pagination and name search implemented; validate exact counts, business isolation, and edit permissions against hosted data |
| Products | Hosted catalogue page exists | Confirm authoritative catalogue, stock availability, edit flows and permission enforcement |
| Business profile | Reads authenticated active business and allows owner updates | Verify saving and switching between hosted businesses |
| Backup / restore / sync | Web pairing exists; backup and restore buttons are explicitly disabled | Implement and qualify a hosted backup policy separately; do not upload a local SQLite file into a web business as an implicit restore |
| Dynamic desktop-module fallback | Unimplemented generic routes previously displayed `No records available` | Explicitly show unavailable state with links to working web areas; implement each route rather than treating the shell as finished |

## Changes in this increment

- On dashboard range changes/fetch failures, clear prior data instead of displaying old period values as though they belonged to the new period.
- Customer/supplier directory fails explicitly if it exceeds the current 5,000-row limit; it no longer silently displays an incomplete list.
- Generic desktop-module placeholder says the web workflow is not implemented and points users to implemented areas, rather than implying no records exist.

## Development sequencing

1. Establish per-route hosted data contracts (auth, business membership, pagination, permission levels, loading/error/empty and freshness).
2. Make dashboard, customers, products, sales and inventory operational first.
3. Implement remaining finance and reporting flows against verified authoritative hosted records, not fabricated calculations.
4. Implement cloud pairing/reconciliation and bidirectional contact sync only after sandbox acceptance. Production inbound sync remains disabled unless explicitly qualified.
5. Complete UI consistency and desktop parity after real actions and data contracts work.

## Validation

From the web repository root:

```bash
pnpm --filter @akilibiz/business-web exec tsc --noEmit
pnpm --filter @akilibiz/business-web test
```

A clean typecheck does not prove hosted data, RLS, CRUD, or synchronization acceptance. Exercise authenticated multi-business test accounts and the real hosted endpoints separately.

## Hosted contact directory pagination increment

The Customers and Suppliers pages now accept `?q=<name>&page=<number>`. The server validates pagination inputs, obtains an exact result count from Supabase, scopes **both** count and record queries by authenticated business membership, and requests only 50 records per page. Search is case-insensitive, bounded to 100 characters, and escapes SQL LIKE wildcards so literal names are matched. The UI includes Search/Clear, Previous/Next, result range, and page count.

Customer and supplier KPIs that cannot be computed globally from one page explicitly describe **this page**. Total/matching count uses the hosted query count, not the current page length. No production bidirectional contact flag is enabled.

**Still incomplete:** contact creation, import/export, server-derived customer financial metrics, hosted acceptance tests, and a full audit of other web business modules.

### Focused qualification

```bash
pnpm --filter @akilibiz/business-web exec tsc --noEmit
pnpm --filter @akilibiz/business-web test
```

Manually test searching for a contact on a later page, navigating 50+ results, clearing the search, switching hosted businesses and verifying no contacts from the previous business appear, and checking the owner-only edit gate. Typecheck and unit tests cannot replace these hosted RLS checks.

## Hosted contact CSV export increment

- Customers and Suppliers now have a functioning **Export CSV** button that requests `GET /api/contacts/export?entity=customers|suppliers`.
- The endpoint uses the authenticated Supabase client and `requireActiveBusiness()`. Both the record-count and data queries are constrained to the selected business; it never trusts a browser-provided business ID or uses service-role credentials.
- Exported fields are explicitly allowlisted. CSV output quotes embedded commas/quotes/newlines and prefixes potential spreadsheet formula cells to limit CSV formula injection.
- The export is bounded at 10,000 records, fetched in batches of 500. Larger exports fail clearly instead of silently downloading partial records. If the record count changes while exporting, the request fails and asks the user to retry.
- The browser download control reports server errors and does not claim success when an export fails.
- Customer/supplier **creation remains disabled in production**. A separate, default-off Phase 2B request/receipt protocol now stages new contact creation on the desktop; it requires qualification before activation. Direct web inserts into `desktop_customers` or `desktop_suppliers` remain prohibited.
- Existing owner-only update queue and environment gates remain unchanged.

### Focused checks

```bash
pnpm --filter @akilibiz/business-web exec tsc --noEmit
pnpm --filter @akilibiz/business-web test
```

Hosted acceptance: export each directory as an authorized user, confirm that the selected business is the only source, test empty directory behavior and the 10,000-record limit, and confirm that errors do not download a misleading file.

## Contact editing validation increment

The existing owner-only `/api/sync/contact-updates` endpoint now checks allowed field names, required contact values, size limits, email format, and control characters before forwarding a change to the version-checked desktop queue. This preserves the existing feature flag and desktop authority instead of introducing direct hosted mutations. Four additional regression tests cover these constraints.

Web contact creation now has a staged, default-off desktop-backed create command with idempotent request IDs and authoritative desktop acknowledgements. Do not turn on production contact creation or editing before an end-to-end qualification.

Latest focused qualification:
```bash
pnpm --filter @akilibiz/business-web exec tsc --noEmit
pnpm --filter @akilibiz/business-web test
```

## Phase 2B creation pilot implementation

- Added separate hosted create commands and owner-scoped request/status functions, guarded by a new database opt-in `contact_creates_enabled` (default false).
- Added `/api/sync/contact-creates` (POST queued/GET status), gated behind `AKILIBIZ_ENABLE_CONTACT_CREATION=1`, and owner-only Add Customer / Add Supplier dialogs.
- Added a separate desktop SQLite inbox and guarded receive/apply/ACK worker steps (migration 0116); desktop contact inserts and immutable receipts commit atomically, preserving outbound dirty-contact capture.
- No customer/supplier balance, purchases, inventory, tax, or financial columns are writable through this protocol.
- The older Phase 2A update-only commands and tables remain unchanged.
- Full contract, remaining acceptance and gate list: `docs/sync/phase2b-inbound-contact-creation-pilot.md`.

**Do not activate these gates or run the hosted migration on production without isolated pilot acceptance.** The code is staged, not qualified for production deployment.

## Non-destructive operational improvements — 2026-11-14

The current increment prioritizes verifiable hosted reads and safe exports. No existing customer, product, inventory, sales, or accounting data was changed.

### Delivered in code on `dev`

- **Products:** server pagination at 50 records per page, business-scoped name search, exact matching count and previous/next controls. The existing desktop-aligned table is retained. The category summary explicitly fails rather than showing a partial product count when its current 1,000-record capacity is exceeded.
- **Product and category export:** authenticated, business-scoped `/api/catalogue/export` CSV download. Approved fields only, explicit 5,000-record cap, no partial-response success, spreadsheet formula escaping and UI error reporting.
- **Stock movement history:** a read-only, business-membership-checked RPC `list_desktop_inventory_movement_history` and a paginated web table. Reads **accepted** desktop movement receipts only; does not reconstruct pre-checkpoint stock history or post stock transactions. Migration `20261114130000_inventory_movement_history_read.sql` must be qualified/applied before this view becomes usable against the hosted environment. This migration is additive; it has **not** been deployed in this change.
- **Credit integrity:** replaced the non-authoritative customer credit screen that previously showed demonstration balances and in-memory repayments with an explicit unavailable state and links to hosted customers/finance.
- **Legacy adapters:** removed fabricated product, customer, inventory, and credit data, and removed simulated successful mutations. Actual product, customer, and stock reads continue through existing hosted pages.

### Still not operational end-to-end

- Hosted product/category creation and editing; inventory adjustments, full history before checkpoint, valuation, and stock reconciliation.
- Authoritative credit balances, customer repayments, supplier payables and purchase-order posting.
- Cash POS posting (database gate intentionally disabled), other tender methods, returns/refunds, and transactional receipt issuance.
- Accounting/expense posting, VAT submission and audited period close; web finance mirrors remain read-only.
- Hosted backup/restore, full import and complete notification automation.
- Phase 2A/2B inbound contact editing/creation is staged behind opt-in flags and requires qualification before production use.

### Testing order

1. **Non-destructive first:** TypeScript, Vitest, pure mapping tests, read-only pages, access checks, application builds and code review.
2. **Isolated validation:** disposable development Supabase and SQLite workspaces; migrations and explicit independent sandbox gates.
3. **Destructive and recovery tests last:** only on disposable data after consent, with explicit test identities and rollback criteria. Never reset user or production databases.

### Local checks for this increment

```bash
pnpm --filter @akilibiz/business-web exec tsc --noEmit
pnpm --filter @akilibiz/business-web test
```

Run hosted read-only acceptance separately using two business memberships and a representative data volume (0, 50, 51, 1,001 products). New SQL is intentionally **not applied** during these source changes. Do not activate production sync or sales flags.

## POS cash posting client pilot — 2026-11-14

A separately gated **Cash sale pilot** UI now calls the existing authenticated read-only quote endpoint and staged `post_web_pos_cash_sale` RPC via `/api/pos/sales`. It is not the normal checkout.

- Browser build-time flag `NEXT_PUBLIC_AKILIBIZ_CASH_SALE_PILOT=1` is **unset by default**; the pilot entry point is otherwise invisible.
- Independent hosted per-business cash posting control remains disabled by default. This change does not migrate or enable it.
- Uses only exact product UUIDs and milli-quantities; backend computes prices, tax, inventory and authorization and serializes the transaction. Browser-supplied prices, actor identity and business identifiers are not accepted by the API.
- Cash amount is validated as nonnegative, whole UGX. The quote is a snapshot, not a lock, and the authoritative database can reject a sale after preflight.
- Client records one version-4 idempotency UUID **before** sending the request. It saves this key, original business/cart fingerprint, entered amount and quote in browser session storage. Unknown outcomes retain that ID for explicit retry; no replacement key is generated for an ambiguous response.
- Browser business switches remount the pilot to avoid sharing an in-flight request with another business.
- A response with `pending_desktop` is displayed as queued for reconciliation, **not a finalized desktop sale or printable receipt**.
- Cash pilot deliberately excludes credit orders, card/mobile-money, discounts, tax overrides, and customer accounting until their authoritative contracts are qualified.
- Do **not** activate the browser or database gates for real transactions until a disposable end-to-end environment has verified replay, tax policy, stock holds, desktop outbox/ACK, refund behavior, and interrupted posting. Defer destructive recovery tests to the final stage, per project instructions.

Focused source checks (no database writes):

```bash
pnpm --filter @akilibiz/business-web exec tsc --noEmit
pnpm --filter @akilibiz/business-web test
```

These automated checks do not prove cash posting can be enabled in production.

## POS status visibility and product-insert correction — 2026-11-14

- Added additive migration `20261114150000_web_pos_cash_sale_status_read.sql`: authenticated, active-business, role-limited, originating-user-only read of private cash-sale statuses (`pending_desktop`, `desktop_applied`, `reconciled`, `voided`). The request ID is scoped by business and actor. The RPC does not modify sales, inventory, or posting controls.
- Added `GET /api/pos/sales/status?requestId=<uuid-v4>`, with authentication, selected-business permission checks, no-store headers, strict status response verification and an explicit `not_found` state. A not-found result does **not** authorize posting a replacement sale without desktop confirmation.
- The separate cash-sale pilot offers **Check request status** for uncertain requests and **Check latest status** after the server accepts a sale. Restored requests preserve their original idempotency key; normal checkout remains disabled.
- Tests cover rejected identifiers, unauthorized roles, business-scoped RPC arguments, unknown requests, reconciled responses, and database failures.
- Desktop product repository `create_product` SQL was corrected to use 31 unique columns and 31 parameter bindings; required package-content fields in SKU lookup remain intact. Desktop code is committed separately to `akilibiz` `dev`.
- No hosted migration has been applied and neither cash posting nor inbound product mutation has been enabled. TypeScript, Vitest and Rust regression checks remain to be run locally.

Do not deploy the new RPC migration without normal staging review. Do not enable production cash posting based solely on these source-level tests.
