# Phase 1D security readiness

## Exposure assessment

Repository, Git-history, generated-report, CI configuration, and local log scans
were performed without emitting matching values. No `sb_secret_` value, legacy
HS256 JWT, service-role value, or JWT signing secret was found in either working
tree or the inspected `/tmp` logs. Matches in history are names, redaction
patterns, documentation, lockfile integrity strings, and SQL role identifiers.

The legacy hosted `service_role` JWT was displayed by the Supabase CLI during
the earlier qualification session and again by a Phase 1D metadata query whose
redaction logic did not recognize JWT-format legacy keys. It therefore has to be treated as exposed
even though it is not present in the repositories or retained qualification
artifacts. The Phase 1C artifacts redact identities and contain no credentials.

## Rotation procedure (manual change window)

1. Inventory last-use indicators for legacy `anon` and `service_role` keys,
   Edge Functions, CI secrets, web deployment variables, local operator files,
   database webhooks, and external workers. Do not paste values into tickets or
   logs.
2. Confirm every public client uses the existing `sb_publishable_` key. The
   desktop already embeds a publishable key. Confirm the web deployment uses a
   publishable key rather than a legacy anon JWT.
3. Provision a separately named `sb_secret_` key for each administrative
   backend/qualification runner. Store it only in the relevant secret manager.
   Replace any legacy service-role usage and validate Auth-admin plus cleanup.
4. Migrate Auth from the legacy shared JWT secret to an asymmetric signing key.
   Rotate the standby key into use, verify JWKS discovery and fresh login/token
   refresh, then wait at least the configured access-token lifetime plus a
   safety margin before revoking the previous key.
5. During the overlap, validate web sign-in, desktop sign-in/refresh, all sync
   RPC authorization, RLS tenant isolation, device revocation, and the Phase 1D
   qualification harness. Components that verify JWTs locally must use JWKS or
   `getClaims()` and must not retain the legacy shared secret.
6. Disable legacy `anon` and `service_role` API keys only after last-use metrics
   show no consumers. Revoke the legacy signing key after the overlap. Existing
   tokens signed by a revoked key stop working; users holding them may need to
   sign in again. Publishable/secret API keys are independent of user sessions.
7. Run security advisors and the complete hosted qualification again. Keep a
   redacted rotation record containing timestamps and key names only.

Rollback before revocation is to move the previous signing key back to standby
and rotate it into use. After permanent deletion there is no cryptographic
rollback, so deletion is outside the initial change window.

## Leaked-password protection

The hosted advisor reported leaked-password protection disabled. Supabase
supports HaveIBeenPwned password rejection from Auth settings on Pro plans and
above. It can be enabled without a schema migration if this project is on an
eligible plan. Before production activation, confirm the plan, enable the Auth
setting manually, test rejection with a disposable identity, and verify normal
sign-up, sign-in, password reset, and desktop token refresh. No Auth setting was
changed during Phase 1D.
