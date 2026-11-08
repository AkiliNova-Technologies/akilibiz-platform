# Desktop pairing configuration (S1)

The desktop uses the existing local staff login for offline work. Cloud sign-in is separate, temporary, and kept in application memory only. No cloud passwords or access tokens are written to SQLite.

## Required environment

Set the following in the environment **before starting** the desktop application:

- `AKILIBIZ_SUPABASE_URL`: `https://vntqfaheiwotinpuefzl.supabase.co`
- `AKILIBIZ_SUPABASE_PUBLISHABLE_KEY`: the project's **publishable** API key from Supabase Settings → API Keys. Never use a secret or service-role key.

## Pairing steps

1. Sign in to AkiliBiz Web and create or select the hosted business you own.
2. Visit `/dashboard/settings/desktop-sync` and generate a one-time code (valid 10 minutes).
3. In desktop, invoke `sign_in_cloud_for_pairing` with the **same Supabase email/password**. The command holds the access token in memory; it does not affect the local staff login.
4. Invoke `claim_cloud_business_pairing` with the code. Desktop registers a stable device UUID and stores the server-confirmed business link.
5. Verify `get_desktop_sync_preview` reports an active link, then invoke `sign_out_cloud_pairing` to clear the memory-only token.

**Important:** Desktop UI controls for these commands are not yet wired. Cloud sign-in currently supports password-based accounts only; social SSO, MFA, and browser PKCE are not yet supported. Do not ask users to expose access tokens or publishable keys in screenshots or support logs.

No catalogue, stock, sales, or financial records are uploaded in S1. Device registration is not an upload authorization mechanism by itself; all future uploads must validate the authenticated account, owner membership, device registration and revocation status on each request.

If the cloud registration succeeds but the local database update fails, the desktop retains its pending device UUID and the claim RPC allows an identical, authenticated retry. Never reset the desktop SQLite database to repair pairing.
