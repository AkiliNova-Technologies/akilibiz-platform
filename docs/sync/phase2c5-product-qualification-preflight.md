# Phase 2C5 — Product-publication qualification preflight

**Status (27 November 2026): hosted end-to-end qualification passed on the development project. Production gates remain off.** The original preflight below is kept for history.

## Hosted qualification evidence (27 November 2026)

The project owner confirmed that the `.env.qualification` project (`vntqfaheiwotinpuefzl`) is a
development copy used only by them, and approved running the qualification there. Every test
used its own disposable owners and businesses and was removed by ID. The two existing businesses
were not modified.

```bash
AKILIBIZ_REAL_DESKTOP_WORKER=1 AKILIBIZ_TWO_WAY_CONTACTS=1 AKILIBIZ_CONTACT_CREATION=1 \
AKILIBIZ_PRODUCT_CREATION=1 node apps/business/scripts/qualify-phase1c-hosted.mjs
```

Result with every stage enabled: 63 PASS, 0 FAIL, 2 SKIP (expired-token fixture and the
protected Vercel browser check need credentials), cleanup verified. The product stage
(`src-tauri/tests/hosted_product_create_qualification.rs`) calls the real desktop approval
functions and proves:

- an owner cannot write drafts into another business, even with a valid category of that business;
- incomplete desktop settings cannot be requested (`22023`);
- a retried request ID returns the same command; a second request for one draft is refused (`23505`);
- a requested draft can no longer be edited or deleted;
- the request is refused while the business gate is off (`55000`, checked by the runner);
- staff without `products.create` cannot list or approve requests;
- approval while offline creates nothing (fresh online authorization is required);
- approval creates the product and its immutable receipt atomically, with zero opening stock and the draft's exact prices;
- replaying an approval returns the same product; replaying with another VAT treatment is refused;
- after restart with the ACK enabled the status becomes `published` once the catalogue projection matches;
- a replayed ACK with the same receipt is idempotent and a different receipt is refused (`23505`);
- a second request reusing the SKU (any letter case) is refused at approval without a product or receipt.

Defects found and fixed while qualifying:

1. **Cross-tenant draft writes (security).** Every `web_product_drafts` policy compared
   `m.business_id=business_id`. Inside the membership subquery this resolved to
   `m.business_id=m.business_id`, so any owner or manager of any business could write drafts into
   another business. Fixed by `20261127090000_web_product_drafts_tenant_isolation.sql`. No drafts
   existed, so no cross-tenant data was created.
2. **Draft freeze trigger.** `20261114210000` could not be parsed (`end $;`), and its variable
   `draft_id` made the trigger fail with an ambiguous column error on every draft update or delete.
   Both are fixed in that migration.

Remaining before any production enablement: apply migrations to the production project through a
reviewed rollout, a desktop UI pass over the review panel (`VITE_AKILIBIZ_PRODUCT_CREATE_REVIEW_UI`),
multi-device pairing, and operational monitoring.

## Original preflight (14 November 2026)

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
