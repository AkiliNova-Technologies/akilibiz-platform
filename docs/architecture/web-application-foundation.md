# AkiliBiz web application foundation

Updated: 2026-11-16. Branch: `dev`.

## Application and trust boundaries

The Next.js App Router application lives in `apps/business`. Routes below
`/dashboard` use the authenticated application shell and the nested dashboard
layout requires a currently accessible active business. The desktop application
remains authoritative for stock, sales, purchasing, payables, VAT, journals and
other locally posted business transactions. A hosted draft, request or pending
state must never be presented as a completed desktop transaction.

## Authentication and session handling

- `proxy.ts` refreshes Supabase SSR cookies and redirects unauthenticated
  dashboard requests before private UI is rendered.
- Server components, actions and route handlers verify the current identity
  with `auth.getUser()` or `auth.getClaims()`; user-editable metadata is used
  only for presentation.
- Sign-out is performed server-side, removes the HTTP-only active-business
  cookie, and removes browser-held AkiliBiz transaction recovery state. This
  prevents an account switch from inheriting the previous account's selected
  tenant or opaque retry identifiers.
- OAuth callback destinations use an allowlist. Password reset and registration
  continue to use the Supabase SSR cookie session.

## Business context and isolation

`lib/business-context.ts` is the business selection boundary. The cookie is an
opaque preference, never authorization. Every resolution re-reads active
`business_memberships` for the authenticated user and loads only businesses
visible through RLS. Server APIs use the resolved business ID for filters and
RPC arguments; browser-supplied business IDs do not select a tenant.

Business changes revalidate the dashboard layout and redirect through a fresh
server render. Client recovery keys that must survive an uncertain response are
business- or draft-scoped. Client data loaders use no-store requests and, where
responses can overlap, abort or generation checks before applying results.

## Authorization

Roles are the existing `owner`, `manager`, `cashier`, `inventory_staff` and
`accountant` roles. Do not add roles in UI code. Enforcement is layered:

1. server pages/actions and route handlers check membership, role or permission;
2. tenant-scoped RLS and RPCs independently verify caller and source identity;
3. UI hides, disables or explains unavailable actions.

UI checks are descriptive only. Privileged SQL functions must authenticate the
caller, verify membership and business/source identity, set a safe search path,
and have explicit execute grants. Service-role clients are not used by the web
application.

## API and data access

Hosted reads and commands use the SSR Supabase client and explicit business
filters/RPC arguments. Transaction endpoints must validate input before data
access, accept durable UUID request identities, and return the authoritative
lifecycle state. `lib/api-response.ts` defines private no-store JSON responses
and stable error codes. New and modified endpoints should use these codes:
`UNAUTHORIZED`, `FORBIDDEN`, `BUSINESS_ACCESS_REVOKED`, `VALIDATION_FAILED`,
`CONFLICT`, `SYNC_UNAVAILABLE`, `REQUEST_PENDING`, `STALE_DATA`, and
`SERVICE_UNAVAILABLE`.

Do not expose Postgres messages to users. Keep exact diagnostics in protected
logs and translate expected failures into plain business language. Lists must
be bounded or paginated and must fail explicitly if a completeness limit is
reached.

## Synchronization lifecycle

Each workflow uses only the states supported by its hosted/desktop contract.
The general progression is prepared draft → hosted pending request → desktop
staged/received → explicitly applied locally → hosted acknowledgement →
confirmed synchronized record. A lost response is retried with the same durable
request ID. Unknown outcomes are recovered by querying hosted status; they are
not resubmitted under a new ID.

Feature gates for purchase-order review, goods-receipt preparation, POS posting
and other incomplete command paths remain independently default-off. Draft
saving does not post stock, money, VAT or journals.

## UI, forms and feedback

The shared application shell and `desktop-navigation.ts` preserve desktop
labels and grouping. Nested routes use the shared header and sidebar. Loading,
empty, unavailable and failed states are distinct; failed requests do not
render fabricated zero values. Forms use external labels, server-side
validation, duplicate-submit prevention and plain-language feedback. UGX values
remain exact whole shillings where required, quantities retain thousandths, and
business dates use the configured Kampala-oriented presentation contracts.

Effect-driven loaders must be cancellation-safe and must not synchronously
chain state resets from an effect. Start independent server requests in
parallel, discard late results, and clear stale period/business data before a
replacement result is shown.

## Testing requirements

Every foundation change needs focused unit or route tests plus the full web
baseline:

```bash
pnpm --filter @akilibiz/business-web exec tsc --noEmit
pnpm --filter @akilibiz/business-web test
pnpm --filter @akilibiz/business-web lint
pnpm --filter @akilibiz/business-web build
```

SQL or cross-system transaction qualification must use disposable PostgreSQL,
desktop SQLite, identities and business records. Never run destructive recovery
tests or pending migrations against the hosted business database. Rust checks
are required only when desktop/Rust source changes.

## Remaining boundaries

- Complete API error-envelope adoption across older read endpoints.
- Database-backed permission navigation for non-owner roles without weakening
  existing RLS.
- Disposable end-to-end qualification of purchase approval and acknowledgement.
- Desktop-authoritative goods receiving, supplier settlement, expense, complete
  POS, inventory adjustment, accounting and tax command lifecycles.
- Production deployment and feature-gate activation only after isolated
  qualification and operational approval.
