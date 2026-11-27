# Web POS cash sales — hosted end-to-end qualification

**Status (27 November 2026): cash sales pass end to end on the development qualification project.
Production gates remain off.** Mobile money, credit sales, discounts, customers and service lines are
not supported by hosted posting yet.

The project owner approved running this against the `.env.qualification` project
(`vntqfaheiwotinpuefzl`, a development copy). Every run used its own disposable owners and businesses
and removed them by ID.

## How to run

```bash
AKILIBIZ_REAL_DESKTOP_WORKER=1 AKILIBIZ_WEB_POS=1 \
  node apps/business/scripts/qualify-phase1c-hosted.mjs
```

The runner registers a separate disposable business (P) with its own desktop source, checks that a
cash sale is refused while posting is off (`55000`), enables posting for that business with the audit
fields, and runs `web_cash_sale_round_trips_through_desktop_accounting`
(`src-tauri/tests/hosted_web_pos_qualification.rs` in the desktop repository).

With every web-to-desktop stage, backup restore and web POS enabled: **74 PASS, 0 FAIL, 2 SKIP**
(expired-token fixture and the protected Vercel browser check need credentials), cleanup verified.

## What is proven

- the desktop publishes its POS tax profile and the web prices sales from it;
- a product the desktop cannot price (no VAT treatment while VAT registered) is refused (`55000`);
- a line that does not come to whole UGX is refused (`22023`), as the desktop would;
- selling more than sellable stock is refused (`23514`);
- the read-only quote and the posted sale have identical VAT (369 UGX) and total (2,419 UGX) for a sale
  mixing two VAT-exclusive 25 UGX lines and a VAT-inclusive line;
- cash with change is accepted, and a replayed post returns the same sale;
- the desktop applies it through its own accounting transaction exactly once, with the same total and
  VAT, and stock falls by exactly the quantities sold;
- the web sale reaches `reconciled` and the web's stock position matches the desktop.

## Defects found and fixed

Each of these alone made every web sale fail:

1. **No tax data on the web.** Nothing wrote `private.web_pos_tax_settings` or
   `web_pos_product_tax_rules`, so posting always failed with "Tax settings need verification". The paired
   desktop now publishes its profile (`publish_desktop_pos_tax_profile`, migration `20261127150000`):
   VAT registration plus each product's rate and tax-inclusive flag, resolved exactly as the desktop's
   sale code resolves them. Products the desktop cannot price are omitted. Desktop switch:
   `AKILIBIZ_PUBLISH_WEB_POS_TAX_PROFILE=1`.
2. **VAT rounding mismatch.** The web rounded VAT per line; the desktop rounds once per invoice and
   allocates by largest remainder, then rejects any difference. Two 25 UGX lines at 18 % gave 10 UGX on
   the web and 9 on the desktop. Pricing now lives in one function (`private.web_pos_price_sale`) using
   the desktop's algorithm, shared by posting and the new read-only `quote_web_pos_cash_sale`.
3. **VAT-inclusive sales always rejected by the desktop.** Its staging check requires
   subtotal + VAT = total, while its apply check compared the subtotal with gross line amounts. The apply
   check now compares with total − VAT (desktop `sale_service`).
4. **Products never mapped on the desktop.** Nothing wrote product rows to `cloud_record_mappings`, so the
   desktop rejected every delivered sale as referencing an unmapped product. It now refreshes mappings from
   its own published catalogue when a sale names an unknown product.
5. **Checkout under-charged VAT-exclusive products.** The quote had no VAT and the cash dialog collected the
   net subtotal, which posting then refused. The quote API now returns the database VAT and total, and the
   dialog collects `total_ugx`.

## Checkout UI (27 November 2026)

With `NEXT_PUBLIC_AKILIBIZ_ENABLE_WEB_POS=1`, the POS page's main **Complete sale** button opens the
hosted cash checkout (the separate "Complete cash sale" button is gone). The dialog verifies the cart
through the quote (amount due including VAT), shows change due, keeps the idempotency key until the web
accepts the sale, refreshes the status every five seconds while the desktop confirms, and offers
**Start next sale**, which clears the cart and the finished request. Previously a completed request was
never cleared, so the dialog blocked every following sale. Mobile money and credit orders show a clear
"not available on the web yet" message instead of an unhandled error.

## Remaining before production

- browser-level acceptance of the checkout UI (the hosted logic it calls is covered above; the UI is
  covered by unit tests, typecheck and a production build only);
- mobile money, credit sales, discounts and customer selection on the web;
- service products: the quote allows them, but posting requires a stock position;
- the CI isolated POS workflow (`web-pos-postgres-qualification.yml`) does not yet include migration
  `20261127150000`.
