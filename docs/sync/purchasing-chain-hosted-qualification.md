# Purchasing chain — hosted end-to-end qualification

**Status (27 November 2026): passed on the development qualification project. Production gates remain off.**

Covers web-originated purchase orders, goods receipts and supplier payments applied through explicit
desktop staff review. The project owner approved running this against the `.env.qualification`
project (`vntqfaheiwotinpuefzl`, a development copy). Every run used its own disposable owners and
businesses and removed them by ID.

## How to run

```bash
AKILIBIZ_REAL_DESKTOP_WORKER=1 AKILIBIZ_PURCHASING_CHAIN=1 \
  node apps/business/scripts/qualify-phase1c-hosted.mjs
```

Add `AKILIBIZ_TWO_WAY_CONTACTS=1 AKILIBIZ_CONTACT_CREATION=1 AKILIBIZ_PRODUCT_CREATION=1` to run every
web-to-desktop stage. Result with every stage enabled: **66 PASS, 0 FAIL, 2 SKIP** (expired-token
fixture and the protected Vercel browser check need credentials), cleanup verified.

The runner registers a separate disposable business (C) for this stage, refuses a purchase order
request while its gate is off (`55000`), enables the three per-business request controls, and runs
`web_purchasing_chain_round_trips_through_desktop_review` in the desktop repository
(`src-tauri/tests/hosted_purchasing_chain_qualification.rs`). That test calls the real desktop staff
review functions and the production sync tick.

## What is proven

**Purchase order**
- a line that does not come to whole UGX is refused (`22023`);
- a retried request ID returns the same command; a second request for one draft is refused (`23505`);
- a requested draft can no longer be edited;
- staff without `purchase_orders.create` cannot list or approve;
- approval creates the order only (status `Pending`, no goods receipt or stock), and a replay returns the same order;
- with the ACK withheld the web stays `pending`; after restart with the ACK on it becomes `applied` and the order is mirrored for receiving.

**Goods receipt**
- delivering more than the remaining ordered quantity is refused (`22023`);
- staff without `purchase_orders.receive` cannot approve;
- approval posts the receipt once: stock rises from 1 to exactly 7 and a supplier payable of 7,200 UGX is created; a replay returns the same receipt;
- the web shows `applied` and the payable is mirrored with its outstanding amount.

**Supplier payment**
- allocating more than the outstanding payable is refused (`23503`);
- a retried request ID returns the same command; reusing it with different details is refused (`23505`);
- staff without `supplier_payments.create` cannot approve;
- approval posts one payment of 5,000 UGX (outstanding falls to 2,200), and a replay returns the same payment;
- a second request rejected by staff posts nothing, and the web shows `rejected`.

## Notes from qualification

- The desktop refuses to receive goods into a product whose existing stock has no authoritative cost
  evidence ("authorised reconciliation is required"). This is intended; the test gives its opening
  stock a cost record.
- The business mirror publishes one entity type per sync tick, so a goods receipt reaches the web
  over several ticks. This is by design; the test ticks until the payable appears.

## Finding: business mirror cannot recover from an older generation (not fixed)

`finalize_desktop_business_snapshot` refuses a generation that is not newer than the one the web
already committed for that desktop source (`23505`, "Stale or conflicting mirror generation"). The
desktop has no handling for this response, so it retries the same generation forever and that entity
type never publishes again.

This happens when a desktop's local generation counters go backwards for an existing source, for
example after **restoring an older backup** or reinstalling with the same business identity. The
qualification hit it when a second test database reused an existing source. The purchasing stage now
uses its own source.

A fix needs a design decision: for example, return the committed generation in the 409 response so the
desktop can continue from `committed + 1` and republish its current authoritative rows, plus a
backup/restore test.
