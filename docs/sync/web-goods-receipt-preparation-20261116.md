# AkiliBiz goods receiving — web draft preparation

**Status:** Source-only implementation on `dev`. Not deployed or qualified.
**Switch:** `AKILIBIZ_ENABLE_WEB_GOODS_RECEIPT_DRAFTS=1`, independently
OFF by default. It must remain disabled in shared/production environments.

## Supported work

The owner can open `/dashboard/suppliers/orders/receive` from Purchase
Orders, choose an open **desktop-published** Pending/Partially Received order,
record the actual delivered quantity (thousandths), edit exact whole-UGX
unit costs, enter receipt number/date and payment due date, optionally
record a supplier reference, and save/edit/discard an owner-scoped draft.

The supplier invoice section supports:
- No invoice document: **VAT not assumed, never inferred**.
- Explicit supplier EFRIS e-invoice or tax invoice, with number/date,
  evidence reference, optional TIN, declared VAT in whole UGX, and per-line
  supplier invoice tax classification/inclusive-price flags.
- No class is preselected for supplier invoice lines. Actual supplier evidence
  must be entered. **Nothing is claimed or reconciled with URA here.**

Both the web endpoint and SQL trigger validate quantities, source identities,
whole-UGX amounts and invoice evidence. The draft is bound to its tenant,
creator, originating desktop business and purchase order. Changing the
purchase order requires creating a new draft.

### Source paths
- `apps/business/lib/goods-receipt-draft-validation.ts`
- `apps/business/app/api/purchasing/receipts/drafts/route.ts`
- `apps/business/app/(app)/dashboard/suppliers/orders/receive/page.tsx`
- `supabase/migrations/20261115000000_web_goods_receipt_preparation.sql`
- Corresponding unit/API/migration contract tests.

## Explicitly NOT implemented

**Saving a draft does not receive anything.** No `goods_receipts` row,
purchase-order-line received quantity, stock movement, supplier payable,
supplier payment, journal posting, or input-VAT claim is created.

Actual receiving must use the existing desktop
`purchase_order_service::create_goods_receipt_with_supplier_vat` (with
explicit supplier document) or `create_goods_receipt` (no supplier
document). The next implementation depends on designing a separate
immutable request queue, explicit local staff receipt approval, idempotent
desktop posting receipt, and confirmed hosted ACK. Rechecking quantities
against current SQLite, actual delivery and invoice evidence at the exact
posting moment is mandatory: web snapshots can become stale.

The current web preparation limit is 100 receipt lines and 100 saved
owner drafts per complete listing. Larger registers fail clearly rather
than claiming an incomplete report is complete.

## Validation

```bash
cd ~/Desktop/akilibiz-platform
git pull --ff-only origin dev
pnpm --filter @akilibiz/business-web exec tsc --noEmit
pnpm --filter @akilibiz/business-web exec vitest run \
  lib/goods-receipt-draft-validation.test.ts \
  lib/goods-receipt-preparation-contract.test.ts \
  app/api/purchasing/receipts/drafts/route.test.ts
pnpm --filter @akilibiz/business-web test
```

Source tests are not a substitute for the final disposable PostgreSQL/
SQLite integration acceptance. The new SQL migration must not be applied
to an existing business project as part of this incremental code change.
