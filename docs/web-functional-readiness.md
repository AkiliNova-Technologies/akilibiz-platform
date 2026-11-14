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
