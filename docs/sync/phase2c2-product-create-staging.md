# Product creation request staging — Phase 2C2

This increment is **not product publication**. Product drafts remain isolated
from `desktop_products`. Only a paired, authenticated desktop may fetch its
business's immutable product request snapshot, and it may only record that
snapshot in a dedicated SQLite inbox. This is not a tax/stock/accounting commit.

## Independent rollout gates (all off by default)

- `AKILIBIZ_ENABLE_WEB_PRODUCT_DRAFTS=1` enables draft UI/API **after**
  `20261114170000` and `20261114180000` draft migrations are applied in staging.
- `AKILIBIZ_ENABLE_PRODUCT_CREATE_REQUESTS=1` enables the owner-only
  `/api/sync/product-creates` request/status API and draft-list action.
- `private.desktop_product_create_controls.requests_enabled=true` must be
  enabled **only in an explicitly qualified disposable business** by an authorized
  database operator; migration `20261114190000` defaults it to false.
- `AKILIBIZ_ENABLE_PRODUCT_CREATE_INBOX=1` permits a paired desktop to **fetch
  and stage only**. It has no product-apply or hosted-acknowledgement logic.
- No production flags are activated by these commits.

## Request contract

The browser sends only `draftId` and an idempotent UUIDv4 `requestId`.
The hosted security-definer function checks business-owner membership, the
disabled-by-default business control, draft creator, complete desktop option
keys, an active category belonging to the selected business, and a
non-revoked desktop device whose source matches that category. It locks and
snapshots the draft into a private command and rejects a second request for
the same draft under another request ID.

The client preserves the request ID in session storage **before** sending.
The owner-only GET status reports the command state, but `pending` must not
be interpreted as created, stocked, tax-qualified, or sellable.

The desktop validates identity and the bounded payload, then inserts the
immutable JSON into `cloud_inbound_product_creates` for its selected local
business and paired device. Replaying a command with different content is an
error. This path never invokes `product_service::create_product` and never
upserts `products`, inventory or finance records.

## Not yet implemented / why it remains disabled

1. Bind the staged command to an authorized *local staff identity* with
   `products.create` and the exact source-linked category. Revalidate every
   field against the authoritative desktop DTO, including tax classification.
2. Implement a single SQLite transaction for product creation, immutable
   command receipt, SKU/barcode collision handling and idempotent replay.
3. Add authenticated hosted ACK RPC with receipt/source checks and a
   `product published` status **only after desktop commit**.
4. Confirm the desktop-to-web product snapshot and visibility of the new
   product before marking the web workflow complete.
5. Qualify permission revocation, incorrect pairing, multiple devices,
   concurrent requests, network timeouts, expired credentials and
   multi-business isolation on disposable data. Reserve destructive testing
   for the final stage.

## Source validation

Web, without database writes:

```sh
pnpm --filter @akilibiz/business-web exec tsc --noEmit
pnpm --filter @akilibiz/business-web test
```

Desktop, without applying commands:

```sh
cargo test --manifest-path src-tauri/Cargo.toml --lib product_create_inbox -- --nocapture
```

Any normal desktop application startup may apply *additive local schema*
migrations; do not start the desktop program solely for this source test
until the local migration rollout is approved. No Supabase migrations are
applied by these commits.
