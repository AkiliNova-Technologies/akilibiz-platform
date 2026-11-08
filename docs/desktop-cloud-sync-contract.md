# Desktop → Cloud synchronization contract (S1/S2)

Status: **protocol design / implementation gate**. No desktop data is currently uploaded.

## Verified repository facts

- Desktop SQLite `businesses` has an integer local primary key and a unique text `public_id` (migration 0057). It enforces exactly one active local business through `LocalBusinessContext`.
- Desktop `categories` and `products` use local integer IDs and `business_id` ownership (migration 0065). Product SKU is unique per local business.
- Web Supabase `businesses.id` is a UUID. Active business access is derived from authenticated Supabase memberships, not the selected-business cookie.
- Prisma foundation exists, but its lockfile and hosted connection/permission model require validation before deployment.
- Web product and category screens currently use in-memory sample data; they are not safe import targets.

## Phase S1 acceptance requirements

1. The owner signs into Supabase on desktop using an external browser / PKCE flow; no web password is copied to the desktop SQLite staff-auth tables.
2. A pairing challenge is created on the hosted server, bound to an authenticated owner, hosted business, expiry and one-time nonce. A desktop device proves possession of the challenge and its generated device identity. Pairing does not trust the submitted business UUID.
3. The server verifies active owner membership on **every** pairing request and persists a device registration. Re-pairing must be idempotent, and revocation must block all subsequent uploads.
4. The desktop stores the verified mapping between its local `public_id`, the hosted business UUID and device UUID. No link is marked active until the server confirms it.
5. Initial sync shows a preview of record counts and collision checks. Never silently merge a populated hosted catalogue.
6. Every upload request includes an authenticated device credential, stable event UUID, source local business ID, entity type and local record ID. The server derives the authorized hosted business from the device registration, **never** from client-provided `business_id`.
7. Acknowledgments are committed on the server before the desktop marks outbox entries acknowledged. Retried event UUIDs return the original outcome.
8. A revoked business membership or device registration immediately prevents uploads. Cross-business reads and writes are rejected.

## Phase S2 catalogue data order

1. Categories (parent mapping before products).
2. Products (map category IDs and source product IDs).
3. Inventory quantities and stock movements **only after** a separate ledger integrity review. Product stock snapshots must not become independent financial inventory postings.

Use explicit integer UGX and milli-quantity fields where present in desktop. Do not infer exact values from legacy floating point columns when exact-value snapshots exist. Never synchronize tax classifications without matching hosted tax rules.

## Implementation boundaries

- **Desktop**: `0093_cloud_sync_foundation.sql` creates link metadata, mapping and empty outbox. It does not capture changes yet.
- **Hosted**: device registration, pairing endpoints, catalogue schema and ingestion services are **not yet implemented**.
- **Web**: existing product UI is mock-backed and must be connected to Prisma-backed business-scoped queries after catalogue ingestion exists.
- **Safety**: no remote database migrations, uploads, or local database resets have been performed.

## Validation before live data

- Test desktop migration on a disposable SQLite database and on a copied representative development database.
- Verify Prisma lockfile and CI; ensure runtime role is least privileged.
- Test two independent business owners, cross-tenant spoofing, expired pairing, replay, retries, duplicate SKUs, invalid categories, revocation, partial batches and interrupted uploads.
- Start with a single category and product in a disposable test business. Only after passing acceptance checks, link the existing real desktop business.
