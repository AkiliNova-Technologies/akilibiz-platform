# Phase 2C4 — Recoverable web product review requests

## Why this increment is needed

Phase 2C3 introduced a deliberately staged, desktop-approved product-creation
workflow. However, the draft list originally held the pending request ID only
in the current browser's sessionStorage, and still exposed Edit/Discard on
drafts after the immutable request had been queued. A browser restart or a
second browser could therefore show the same draft as unsubmitted, while a
user might inadvertently change the text they thought was awaiting review.

## Implementation

- Additive hosted migration:
  `20261114210000_product_request_recovery_and_draft_freeze.sql`.
- The hosted database blocks UPDATE and DELETE on a draft once a matching
  `private.desktop_product_create_commands` record exists, irrespective of
  web UI, actor, browser or direct table access. Other drafts are unchanged.
  This protects the immutable snapshot from misleading subsequent edits.
- The new `public.list_desktop_product_create_statuses` SQL function returns
  up to 100 statuses for only the active business owner and selected business.
  It derives `published` only from a matching synchronized desktop catalogue
  product, not from a browser claim or local receipt alone.
- With product request features enabled, the drafts API retrieves statuses
  alongside drafts and categories and fails closed when that read is
  unavailable. It does not show a misleading empty queue on RPC failures.
- The draft list restores submitted state on reload, shows descriptive
  statuses for pending/desktop receipt/desktop-created/synchronized, and
  disables Edit/Discard for already submitted drafts.
- sessionStorage is retained *only* for stable retry identity when a POST
  outcome is unknown. It is never the authoritative publication status.
- API responses surface clear immutable-draft conflicts instead of generic
  persistence errors.

## Safety and gates

The independent Phase 2C1–2C3 gates remain off. No migration was applied,
and no desktop or live product record was touched. This is an additive,
development-only source change. The migration must be applied only after
previous product draft, staging and receipt migrations, on disposable test
infrastructure before any production deployment.

## Non-destructive source validation

```bash
cd ~/Desktop/akilibiz-platform
git -c url."https://github.com/".insteadOf="git@github.com:" pull --ff-only origin dev
pnpm --filter @akilibiz/business-web exec tsc --noEmit
pnpm --filter @akilibiz/business-web test
```

Next staging qualification should test: owner/manager separation, recovery in
a second browser, loss of sessionStorage during a pending POST, exact
idempotent retry, editing a submitted draft via direct SQL/RLS client,
device revocation, and published status only after the full catalogue
projection arrives. Destructive tests remain last on isolated disposable DB.
