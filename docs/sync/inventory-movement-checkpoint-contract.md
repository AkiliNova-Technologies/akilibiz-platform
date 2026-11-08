# Inventory movement synchronization contract — Phase 1A

Status: **staged private hosted schema and functions, not an active hosted API**. Desktop migration
`0099_cloud_inventory_movement_outbox.sql` captures newly posted stock movement
evidence. Two additive Platform `dev` migrations now define private checkpoint and movement-receipt staging, but neither has been applied to the hosted project or exposed as a client-callable RPC.

## Source of truth and scope

- Desktop SQLite is authoritative for stock posting while one-way replication
  is active. The hosted database is a read-only representation until a separate
  audited change-authority protocol exists.
- The source identity is **hosted business + paired device + local business
  public ID**. A local stock movement numeric ID is unique only within that
  source; it must never be used alone for cross-tenant deduplication.
- The hosted endpoint must authenticate the current user, resolve tenant
  membership server-side, verify active device enrollment and owner permission,
  and reject revoked or mismatched devices. Never trust a caller-supplied
  `target_business_id` as proof of access.
- A client-supplied movement `event_public_id` must be idempotent and bound to
  an immutable canonical payload. Retrying the same ID with different evidence
  is a conflict, not an update.

## Checkpoint protocol (must precede movement transfer)

1. Create a consistent desktop snapshot of all stock-item positions and the
   maximum **committed** stock-movement ID using one database read transaction.
2. Keep the checkpoint request durable locally, with one stable request identity
   across retries. A pending request is not a confirmed checkpoint.
3. Hosted validation must atomically verify the paired source, product mapping,
   expected quantities, exact milli-unit representation, snapshot identity and
   movement watermark before acknowledging the checkpoint.
4. The acknowledgement returns an immutable hosted checkpoint ID and the
   accepted watermark. Store that receipt in
   `cloud_inventory_sync_checkpoints` only after an authoritative success.
5. Movement events at or below the accepted watermark are represented by the
   baseline; movements above it are replicated in strict per-source movement ID
   order. Capture rows created before the first checkpoint must not be silently
   discarded. They require an explicit baseline-coverage rule and audit.
6. Snapshot re-upload must never silently override a previously established
   stock ledger. A mismatch is a reconciliation error requiring operator review.

## Movement acceptance

For each movement, the server verifies:

- The active source and matching confirmed checkpoint.
- The same source movement ID has never been applied with a different payload.
- The product belongs to that business and corresponds to the source product.
- `quantity_change_milli`, `stock_before_milli`, and
  `stock_after_milli` are valid signed 64-bit integers, and
  `before + delta == after` without overflow.
- The previous accepted stock position equals `stock_before_milli`.
- Events are contiguous after the source watermark, or any missing prior
  movement is explicitly resolved before accepting later ones.
- Stock changes are projections of desktop history, **not new hosted sales,
  inventory postings, tax documents, payments, or accounting entries**.

The server must insert the immutable event receipt and resulting projection
in the same database transaction. A duplicate delivery with matching payload
returns the original acknowledgement without a second change. Reordered,
cross-tenant, altered, or unpaired payloads fail without partial mutation.

## Failure and recovery

- Use bounded retries with backoff; preserve pending and exhausted movements.
- Only acknowledged movement IDs may advance the durable source cursor.
- Loss of HTTP response is retried with the same event identity.
- Revoked credentials pause delivery without deleting local evidence.
- Reconciliation must report the first mismatched movement, accepted
  watermark, and expected/actual milli-units; it must never force success.
- Do not expose this RPC, write grants, or job scheduling in production
  until cross-tenant, duplicate, out-of-order, offline/restart, and overflow
  tests have passed against a dedicated test environment.

## Current implementation boundary

Desktop `0099` adds capture-only outbox evidence and a checkpoint receipt
table. Existing automatic inventory-position snapshots remain independent and
do **not** establish a verified movement checkpoint. Hosted private staging functions are committed but not deployed or callable by clients. A stable desktop checkpoint request, complete historical baseline proof, post-checkpoint snapshot write exclusion, public RPC authorization and end-to-end validation remain necessary before Phase 1A sign-off.
