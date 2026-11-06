# AkiliBiz Web implementation baseline

Status: provisional, source-inspected on 2026-11-06. This document does not estimate completion of unpushed local work.

## Confirmed on GitHub main at branch creation

- `apps/business` is a Next.js application in a pnpm/Turborepo workspace.
- `apps/business/app/(app)/dashboard/page.tsx` contains a heading-only dashboard.
- `crates/api/Cargo.toml` explicitly states that the Rust API is not implemented in the setup phase.
- `README.md` describes identity/tenant foundation and API as next steps.
- Recent local desktop-to-web screen migration work reported in development conversations is **not verified on this GitHub baseline**.

## Rules for development

- Use `dev` for implementation; keep `main` stable.
- Reconcile the user's latest local web changes with `dev` before implementing modules or claiming completion.
- Preserve the Desktop AkiliBiz interaction patterns and design identity, while using web-appropriate backend/security boundaries.
- Classify each module as functional, partial, UI-only, or absent after checking data operations, authorization, validation, errors, and end-to-end workflow.
- Do not copy desktop SQLite or Tauri-only APIs into browser code.

## Audit queue

Authentication and tenancy; dashboard; POS and sales; products/categories; inventory; customers/credit; suppliers/purchasing; finance/tax; reports; staff/permissions; settings; receipts; backend API; PostgreSQL/migrations; integrations; responsive behavior.

## Blocker

The latest local `akilibiz-platform` implementation must be pushed or merged into this `dev` branch before a meaningful functionality gap estimate can be made. Avoid overwriting local commits.
