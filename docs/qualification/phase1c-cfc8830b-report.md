# Phase 1C hosted qualification report

- Project: `vntqfaheiwotinpuefzl`
- Run: `cfc8830b-df23-4fca-a35c-92c373c2a69a`
- Started: 2026-11-09T10:21:31.573Z
- Finished: 2026-11-09T10:21:49.493Z
- Executed assertions: 37 passed, 0 failed
- Cleanup recovery rerun: passed

## Covered

Real Supabase Auth and PostgREST requests covered owner authentication, token
refresh, two business registrations, registration retry, device pairing and
pairing retry, missing and invalid bearer rejection, cross-tenant denial,
catalogue snapshots and event retries, contact snapshots, inventory snapshots,
checkpoint retry, ordered movement replay and duplicate protection, inventory
metadata, effective inventory, financial mirror staging/finalization, incomplete
publication rejection, prior-generation preservation, owner-only mirror reads,
staff grant/deactivation, non-owner restrictions, and device revocation.

All resources were scoped to the run UUID. The cleanup and recovery commands
verified zero remaining rows across the run's Auth users, businesses, membership,
audit, catalogue, contacts, inventory, checkpoint, movement, mirror, device,
pairing, and origin resources.

## Not qualified by this run

- A genuinely expired, correctly signed access token was not available without
  changing the project's JWT lifetime or waiting for expiry. Invalid JWT
  rejection and real refresh-token recovery passed separately.
- A transport-level connection abort was not induced. Lost-acknowledgement
  recovery was exercised by discarding successful responses and repeating the
  same registration, catalogue event, checkpoint, movement, and mirror chunk.
- The web financial mirror UI is incomplete. This run qualified the authenticated
  owner-only hosted read model, not final browser presentation.
- Production synchronization gates remained disabled.

## Security follow-up

Supabase Advisors continue to flag the intentionally authenticated
`SECURITY DEFINER` RPCs. Their internal owner, membership, tenant, and device
checks passed this run. Leaked-password protection remains disabled and should
be enabled before production activation.
