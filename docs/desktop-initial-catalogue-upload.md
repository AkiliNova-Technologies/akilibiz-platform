# Desktop-origin initial catalogue upload

The initial catalogue upload is an **explicit, owner-authorized snapshot**, not
automatic synchronization. It uploads categories and products in one database
transaction. Retry with the same source IDs updates the same hosted rows.
Local business records and inventory ledger are never changed.

- Hosted `desktop_categories` and `desktop_products` have business-scoped source
  identifiers so duplicate names/SKUs across independent tenants are safe.
- The RPC checks active owner membership and the registered, non-revoked
  desktop device; other accounts cannot upload across businesses.
- Prices use nullable exact `*_ugx` integer values only. No floating-point
  prices are translated or rounded.
- Stock quantities, movements, customers, sales, tax, accounting and images
  are **not** transferred by this contract.
- Categories and products are upserted in a single transaction; invalid
  records roll back the entire snapshot.
- No delete occurs when a local record is omitted. Deleted records require
  an independently reviewed tombstone lifecycle.
- Tables are available to active-membership web readers under RLS;
  the Next.js product pages still need to be wired to hosted live queries.
