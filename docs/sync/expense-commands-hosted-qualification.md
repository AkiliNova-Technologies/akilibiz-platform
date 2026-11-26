# Expense commands — hosted end-to-end qualification

**Status (27 November 2026): passed on the development qualification project. Production gates remain off.**

Covers web-originated expense creation (paid and on supplier credit), settlement of an expense payable,
and voiding, each applied through explicit desktop staff review. The project owner approved running
this against the `.env.qualification` project (`vntqfaheiwotinpuefzl`, a development copy). Every run
used its own disposable owners and businesses and removed them by ID.

## How to run

```bash
AKILIBIZ_REAL_DESKTOP_WORKER=1 AKILIBIZ_EXPENSES=1 \
  node apps/business/scripts/qualify-phase1c-hosted.mjs
```

The runner registers a separate disposable business (E) with its own desktop source, checks that a
valid expense request is refused while the business gate is off (`55000`), enables creation, settlement
and void for that business, and runs `web_expense_commands_round_trip_through_desktop_review`
(`src-tauri/tests/hosted_expense_qualification.rs` in the desktop repository).

With every web-to-desktop stage and the backup-restore stage enabled: **71 PASS, 0 FAIL, 2 SKIP**
(expired-token fixture and the protected Vercel browser check need credentials), cleanup verified.

## What is proven

- an expense whose net plus tax does not equal gross is refused (`22023`);
- recoverable input VAT without supplier invoice evidence is refused (`22023`);
- a retried request ID returns the same command; reusing it with different details is refused (`23505`);
- staff with `finance.view` only can see staged commands but cannot post them;
- a paid expense and a supplier-credit expense are each posted exactly once, and a replayed approval returns the same expense;
- the supplier-credit expense creates an open payable of 30,000 UGX; both are mirrored and the web shows `applied`;
- settling more than the outstanding payable is refused (`23503`); a 10,000 UGX settlement posts once and leaves 20,000 outstanding;
- a void needs `finance.reverse` as well as `finance.post` (enforced by the finance service); with it, the expense becomes `voided` with one void record kept;
- a void request rejected by staff leaves the expense posted, and the web shows `rejected`.

## Design notes confirmed

- The finance service is idempotent by the web request ID for create, settle and void, so a crash
  between posting and writing the local decision receipt cannot post twice on retry.
- The web payload uses the same snake_case field names as the desktop DTOs and the hosted
  payment-method values (`Cash`, `Bank Transfer`, ...) are accepted by the desktop.
