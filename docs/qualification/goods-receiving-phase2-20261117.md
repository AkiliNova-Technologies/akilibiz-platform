# Goods Receiving Phase 2 Qualification — 2026-11-17

## Result

Phase 2 is integration-qualified in disposable PostgreSQL and SQLite environments. Production activation remains disabled.

The qualified flow is: owner prepares and submits a frozen web draft; the paired desktop stages the immutable command; a staff member with `purchase_orders.receive` explicitly approves or rejects it; approval invokes the existing atomic desktop goods-receipt service with the hosted command UUID as its idempotency key; the immutable local decision receipt is then retried until the hosted request acknowledges the same receipt identity.

## Safety properties

- Hosted controls default to `requests_enabled=false`.
- Web API gate `AKILIBIZ_ENABLE_WEB_GOODS_RECEIPT_REQUESTS` defaults off.
- Desktop receive/apply/ack gates are independent and default off:
  `AKILIBIZ_ENABLE_GOODS_RECEIPT_REVIEW_INBOX`,
  `AKILIBIZ_APPLY_GOODS_RECEIPT_REVIEW_INBOX`, and
  `AKILIBIZ_ACK_GOODS_RECEIPT_REVIEW_INBOX`.
- Desktop UI gate `VITE_AKILIBIZ_GOODS_RECEIPT_REVIEW_UI` defaults off.
- Submitted drafts cannot be edited or deleted.
- Every fetch, fresh approval, rejection, and hosted acknowledgement is source/device/owner scoped.
- Local application delegates to the existing goods-receipt transaction; no second stock, payable, VAT, costing, or accounting implementation exists.
- A crash after posting but before the local/hosted receipt is recoverable: replaying the command uses the same idempotency key and returns the original goods receipt and payable.
- Local decisions are immutable; only a single null-to-timestamp hosted acknowledgement transition is allowed.

## Actual validation

### Disposable PostgreSQL 17

The preparation and request migrations were applied to a pristine `postgres:17` container with Supabase-compatible auth/owner/device fixtures. Results:

- partial receipt draft and immutable command submission: pass
- identical request replay: pass, same server command UUID
- changed request identity for the same draft: rejected
- owner/tenant isolation: rejected
- device-scoped pending fetch: pass
- first applied acknowledgement: pass
- identical acknowledgement replay: pass
- changed receipt identity replay: rejected
- revoked device fetch: rejected
- migration RLS/grant posture: tables forced RLS with no direct authenticated access; public RPCs only

The container was removed after qualification.

### Disposable SQLite

The complete desktop migration set and existing purchasing services were exercised on temporary database files:

- partial then full receipt: pass
- exact inventory balance and PO state derivation: pass
- exact supplier payable creation: pass
- retry with the same idempotency key: pass, one receipt
- changed payload with the same key: conflict
- immutable/unique decision receipt and single hosted ACK transition: pass
- over-receiving guard: covered by the existing service constraint and purchasing workflow suite
- cross-business supplier/payable facts: isolated
- VAT evidence and accounting remain on the existing atomic service path

Rust results: 5 purchasing integration tests passed; 3 Phase 2 inbox/receipt tests passed; `cargo check` passed.

### Web and desktop application

- Web: 54 files / 242 tests passed; TypeScript passed; ESLint 0 errors and 5 pre-existing warnings.
- Desktop production build passed (one existing bundle-size warning).
- Desktop Vitest: 164/165 passed. The sole failure is pre-existing localization debt in `AccountPage` (three English strings), unrelated to Phase 2.
- Desktop ESLint remains blocked by a pre-existing `SettingsBackupRestorePage.tsx` memoization error, unrelated to Phase 2.

## Network and interrupted-operation behavior

Network failures before approval prevent posting because the desktop must first verify hosted pending authorization. Failures after local approval leave the immutable decision unacknowledged; the independent ACK worker retries without reposting. If interruption occurs between the canonical posting transaction and inserting the decision receipt, staff approval replay calls the canonical service with the same command UUID and recovers the original receipt rather than creating new inventory or financial transactions.

## Activation disposition

All production gates remain disabled. No deployment or production database change was performed.
