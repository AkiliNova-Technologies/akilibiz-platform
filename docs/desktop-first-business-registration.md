# Desktop-first business registration

A business established on AkiliBiz Desktop can become a cloud business without
recreating its profile on AkiliBiz Web.

- Sign in to the cloud from desktop using an authenticated owner account.
- Choose **Register existing desktop business** in Backup & Recovery.
- Desktop submits its existing stable 32-hex business public ID, selected profile
  fields, and durable device identity.
- `register_desktop_business` creates the hosted business, owner membership,
  desktop origin mapping and device registration in one PostgreSQL transaction.
- Retrying with the same account, origin and device returns the existing hosted
  identity; mismatched accounts and devices are rejected, not merged.
- The desktop SQLite business profile remains authoritative and unchanged.
- The hosted business appears in the signed-in owner's business list on Web
  through existing owner membership RLS.
- **No categories, products, inventory, sales or accounting data are uploaded
  by registration.** Initial catalogue transfer is a separate milestone.
- Existing web-origin businesses continue to use the explicit pairing-code path.

Safety: the desktop-origin public ID identifies a *local database*, not legal proof
of business ownership. Do not use it alone as an authentication credential. Cloud
authentication, owner membership, stable device IDs, uniqueness and auditing
guard this operation. Never automatically merge two existing business profiles.
