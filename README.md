# AkiliBiz Platform

Hosted platform foundation for AkiliBiz Business Web and the future shared API.

## Workspace

- `apps/business` — Next.js Business Web (`business.akilibiz.com`)
- `packages/config` — shared platform constants
- `packages/ui` — future shared UI primitives
- `crates/api` — future Rust modular-monolith API
- `infra` — local infrastructure only
- `docs/adr` — architecture decisions

## Start locally

```bash
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

Business Web runs at `http://localhost:3001`.

For PostgreSQL:

```bash
docker compose -f infra/docker-compose.yml up -d
```

## Security boundary

The browser is an authenticated client only. Tenant enforcement, membership/roles, audit records, provider credentials, payment callbacks, idempotency, and reconciliation belong to the server platform.

## Next implementation phase

Build the API and identity/tenant foundation before any business workflow screens.
