# Phase 2A — inbound contact command pilot (development only)

**Production: disabled.** Current desktop-to-web publication remains the source of read-only business records. This increment establishes a durable protocol for web-originated edits of existing customers and suppliers, but does not complete two-way editing.

## Implemented

- Staged migration 20261111150000 creates private controls, versioned contact commands, original-field baselines, duplicate guards and acknowledgment receipts. Private tables have forced RLS and no direct authenticated privileges.
- Owner-only request_desktop_contact_update validates source record version, authorized paired desktop device and editable text fields. It queues rather than modifying the hosted contact snapshot.
- list_pending_desktop_contact_updates only delivers pending commands to the matching owner/device/source.
- ack_desktop_contact_update is receipt-idempotent and must be called only after a separately qualified SQLite apply or conflict transaction.
- desktop_contact_update_status lets the requesting business owner see queued, applied or conflicting state.
- /api/sync/contact-updates POST returns HTTP 202 for queued, not applied; GET retrieves status.
- Desktop SQLite migration 0113 and contact_inbox.rs stage and validate commands with immutable payloads. No contact mutation or ACK occurs in the current worker.

## Disabled-by-default pilot gates

- Web API environment: AKILIBIZ_ENABLE_BIDIRECTIONAL_CONTACTS=1 is required.
- Hosted DB: private.desktop_inbound_controls.contacts_enabled must be enabled for a disposable business; the table defaults to false.
- Desktop: AKILIBIZ_ENABLE_CONTACT_INBOX=1 enables staging only, never applying.
- No production flags should be enabled yet. There is no finished desktop apply switch or web edit form.

## Required next steps

1. Implement an atomic SQLite contact command handler: validate business and stable public ID, compare every original-field baseline, apply only whitelisted fields or record a conflict, and persist a local receipt in the same transaction.
2. ACK only committed local receipts, with retries for lost responses; let existing outbound contact sync publish the new authoritative desktop snapshot.
3. Add web editor controls with pending, offline, conflict and applied states and no optimistic mutation of the hosted mirror.
4. Test local offline edits, simultaneous web edits, multiple devices, account switching, revoked devices, network loss, idempotent replay, business isolation and crash recovery.
5. Qualify a disposable end-to-end pilot before applying migrations or switching on any production feature.

Products/categories require source-aware and dependency-aware commands. Inventory, sales, tax and accounting require separate canonical transaction workflows, not generic JSON record replacement. Never reset a database or erase a pending outbox to resolve conflicts.
