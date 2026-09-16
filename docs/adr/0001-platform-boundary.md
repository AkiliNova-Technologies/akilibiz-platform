# ADR 0001: Separate hosted platform repository

## Decision

AkiliBiz Platform is a separate monorepo. It hosts the Business Web application, shared browser packages, and the future Rust API.

## Consequences

- The Tauri desktop repository remains independently releasable and offline-first.
- PostgreSQL becomes the hosted platform's authoritative store; tenant access is enforced by the server, never by a browser-supplied business ID.
- Payment providers are implemented only in the server-side gateway/API boundary. Browser code never receives provider secrets or raw callbacks.
- This foundation intentionally excludes authentication, database schema, payments, synchronization, and feature workflows. They each require their own reviewed phase.
