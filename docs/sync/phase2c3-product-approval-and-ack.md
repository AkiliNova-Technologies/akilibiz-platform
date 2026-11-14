# Phase 2C3 — Locally approved product creation and hosted confirmation

## Scope and safety

**Code committed, not deployed or production-qualified.** This phase implements
the *source-level* path from immutable web request to explicit local staff approval,
atomic SQLite product creation + durable receipt, hosted receipt acknowledgement,
and later catalogue-confirmed `published` status. No migrations were applied to
a connected or production business, and no feature flags were enabled.

### The business-owner journey

1. An owner saves a web product draft. With the separate request gate enabled,
   they select **Request desktop review**. The web submits only the saved draft
   ID and persistent UUIDv4 request ID.
2. The hosted SQL command queue freezes the authoritative copy of that draft,
   local category ID, paired source and device. It rejects a second distinct
   request for the same draft.
3. Under the independent desktop receive gate, an authenticated paired desktop
   validates and stores the immutable request locally.
4. When the *separate desktop approval UI and apply gates* are enabled, an
   authenticated local staff user with `products.create` permission opens the
   **Review web product requests** panel. They can inspect product, pricing,
   unit-conversion, stock, expiry, batch and package details. They must choose
   an active local VAT classification that belongs to this business.
5. A single SQLite transaction rechecks command source and category, tax
   registration/classification, SKU/barcode conflicts, all submitted numerical
   settings, and exact stock thresholds. It inserts the product with **zero
   opening stock** and an immutable receipt. Both commit or neither commits.
   Existing catalogue triggers generate the normal outbound product change.
6. An independent desktop ACK worker submits *only committed local receipts*
   to a paired-device-authenticated Supabase RPC. It is idempotent and never
   regenerates the product on a lost HTTP response.
7. The web status is `applied` after an authenticated receipt. The status is
   derived as `published` only after a matching desktop product projection is
   visible for the same source business, product ID, category and SKU.

## Default-off gates (independent)

| Surface | Gate | Role |
|---|---|---|
| Web | `AKILIBIZ_ENABLE_WEB_PRODUCT_DRAFTS=1` | Draft preparation UI/API |
| Web | `AKILIBIZ_ENABLE_PRODUCT_CREATE_REQUESTS=1` | Owner request/status API |
| Hosted database | `private.desktop_product_create_controls.requests_enabled=true` | One approved disposable tenant's queue |
| Desktop | `AKILIBIZ_ENABLE_PRODUCT_CREATE_INBOX=1` | Stage-only cloud polling |
| Desktop | `AKILIBIZ_APPLY_PRODUCT_CREATE_INBOX=1` | **Explicit local approval command** |
| Desktop | `AKILIBIZ_ACK_PRODUCT_CREATE_INBOX=1` | ACK after committed product receipt |
| Desktop UI | `VITE_AKILIBIZ_PRODUCT_CREATE_REVIEW_UI=1` | Show review panel in desktop sync settings |

Every switch remains off after these commits. Do not enable these against
production data or a business with unqualified tax, permissions, and pairing.

## New migrations (additive)

- Hosted `20261114200000_product_create_receipt_ack.sql`: private command
  receipt fields, paired-device ACK RPC, and owner-only catalogue-confirmed
  status query. Must follow the draft and request staging migrations.
- Desktop `0118_cloud_product_create_receipts.sql`: separate immutable
  receipt linked to the previously staged command, created local product,
  approved VAT classification and authorizing staff. Existing 0117
  staged-only constraint is retained, not rewritten or loosened.
- Triggers block mutation or deletion of staged requests and receipts.
  Only a one-time hosted ACK timestamp can be recorded.

## Required validation before activating any gate

1. **Non-destructive source checks**: TypeScript, Vitest, targeted Rust tests.
   The Rust unit test uses a disposable *in-memory SQLite database*, not the
   business's database. Tests check replay, business/device scoping, exact zero
   stock, immutable receipts, and duplicate-SKU rollback.
2. **Disposable integration tenant**: apply migrations in order, create test
   identities/roles and separately paired desktop, then verify local approval,
   tax registration, device revocation, authenticated ACK, catalogue appearance,
   and a deliberately interrupted network call with the same request key.
3. Validate existing real schema triggers, tax and stock invariants,
   idempotency under concurrent devices, and outbox drain ordering.
4. **Destructive tests last**, on an isolated disposable database only:
   staged rollback, database interruption, restore, and migration recovery.

Do not report the feature as operational on production before those checks pass.

### Local source validation commands

```sh
cd ~/Desktop/akilibiz-platform
git -c url."https://github.com/".insteadOf="git@github.com:" pull --ff-only origin dev
pnpm --filter @akilibiz/business-web exec tsc --noEmit
pnpm --filter @akilibiz/business-web test

cd ~/Desktop/akilibiz
git -c url."https://github.com/".insteadOf="git@github.com:" pull --ff-only origin dev
cargo test --manifest-path src-tauri/Cargo.toml --lib product_create_inbox -- --nocapture
npx tsc --noEmit
```

No application start, migration deployment or production posting is required
for these source checks.
