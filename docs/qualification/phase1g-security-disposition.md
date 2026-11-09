# Phase 1G — hosted synchronization security disposition (interim)

Date: 2026-11-09  
Project: `vntqfaheiwotinpuefzl`  
Scope: **read-only** live catalog inspection, following Phase 1F. No database changes, credentials, feature-flag changes, or production activation.

## Security advisor findings and dispositions

| Advisor | Current finding | Disposition |
| --- | --- | --- |
| [RLS enabled without a policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) | 8 `private.desktop_*` staging/receipt tables | **Intentional deny-by-default; conditionally accepted.** All eight have RLS enabled, zero policies, and zero direct SELECT/INSERT/UPDATE/DELETE privileges for `authenticated`; anonymous SELECT is also denied. Keep the no-client-grants invariant under regression testing. |
| [Authenticated SECURITY DEFINER execution](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable) | 17 public RPC signatures | **Intentional API surface; conditionally accepted.** All 17 are callable by `authenticated`, none by `anon`, and each sets the fixed empty `search_path`. Phase 1F runtime authorization, tenant and device-revocation tests passed. Each RPC must continue enforcing its own authorization; these structural checks cannot prove its function body safe. |
| [Leaked password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) | Auth setting disabled | **Outstanding action.** Enable through Supabase Auth settings subject to plan availability; validate sign-in/password flows. No database/RPC change is an alternative to this control. |

## Eight staging/receipt tables

- `private.desktop_inventory_checkpoint_product_balances`
- `private.desktop_inventory_checkpoints`
- `private.desktop_inventory_current_metadata`
- `private.desktop_inventory_movement_cursors`
- `private.desktop_inventory_movement_receipts`
- `private.desktop_mirror_batch_rows`
- `private.desktop_mirror_batches`
- `private.desktop_mirror_heads`

Do **not** add permissive policies to silence the advisor. These are internal state tables; authenticated callers reach them only through authorized RPC execution.

## Seventeen explicitly reviewed RPC entry points

- Pairing/registration: `claim_desktop_pairing`, `create_desktop_pairing`, `register_desktop_business`, `onboard_business`.
- Catalogue and contacts: `apply_desktop_catalogue_event`, `upload_desktop_catalogue`, `upload_desktop_contacts`.
- Inventory: `apply_desktop_inventory_movement`, `confirm_desktop_inventory_checkpoint`, `list_desktop_effective_inventory`, `upload_desktop_inventory_metadata`, `upload_desktop_inventory_positions`.
- Financial mirrors: `stage_desktop_business_snapshot_chunk`, `finalize_desktop_business_snapshot`.
- Staff administration: `grant_business_staff`, `deactivate_business_staff`, `list_business_staff`.

The advisor count is not a permission to add unrestricted new RPCs. New functions, changed grants, relaxed search paths, membership/device-authorization changes, or new private-table grants require renewed review and cross-tenant regression tests.

## Repeatable check

From `apps/business`, with `DIRECT_URL` set only in the developer's local secure qualification environment:

```bash
pnpm verify:sync-security
```

This uses `psql` and a read-only transaction to verify those eight private staging tables and the 17 expected authenticated RPCs. It prints neither database credentials nor authentication tokens. Failures should block qualification; **do not apply automatic migrations** in response to a failure.

Verification performed while preparing this document: live Postgres catalogue queries confirmed all eight table permissions and 17 fixed search paths/anonymous execution restrictions; the generated SQL query also executed successfully. Running the entire local `pnpm` command still requires the developer's protected `DIRECT_URL` and a local `psql` installation.

## Remaining Phase 1G gates

This disposition is **not** production approval. Direct Rust transport-fault injection, authenticated Vercel browser acceptance with disposable test identities, and signed-expired-JWT testing remain outstanding. Production synchronization flags stay disabled.
