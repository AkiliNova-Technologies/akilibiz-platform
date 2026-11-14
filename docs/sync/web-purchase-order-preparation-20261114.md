# AkiliBiz web purchasing — non-posting order preparation

Status: source implemented on `dev`; **NOT deployed, not transaction posting, not end-to-end qualified**.

## Feature and safety boundary

- `/dashboard/suppliers/orders/prepare` is linked from Purchase Orders.
- Authenticated owner/manager can prepare, edit and discard their own purchase-order drafts,
  subject to the independent `AKILIBIZ_ENABLE_WEB_PURCHASE_ORDER_DRAFTS=1` gate.
  This gate is OFF by default and the web does not enable it.
- A draft contains supplier UUID and originating desktop-business public ID,
  the order number, dates, notes, and 1–100 product lines with a hosted
  product UUID, exact `quantity_milli` and `unit_price_ugx`.
- Neither the browser nor the database assumes numeric supplier IDs are
  global: desktop source identity is checked for every supplier and product.
- Each line uses exact `quantity_milli × unit_price_ugx ÷ 1000`. The result
  must be an exact whole UGX; rounding is not permitted. The database
  independently validates source and monetary constraints through a trigger.
- PostgreSQL RLS scopes reads/inserts/updates/deletes by the current
  authenticated owner or manager and the **specific draft business_id**.
  Created-by, business, selected supplier, and desktop source ID cannot
  be changed by editing an existing draft.
- The web exposes **NO purchasing posting endpoint**; the preparation
  screen explicitly states that no stock, VAT, supplier balance or desktop
  order is created by saving a draft.
- An independent **default-off** owner-only hosted request queue is now present.
  It performs immutable SQL snapshotting, idempotency and request status recovery.
  The desktop inbox, actual approval/application, stock ledger, supplier payable,
  and goods receipt acknowledgement have **not** been implemented.

## Source files

- `supabase/migrations/20261114220000_web_purchase_order_preparation.sql`
- `supabase/migrations/20261114230000_web_purchase_order_review_requests.sql`
- `apps/business/lib/purchase-order-draft-validation.ts`
- `apps/business/app/api/purchasing/drafts/route.ts`
- `apps/business/app/(app)/dashboard/suppliers/orders/prepare/page.tsx`
- Corresponding validation, API and SQL contract tests.

## Owner-only review request staging

- `AKILIBIZ_ENABLE_PURCHASE_ORDER_REVIEW_REQUESTS=1` is a separate switch from draft preparation; it remains OFF.
- `20261114230000_web_purchase_order_review_requests.sql` creates private request controls and a pending-only queue.
- `POST /api/purchasing/requests` accepts only `draftId` and UUIDv4 `requestId`. The SQL function re-reads the locked draft, checks the originating owner, active paired desktop, active supplier and current product sources, then snapshots the supplier **source public UUID**, each product **local integer ID**, quantity in thousandths, and exact whole-UGX unit price. Browser-supplied supplier/local IDs cannot drive posting.
- Requests are idempotent per owner/draft ID. Submitted draft updates and deletes are rejected by database triggers.
- `GET /api/purchasing/requests` restores the owners request lifecycle from a source-of-truth SQL function. Session storage holds only the uncertain-POST retry reference.
- The source-bound `list_pending_desktop_purchase_order_reviews` RPC exposes only pending commands for the authorized paired desktop. It does not apply, approve or acknowledge them.
- A manager may prepare their own drafts but cannot submit or act for an owner; owner-based submission requires an owner-created draft until a separately reviewed manager handoff is implemented.

## Next dependency

Implement durable **desktop-authoritative** purchase order request commands:
the owner-scoped hosted queue needs immutable supplier *public* identity,
local product IDs from the paired desktop source, request idempotency,
default-off device staging/application/ACK and exact purchase order line
creation through desktop's existing `purchase_order_service`.

Goods receiving is a **separate** transaction requiring actual delivered
quantities, supplier VAT document handling, and stock/payable/journal
idempotency. Never treat a purchase order status change as stock receipt.

## Final testing boundary

Apply the migration only in a disposable local Supabase-compatible PostgreSQL
environment after its prerequisites. Use disposable paired desktop SQLite
for actual purchase/receiving tests after the command protocol is ready.
Do not apply to the live AkiliBiz business database.

Non-destructive developer checks:

```bash
cd ~/Desktop/akilibiz-platform
git pull --ff-only origin dev
pnpm --filter @akilibiz/business-web exec tsc --noEmit
pnpm --filter @akilibiz/business-web test
```
