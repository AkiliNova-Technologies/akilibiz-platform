# Web ↔ Desktop UI parity — screen plan

Goal: a user moving between AkiliBiz Desktop and AkiliBiz Web sees the same words, buttons, inputs,
cards and tables in the same places. The desktop is the reference.

## How parity is kept

1. **One set of words.** The web uses the desktop's dictionaries (`en-UG`, `lg-UG`, `sw-UG`) and
   translate/format helpers, copied unchanged into `apps/business/lib/i18n` by
   `node apps/business/scripts/sync-desktop-i18n.mjs`. Run it with `--check` after desktop wording
   changes; it fails on any drift. Never edit `lib/i18n/*` on the web.
2. **Same hook.** Web screens call `useI18n()` (`components/akilibiz/i18n/i18n-provider.tsx`), which has
   the desktop hook's shape `{ locale, t, setLocale }`. Server components use `getI18n()`
   (`lib/i18n/server.ts`). The language is a per-device cookie, so both agree.
3. **Same structure.** Each web screen is rebuilt from its desktop source file: same page header,
   heading and description, toolbar, filters, cards, table columns in the same order, dialogs, and empty,
   loading and error states, using the same translation keys and Tailwind classes. Only data access
   differs (hosted APIs instead of desktop commands).
4. **Measured.** `node apps/business/scripts/ui-parity-report.mjs` writes `report.md`: for each screen,
   the desktop labels the web does not show yet.

## Status (27 November 2026)

Overall label parity: **68 %** (1,959 of 2,883 desktop labels). See `report.md` for each screen.

| Area | Status |
| --- | --- |
| Translations, language provider, language choice saved per device | Done |
| Settings → Language | Done: same layout, keys and three languages (100 %) |
| App shell: sidebar menu, page header, theme switch, account menu | Done: desktop keys, order and wording ("Backup, Restore & Sync" is now the desktop's "Backup & Restore"). Not applicable: the desktop's signed-out sidebar text (the web redirects to sign-in). |
| All other screens | To rebuild from the desktop source, in this order (most used first): POS new sale, Products, Customers, Inventory, Suppliers and purchase orders, Dashboard, Sales history, Finance, Reports, Staff, Settings |

## POS prerequisites (28 November 2026)

- POS wording uses the desktop dictionary (24 differing wordings fixed).
- The web catalogue now receives each product's **selling unit**, **decimal-quantity setting** and
  **VAT-inclusive flag** (hosted migration `20261128090000`, desktop migration `0127`), which the desktop
  POS layout needs for "Sell in", measured quantities and VAT presentation. Optional fields: an older
  desktop keeps syncing and never clears them. Hosted qualification (web POS stage) checks the snapshot
  and a later change event.
- Next: port the desktop POS page onto this data.

## Shared wording and parts (28 November 2026)

- Every web screen now takes its text from the desktop dictionaries, so changing the language changes it
  everywhere, as on the desktop (before, only POS and Language did; the rest copied the English).
  `scripts/adopt-desktop-wording.mjs` replaced about 1,100 hard-coded strings with the desktop key that has
  the same English. Rerun it after rebuilding a screen; it skips text already translated.
- The data table, empty state, refresh button, date-range picker (with presets) and receipt settings
  preview are now the desktop's own files, synced by `sync-desktop-i18n.mjs`.
- At 100 %: POS, Sales History, Credit Orders, Customer Purchase History, Income, Cash Flow, Ledger,
  Staff Activity Logs, Receipt Settings, Analytics, Language.

## Products (28 November 2026)

- `/dashboard/products` is the desktop Products screen (`products/desktop-port/desktop-products-page.tsx`,
  differences marked `WEB:`) with the desktop's own product form (`products/desktop/product-sheet.tsx`, synced).
  Same cards, table columns, toolbar, view dialog, deactivate dialog and export confirmation.
- Data: desktops publish each product's details (type, units, package contents, wholesale and minimum prices,
  stock levels, tracking, tax class) with the catalogue (desktop migration `0129`, hosted `20261128130000`).
  Margin and low stock use the desktop's rules (`lib/desktop-product-row.ts`). Stock is the synced position.
- Add product (owner): prepares a draft and asks the paired desktop to create it; it appears after the
  desktop applies it and syncs. Wholesale price, minimum price, pack size and tax class are not carried by
  this request yet; set them on the desktop.
- Edit and deactivate (owner): the web sends only the changed fields to the paired desktop
  (`/api/sync/product-changes`, hosted `20261128140000`). Desktop staff review each request (Backup & Restore →
  Review web product changes) and an approved change runs through the desktop's own product update. A product
  changed on the desktop since the web loaded it is refused automatically, never overwritten. Switches: web
  `AKILIBIZ_ENABLE_PRODUCT_CHANGE_REQUESTS=1`, the business's row in `private.desktop_product_change_controls`,
  desktop `AKILIBIZ_ENABLE/APPLY/ACK_PRODUCT_CHANGE_INBOX=1` and `VITE_AKILIBIZ_PRODUCT_CHANGE_REVIEW_UI=1`.
- Export downloads the catalogue CSV. Variants, CSV import and import history are done on the desktop for now
  (the buttons stay in the desktop positions and say so).

## Receipts (28 November 2026)

- The receipt dialog (POS after a sale, Sales History and Customer History reprints) is the desktop's own
  `SalePrintPreviewDialog`, with its receipt layout, print formats (58 mm, 80 mm, A4) and print service, synced
  unchanged into `components/akilibiz/documents/desktop`.
- The receipt is never recomputed on the web. Each desktop publishes its canonical receipt per sale
  (desktop migration `0128`, mirror entity `receipt_snapshots`, refreshed when the sale, payments or business
  profile change). `/api/receipts/[saleId]` returns it with the mirrored business profile and receipt
  settings. A sale the desktop cannot build a receipt for shows the desktop's reason.
- A print on the web is recorded in `private.web_receipt_prints` (`record_web_receipt_print`), because the
  desktop print audit is local.
- Owner, manager and cashier can open and print receipts (`get_web_receipt`, desktop permission
  `pos.view_sales`); the raw mirror tables stay owner-only. The business logo is not printed on the web,
  because desktop media files stay on the desktop.

## Platform differences that stay

Web-only capabilities keep their own entries without moving any shared element:

- **Switch business** in the account menu (one login can own several businesses on the web).
- **Desktop synchronization** (`/dashboard/settings/desktop-sync`): web-side review of changes waiting
  for the desktop. On the desktop, sync lives inside Backup & Restore.
- Product and purchase-order **drafts** prepared on the web for desktop review.

## Not yet verified

Parity here is checked from source (wording, structure and classes). A visual side-by-side check of each
screen at the desktop audit sizes (1024×768, 1280×720, 1366×768, 1600×900) is still required.
