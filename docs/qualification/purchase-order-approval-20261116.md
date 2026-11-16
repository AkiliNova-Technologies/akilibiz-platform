# Purchase-order approval qualification — 2026-11-16

Status: hosted contract and desktop source validation passed independently;
connected transport-level acceptance remains pending.

## Validated source boundary

The desktop `dev` source was inspected at `539b034d`. The approval handler:

- requires `purchase_orders.create` and an authenticated local staff actor;
- rechecks the active business link, linked owner and source identity;
- verifies the hosted command is still pending immediately before posting;
- reuses the purchasing line validator and accepts only active stock products;
- rechecks the supplier, products, device pairing and PO-number uniqueness;
- writes the purchase-order header, all lines and immutable approval receipt in
  one SQLite transaction;
- returns the previously committed receipt on replay; and
- acknowledges only committed receipts, retaining unacknowledged rows for a
  later retry with the same identities.

No goods receipt, stock movement, payable, VAT evidence or journal entry is
created by purchase-order approval.

## Executed validation

Desktop repository:

```text
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check  PASS
cargo check --manifest-path src-tauri/Cargo.toml                PASS
cargo test ... purchase_order_review_inbox --lib               3 passed
```

Hosted PostgreSQL 17 qualification used a named disposable Docker container,
tmpfs database storage and temporary owners, businesses, devices, suppliers,
products and draft. The container was stopped and automatically removed after
the run. It verified:

- owner-only draft submission and status access;
- server-snapshotted desktop supplier/product identities;
- identical request replay returning the same command;
- changed request identity rejection;
- current device/source authorization;
- exact receipt ACK and identical lost-response replay;
- conflicting receipt rejection;
- applied requests no longer appearing pending;
- paired-device revocation; and
- cross-business status denial.

The repeatable files are:

- `supabase/tests/purchase_order_approval_isolated_bootstrap.sql`
- `supabase/tests/purchase_order_approval_isolated_acceptance.sql`
- `.github/workflows/purchase-order-approval-qualification.yml`

## Qualification limit

This run did not connect the actual desktop reqwest worker to PostgREST. The
Rust SQLite tests and PostgreSQL RPC tests passed as independent layers, not as
one transport-level scenario. Production gates therefore remain disabled.
Before activation, run the real desktop worker against disposable PostgREST and
SQLite, approve one order, interrupt the first ACK response, verify the same
receipt is replayed, publish the purchase-order mirror, and confirm the web
status and register without duplicate insertion.
