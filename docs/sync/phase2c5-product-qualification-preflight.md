# Phase 2C5 — Product-publication qualification preflight

**Status: partially completed, not end-to-end qualified.** This increment performs read-only live-schema inventory and source-contract hardening only. It does **not** deploy any migrations, initialize staging, change a business record, or enable the product creation pilot.

## Read-only Supabase inventory, 14 November 2026

The currently connected Supabase project named `akilibiz-platform` is active.
Its registered migration history ends at:
`20261109095045_phase1_hosted_function_corrections`.

Verified through read-only SQL:
- `public.desktop_products` exists.
- `public.web_product_drafts` does **not** exist.
- `private.desktop_product_create_commands` does **not** exist.
- `private.is_active_business_owner(uuid)`,
  `private.require_desktop_inventory_source(uuid,text,uuid)`, and
  `public.upload_desktop_catalogue(...)` exist.
- The project already contains business records.

**Do not activate or migrate this live project as a qualification shortcut.**
The source repository contains many un-applied migrations, not only the five
product-preparation migrations. A disposable, clearly identified Supabase
environment with no real business or payment data is required for live
end-to-end qualification.

## Source-level hardening completed

- `20261114190000_product_create_request_staging.sql` now validates:
  exact 14-option object, accepted product/inventory types, unit names,
  boolean flags, finite nonnegative numeric inputs within desktop bounds,
  package quantity/measure pairing, and three-decimal stock thresholds.
  Invalid JSON or values fail cleanly before queue creation instead of
  throwing an unexpected numeric-cast error or staging an impossible request.
- `product-publication-contract.test.ts` now asserts default-off staging,
  strict option validation, paired-source ACK, and catalogue-dependent
  published status.

These source migrations have never been deployed in this increment.

## Disposable qualification sequence (non-destructive first)

1. Prepare a **new disposable staging Supabase project** with no live users,
   sales, stock, or business data. Do not reuse `akilibiz-platform`.
2. Apply the repository's migrations in numeric order in disposable staging
   and verify function signatures, private grants, RLS, and trigger effects.
3. Create disposable owner/manager/staff identities and an isolated paired
   desktop business. Keep product gates off at first; test denial.
4. Opt in only the disposable business and both clients. Create one draft,
   submit one UUIDv4 command, stage it, approve with a real local VAT
   treatment and test atomic product + receipt commit.
5. ACK receipt; verify `applied` before catalogue upload, then verify
   `published` only after the matching category, SKU and local product ID
   are synchronized to the same source. Verify no opening stock.
6. Test duplicate request replay, lost HTTP response, stale/revoked pairing,
   tax/permission denial, tenant isolation, submitted-draft update/delete
   rejection and cross-browser recovery.
7. Run read-only consistency verification first, followed by controlled
   fault injection; reserve **destructive migration/recovery testing for last**
   and only against the disposable staging data.

**Do not claim end-to-end completion until all checks above have evidence.**

## Local non-destructive source validation

```bash
cd ~/Desktop/akilibiz-platform
git pull --ff-only origin dev
pnpm --filter @akilibiz/business-web exec tsc --noEmit
pnpm --filter @akilibiz/business-web test
```

Source-level tests do not apply migrations or enable any live feature flags.
