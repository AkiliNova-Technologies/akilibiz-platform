# Phase 1E pre-rotation acceptance report

- Project: `vntqfaheiwotinpuefzl`
- Run: `395f4ffd-9b27-4b6f-9d08-ea32d0c4e02e`
- Hosted qualification: 54 passed, 0 failed, 1 skipped
- Cleanup: passed; zero scoped database/Auth resources remained
- Rotation status: not performed; approval boundary preserved
- Production synchronization gates: disabled

## Completed

- Enforced publishable and scoped-secret key formats in the hosted harness.
- Verified newly issued access tokens use asymmetric ES256 signing.
- Published and read representative finance transaction, authoritative expense,
  supplier payment, journal entry, journal line, and chart-of-account mirrors.
- Verified exact representative amounts survived desktop-to-hosted publication.
- Added income, cash-flow, and joined journal-ledger read-only presentations.
- Added owner-only policy, pagination, and presentation mapping regression tests.
- Verified tenant isolation, device revocation, refresh recovery, invalid-token
  rejection, transport interruption recovery, idempotency, and cleanup.
- Production web build passed; browser-static assets contained zero secret
  values, legacy HS256 JWTs, or server-only secret variable names.

## Not completed

- The genuinely expired, correctly signed access-token assertion remains
  skipped. ES256 private signing material is intentionally unavailable; the
  safe test requires the approved temporary 120-second Auth token lifetime.
- No live API key was disabled or revoked and no signing key was rotated or
  revoked.
- A real graphical browser session was not executed because this workspace has
  no browser automation package. The production build, pure presentation tests,
  hosted representative records, and authenticated read-model security passed,
  but final human/browser rendering acceptance remains a release check.
- Tax pages remain guidance/read-only navigation. The contract mirrors tax
  settings/configuration and evidence records but does not publish an
  authoritative VAT summary suitable for web totals. No totals were fabricated.

## Security advisors

- INFO: private synchronization tables have forced RLS and intentionally no
  client policies; grants are revoked and access is through guarded functions.
- WARN: authenticated `SECURITY DEFINER` synchronization RPCs remain intentional
  API endpoints. Hosted owner/device/tenant/revocation tests passed.
- WARN: leaked-password protection remains disabled.

## Decision

Pre-rotation implementation is accepted. Production synchronization remains a
**NO-GO** until the approved legacy-key disable/revocation window, genuine token
expiry test, leaked-password decision, and final browser rendering check finish.
