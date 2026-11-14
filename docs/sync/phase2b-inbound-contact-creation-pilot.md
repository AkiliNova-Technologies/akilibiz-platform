# Phase 2B — web-to-desktop contact creation pilot

**STAGED, NOT PRODUCTION-ACTIVE.** This design is deliberately separate from the Phase 2A update-only command schema. Both original Phase 2A hosted migration and desktop migrations 0113/0114 are unchanged.

## Contract

1. An authenticated, active **business owner** submits new customer or supplier contact-only fields from AkiliBiz Web with one stable UUID request ID.
2. `request_desktop_contact_create` validates owner membership, explicit database gate, fields, and pairing with an owner-authorized device. It creates a durable command and an immutable destination contact UUID. Retries with the same request ID and identical data return the same command; mismatching retry contents fail.
3. `list_pending_desktop_contact_creates` provides at most 50 commands only to the authorized business/device/source. It never returns commands from other businesses.
4. Desktop stages the command into `cloud_inbound_contact_creates` (migration 0116). The immutable payload and business/device identifiers cannot be overwritten.
5. Under a separate explicit local authorization, SQLite creates a **new** customer/supplier with the hosted allocated public UUID, or records a conflict if that UUID already exists. Contact insertion and the local receipt commit in the *same transaction*. This automatically marks the contact directory dirty through existing capture triggers for the regular outbound mirror.
6. Desktop acknowledgement transmits the **persisted** receipt UUID. Replayed acknowledgement is idempotent; no ACK is sent before local apply.
7. Web status exposes `pending`, `applied`, or `conflict` only for the initiating owner of that business. `applied` means SQLite was written; the new record appears on Web **after outbound contact sync**.

## Independent disabled-by-default gates

| Layer | Gate | Default |
| --- | --- | --- |
| Web UI / request API | `AKILIBIZ_ENABLE_CONTACT_CREATION=1` | Off |
| Hosted DB, per-business | `private.desktop_inbound_controls.contact_creates_enabled` | false |
| Desktop fetch | `AKILIBIZ_ENABLE_CONTACT_CREATE_INBOX=1` | Off |
| Desktop apply | `AKILIBIZ_APPLY_CONTACT_CREATE_INBOX=1` | Off |
| Desktop acknowledge | `AKILIBIZ_ACK_CONTACT_CREATE_INBOX=1` | Off |

Do not enable these gates on a production business without a disposable two-business pilot, a migration rollback plan, verified operator permissions, recovery testing and audit of host-to-local device identity.

## Constraints

- Creates contact details only. No debt, balance, credit, VAT, stock, invoice, pricing, or financial figures can be supplied.
- No direct browser insert into `desktop_customers`/`desktop_suppliers`. Desktop SQLite remains authoritative.
- No cross-business writes. Browser does not supply a business ID; backend uses authenticated selected membership.
- An accepted HTTP 202 is a **queued request**, not a successful contact creation.
- Default-off flags prevent accidental application before qualification.
- An unresponsive or revoked desktop will leave the request pending. An operator must not delete an inbox row to make it disappear.
- The UI retains its request ID after a network failure to avoid duplicate enqueue.

## Next acceptance tests

1. Apply the new hosted migration to a disposable development Supabase database, and desktop migration 0116 to disposable local test files.
2. Run targeted Rust contact-create inbox tests and web typecheck/unit tests.
3. Verify authenticated owner-only request/status and reject cross-business, removed membership, disabled gate and unpaired device.
4. Exercise creation and normal outbound contact publication for customer and supplier, including restart before apply, restart after apply before ACK, repeated ACK, duplicate request ID, and existing-UUID conflict.
5. Verify old Phase 2A update-only flow still passes. Never activate production flags from this staged feature.

```bash
# Desktop
cargo test --manifest-path src-tauri/Cargo.toml --lib contact_create_inbox -- --nocapture
cargo test --manifest-path src-tauri/Cargo.toml --test contact_inbox
npx tsc --noEmit

# Web
pnpm --filter @akilibiz/business-web exec tsc --noEmit
pnpm --filter @akilibiz/business-web test
```
