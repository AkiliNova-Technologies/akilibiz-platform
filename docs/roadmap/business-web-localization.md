# AkiliBiz Business Web — implementation roadmap

## Deferred milestone: Language localization parity with AkiliBiz Desktop

**Status:** Planned / deferred. **Scope:** Business Web (`apps/business`) and any future shared web-facing UI packages. **Branch:** `dev`.

This milestone is explicitly deferred while AkiliBiz Desktop's localization is audited and stabilized. Do **not** change Business Web implementation, layouts, business logic, or deployment configuration as part of the current desktop-only localization work.

### Implementation requirements (future phase)

1. Audit all Business Web routes, navigation, reusable components, dialogs, forms, errors, validation messages, notifications, empty/loading states, receipts, printing, reports, and accessible labels for user-facing text.
2. Add **English (Uganda) `en-UG`**, **Luganda `lg-UG`**, and **Kiswahili `sw-UG`**. Reuse desktop-approved terminology where appropriate, but do not copy desktop UI code or assume desktop and web screens have identical wording.
3. Implement typed message keys, placeholder checks, English fallback, locale selection and persistence, and immediate re-rendering without breaking authenticated navigation or server rendering.
4. Format dates, quantities and currency for display only. Preserve canonical database values, identifiers, enum codes, API payloads, permissions, accounting/tax calculations, UTC query semantics and user-entered business content.
5. Cover desktop-to-web feature parity, including new routes added after this roadmap entry.
6. Add CI checks for key parity, placeholder parity, missing literal text, TypeScript/build regressions, and relevant UI flows. Manually test every supported locale and responsive layout.
7. Obtain fluent Luganda and Kiswahili review of Ugandan small-business terminology before calling localization release-ready.

### Acceptance criteria

- Every user-facing Business Web screen and shared component is localized or explicitly documented as exempt (brand names, user-entered data, legal references, provider identifiers).
- No missing or mismatched translation keys/placeholders; no unintended English-only fallback on supported screens.
- Language preference persists across reloads and authenticated sessions as designed.
- Critical business workflows, receipt/report output, accessibility, and web builds pass regression testing.
- No change to accounting, stock, tax, payment, security or authorization semantics.

### Dependencies

Complete and validate the desktop localization source audit and its business terminology glossary first. Schedule the web localization milestone in a future Business Web implementation phase; **it is not part of the current desktop scope**.
