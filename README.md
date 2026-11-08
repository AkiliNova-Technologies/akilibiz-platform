# AkiliBiz Platform

Hosted platform foundation for AkiliBiz Business Web and the future shared API.

## Workspace

- `apps/business` — Next.js Business Web (`business.akilibiz.com`)
- `packages/config` — shared platform constants
- `packages/ui` — future shared UI primitives
- `crates/api` — future Rust modular-monolith API
- `docs/adr` — architecture decisions

## Start locally

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

Business Web runs at `http://localhost:3001`.

## Supabase identity and tenancy setup

1. Create a hosted Supabase project and enable Email/Password sign-in in **Authentication**.
2. Copy the project URL and **publishable** key into `.env` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These values are browser-safe; do not add a secret or service-role key.
3. Authenticate the Supabase CLI using your browser, then link this repository to the hosted project: `pnpm supabase login` and `pnpm supabase link --project-ref <your-project-ref>`. Neither command requires a database password, service-role key, or a value in this repository.
4. Review the pending migration and, after approval, apply it with `pnpm supabase db push`.
5. Create an Auth user in Supabase, then sign in at `http://localhost:3001/sign-in`.

The browser does not authorize a `business_id`. Database RLS derives business visibility from an active row in `business_memberships`; creating a business adds its owner membership in the same database transaction. The checked-in pgTAP test is optional future coverage for a dedicated database test environment; this project does not use Docker or a local Supabase stack.

## Security boundary

The browser is an authenticated client only. Tenant enforcement, membership/roles, audit records, provider credentials, payment callbacks, idempotency, and reconciliation belong to the server platform.

## Current phase

Phase 1 provides Supabase email/password sessions, protected dashboard access, and the identity/business tenancy schema. Business workflows are intentionally out of scope.
