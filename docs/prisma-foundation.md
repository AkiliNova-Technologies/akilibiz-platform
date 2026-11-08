# AkiliBiz Prisma foundation (hosted PostgreSQL)

Prisma ORM is introduced for **server-side TypeScript business services**. Supabase remains the PostgreSQL host and identity provider; Tauri keeps SQLite for offline work.

## Important transition boundary

- Existing `supabase/migrations` SQL is the authoritative schema/migration history. Do not run Prisma migrations or `prisma db push` against the existing hosted database.
- The Prisma schema is an explicit representation of the existing public tenancy tables. Supabase-managed `auth.users`, RLS, triggers, SQL functions, check constraints and partial indexes remain managed by SQL. Prisma schema alone **cannot** reproduce all of these.
- Do **not** use `prisma migrate dev`, `prisma migrate reset`, or `prisma db push` on a live database. Do not mark existing Supabase migrations as Prisma migrations.
- Supabase Auth sessions and user-scoped RPCs remain in place until each Prisma service has a reviewed authorization design. The selected business cookie is **not** an authorization credential.
- The runtime database credential must never be exposed as `NEXT_PUBLIC_*`. Prisma runs only in the Node.js server runtime. Avoid `postgres`, `service_role` or `BYPASSRLS` for untrusted tenant operations.
- Prefer a dedicated least-privileged runtime role. Prisma's direct PostgreSQL connection does not automatically carry the Supabase authenticated user's JWT; using an admin role bypasses user RLS.
- No new business records or synchronization logic are introduced by this foundation.

## Environment

Copy these names into your local `apps/business/.env.local` (do not commit secrets):

```env
# Supabase Postgres pooler/session connection, server-only
DATABASE_URL="postgresql://<runtime-user>:<password>@<pooler-host>:5432/postgres?sslmode=require"
# Direct database connection for introspection and controlled migration tooling
DIRECT_URL="postgresql://<migration-user>:<password>@<direct-host>:5432/postgres?sslmode=require"
```

Use your Supabase project's actual connection strings; do not assume the example host or port is correct for your network.

## Developer commands

```bash
pnpm install
pnpm --filter @akilibiz/business-web db:validate
pnpm --filter @akilibiz/business-web db:generate
pnpm --filter @akilibiz/business-web typecheck
pnpm --filter @akilibiz/business-web build
```

`db:introspect` is intentionally **not** part of CI: `prisma db pull` can rewrite the schema and requires database access. Review any introspection diff manually against existing SQL migrations.

## Next implementation

1. Verify the schema against a disposable local Supabase database and test with a non-privileged runtime DB role.
2. Implement an authorization-aware server service that validates a live Supabase user and active membership before **every** Prisma operation; preserve DB-level RLS/defense in depth.
3. Migrate the read-only business profile first, with tenant-isolation tests. Only then migrate writes with transactional audit and permission checks.
4. Introduce products/inventory and transactional sales services with idempotency and synchronization contracts.

## Lockfile

Adding Prisma dependencies requires regenerating `pnpm-lock.yaml` with pnpm 12.4.1 and committing the generated lockfile. Until that is done, do not consider the dependency upgrade reproducible. Do not manually fabricate integrity hashes.
