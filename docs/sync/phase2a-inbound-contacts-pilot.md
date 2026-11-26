# Phase 2A — inbound contact command pilot (development only)

**Production: disabled.** Current desktop-to-web publication remains the source of read-only business records. This increment establishes a durable protocol for web-originated edits of existing customers and suppliers, but does not complete two-way editing.

## Implemented

- Staged migration 20261111150000 creates private controls, versioned contact commands, original-field baselines, duplicate guards and acknowledgment receipts. Private tables have forced RLS and no direct authenticated privileges.
- Owner-only request_desktop_contact_update validates source record version, authorized paired desktop device and editable text fields. It queues rather than modifying the hosted contact snapshot.
- list_pending_desktop_contact_updates only delivers pending commands to the matching owner/device/source.
- ack_desktop_contact_update is receipt-idempotent and must be called only after a separately qualified SQLite apply or conflict transaction.
- desktop_contact_update_status lets the requesting business owner see queued, applied or conflicting state.
- /api/sync/contact-updates POST returns HTTP 202 for queued, not applied; GET retrieves status.
- Desktop SQLite migration 0113 and contact_inbox.rs stage immutable payloads, apply only version-matched source contact fields in an atomic local transaction, record conflicts and send idempotent hosted acknowledgements. The apply and ACK switches are separate and disabled by default.

## Disabled-by-default pilot gates

- Web API environment: AKILIBIZ_ENABLE_BIDIRECTIONAL_CONTACTS=1 is required.
- Hosted DB: private.desktop_inbound_controls.contacts_enabled must be enabled for a disposable business; the table defaults to false.
- Desktop has three independent opt-ins: AKILIBIZ_ENABLE_CONTACT_INBOX=1 (stage); AKILIBIZ_APPLY_CONTACT_INBOX=1 (atomic apply after local operator permission checks); AKILIBIZ_ACK_CONTACT_INBOX=1 (transmit committed receipts). All default to off.
- No production flags should be enabled yet. Owner-only web customer and supplier edit forms exist behind the server gate. Never enable the feature without full integration testing and a pilot rollback plan.

## Hosted qualification evidence (26 November 2026)

Run against the disposable qualification project with all 45 migrations applied in order:

```
AKILIBIZ_REAL_DESKTOP_WORKER=1 AKILIBIZ_TWO_WAY_CONTACTS=1 \
  node apps/business/scripts/qualify-phase1c-hosted.mjs
```

Result: 58 PASS, 0 FAIL, cleanup verified. The two-way stage
(`src-tauri/tests/hosted_two_way_contacts_qualification.rs` in the desktop repository)
drives the production desktop worker and proves:

- stale web edits are rejected immediately with HTTP 409 (`PT409`);
- a desktop operator without `customers.update` cannot apply a queued edit (account switching);
- a crash/lost network after the SQLite commit leaves the hosted command pending, and the persisted receipt is delivered exactly once after restart;
- the applied contact is republished to the hosted snapshot;
- replayed ACKs with the same receipt are idempotent and a different receipt is refused (`23505`);
- an offline tick receives nothing and changes nothing;
- simultaneous web and desktop edits produce a `conflict` outcome; the desktop value is kept and republished.

Defect found and fixed during qualification: the stale-version check raised SQLSTATE `40001`,
which PostgREST retries automatically, so a stale edit hung for ~2 minutes before a gateway
timeout. Migration `20261126120000` uses `PT409` instead.

Steps 1–3 below are covered by this run. Steps 4–5 remain before production enablement.

## Required next steps

1. Complete isolated real-database tests for atomic contact application, conflict receipts, ACK retry, crash/restart and the existing outbound dirty triggers.
2. Verify device/source mappings and desktop local operator permission boundaries under account switching and revoked devices.
3. Run a disposable end-to-end owner pilot covering web edit → SQLite apply → hosted ACK → refreshed hosted snapshot; simulate offline edits, lost network acknowledgement and simultaneous edits.
4. Implement clear conflict resolution actions, command expiry/recovery, and production operational observability before rollout.
5. Qualify a full-schema hosted migration and desktop upgrade before activating a production feature.

Products/categories require source-aware and dependency-aware commands. Inventory, sales, tax and accounting require separate canonical transaction workflows, not generic JSON record replacement. Never reset a database or erase a pending outbox to resolve conflicts.
