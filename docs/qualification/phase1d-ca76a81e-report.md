# Phase 1D hosted recovery qualification

- Project: `vntqfaheiwotinpuefzl`
- Run: `ca76a81e-966c-42ab-90fb-28af34a0f0b1`
- Result: 39 passed, 0 failed, 1 skipped
- Cleanup: passed; zero scoped business/Auth resources remained
- Production synchronization gates: unchanged and disabled

## New recovery coverage

- The HTTP response socket was destroyed after the hosted catalogue RPC began
  returning its response. Retrying the identical event identity succeeded and
  did not duplicate the catalogue receipt.
- Refresh-token recovery, invalid-token rejection, lost acknowledgement,
  duplicate registration/events/checkpoints/movements/mirror chunks, device
  revocation, and cross-business isolation all passed against hosted Auth and
  PostgREST.
- A correctly signed expired JWT remains unexecuted. The harness now supports
  it only when `SUPABASE_LEGACY_JWT_SECRET` is explicitly supplied in process
  memory; the secret was deliberately not retrieved or persisted for this run.

## Cleanup verification

The harness deleted only rows and Auth identities associated with the run UUID
and verified zero remaining scoped rows across public/private mirror, pairing,
catalogue, contact, inventory, membership, audit, business, and Auth resources.
The recovery cleanup command remains idempotent.

## Qualification boundary

This run qualifies hosted synchronization contracts and transport recovery. It
does not activate production synchronization, rotate credentials, or prove the
new web UI in a browser session. The web application is covered by local
typecheck, lint, and component-policy tests; browser acceptance remains a
release-step check with a representative desktop-published financial dataset.
