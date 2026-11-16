# AkiliBiz web purchasing — non-posting order preparation

Status: source implemented on `dev`; **NOT deployed, not transaction posting, not end-to-end qualified**.

Qualification update (2026-11-16): desktop Rust formatting, compilation and
three focused inbox/receipt tests pass. The hosted request/ACK migrations also
pass a disposable PostgreSQL 17 suite covering identity snapshotting,
idempotency, pairing revocation, conflicting ACKs and tenant isolation. These
were independent layer tests, not a connected desktop-worker/PostgREST run, so
all gates remain off. See
`docs/qualification/purchase-order-approval-20261116.md`.

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

## Desktop intake source increment — November 16, 2026

The separate desktop repository `AkiliNova-Technologies/akilibiz` `dev`
now includes source-only intake for the staged purchase-order review queue:

- `src-tauri/src/migrations/0119_cloud_inbound_purchase_order_reviews.sql`
  adds a staged-only immutable SQLite inbox with source-scoped unique
  command IDs and update/delete denial.
- `cloud_sync_handler/purchase_order_review_inbox.rs` polls
  `list_pending_desktop_purchase_order_reviews` only when the independent
  `AKILIBIZ_ENABLE_PURCHASE_ORDER_REVIEW_INBOX=1` switch is enabled.
  It verifies the active paired source and owner, checks a bounded batch,
  rejects malformed UUIDs, supplier identities, dates, duplicate products,
  fractional UGX line totals, unsafe arithmetic and changed replay payloads.
- `list_staged_purchase_order_reviews` is a read-only permission-checked
  Tauri command scoped to the selected local business and active paired device.
- The cloud sync tick now invokes stage-only purchase review intake without
  calling the purchase order posting service.

The web request and desktop staged queue are separate source increments.
They have not been run together on a disposable test database. Both the
web review flag and desktop intake flag remain disabled.

**No approval, purchase-order insertion, application receipt, hosted ACK,
goods receiving, stock movement, supplier payable, tax or journal mutation
is enabled by this change.** Never change the pending status in SQL by hand
or treat a staged row as an approved purchase.

### Developer validation after pulling both repos

```bash
cd ~/Desktop/akilibiz
git pull --ff-only origin dev
cargo test --manifest-path src-tauri/Cargo.toml purchase_order_review_inbox --lib
cargo check --manifest-path src-tauri/Cargo.toml

cd ~/Desktop/akilibiz-platform
git pull --ff-only origin dev
pnpm --filter @akilibiz/business-web exec tsc --noEmit
pnpm --filter @akilibiz/business-web test
```

Next: implement an explicit, permissioned desktop approval operation which
rechecks current hosted authorization and creates the purchase order plus
immutable local receipt in **one** SQLite transaction, with replay-safe
receipts and separate hosted ACK. Only after that may the web show applied.
Goods receiving and VAT remain independent.

## Desktop explicit approval and hosted acknowledgement — source increment

The separate desktop `akilibiz` `dev` branch now contains:
- `0120_cloud_purchase_order_approval_receipts.sql`, an immutable,
  replay-safe local approval receipt keyed to the staged command.
- `apply_staged_web_purchase_order` in the existing purchasing service.
  It reuses desktop stock product/unit checks and commits one order,
  all source lines and its approval receipt in the **same SQLite transaction**.
  Supplier public UUID maps to the selected active local supplier.
  Exact whole-UGX line totals, active stock products and PO number
  uniqueness are rechecked; no receiving or finance posting occurs.
- `approve_staged_purchase_order_review`, an explicit staff command
  requiring `purchase_orders.create` permission, paired owner/source
  verification, a fresh `verify_desktop_purchase_order_pending` hosted
  check, and an independent
  `AKILIBIZ_APPLY_PURCHASE_ORDER_REVIEW_INBOX=1` gate.
- `acknowledge_approved`, a separately gated background ACK which sends
  only previously committed order receipts. A lost network response
  replays the same UUID receipt and local order identity. It is controlled
  by `AKILIBIZ_ACK_PURCHASE_ORDER_REVIEW_INBOX=1`.
- A source-only desktop review UI alongside the existing product-review
  dialog, gated by
  `VITE_AKILIBIZ_PURCHASE_ORDER_REVIEW_UI=1`. Staff must explicitly
  confirm purchase-order creation, with stock/VAT/payables explicitly
  excluded. Already approved requests are hidden from the list.
- Hosted migration
  `20261114240000_purchase_order_approval_receipts.sql` adds a fresh,
  source-bound authorization RPC and an idempotent receipt ACK. The
  hosted request becomes `applied` only after acknowledgement; there
  is no hosted-side purchase or stock insertion.
  
**None of these runtime switches were enabled or hosted migrations applied.**
The approval path has not yet been executed end-to-end against the local
PostgreSQL/SQLite pair, and so is **not qualified for live orders**.
Do not manually enable it against existing business data.

### Developer source validation (both repositories)

```bash
cd ~/Desktop/akilibiz
git pull --ff-only origin dev
cargo fmt --manifest-path src-tauri/Cargo.toml --all
cargo test --manifest-path src-tauri/Cargo.toml purchase_order_review_inbox --lib
cargo check --manifest-path src-tauri/Cargo.toml
npm run build

cd ~/Desktop/akilibiz-platform
git pull --ff-only origin dev
pnpm --filter @akilibiz/business-web exec tsc --noEmit
pnpm --filter @akilibiz/business-web test
```

After source checks, Codex must run the full purchase approval against
**disposable** PostgreSQL plus SQLite with isolated paired owner, staff roles,
supplier/product sources, double approvals, revoked-device/owner failures,
lost-ACK replay, and goods-receipt absence. The disposable database is
deleted after the final full-system integration suite. Destructive tests
remain last.

Goods receiving, supplier VAT and supplier payable posting remain a
separate, unfinished web-origin workflow.
