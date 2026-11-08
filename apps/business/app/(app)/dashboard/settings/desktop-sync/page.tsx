import { requireActiveBusiness } from "@/lib/business-context";
import { PairingForm } from "./pairing-form";

export default async function DesktopSyncPage() {
  const business = await requireActiveBusiness();
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Desktop synchronization</h1>
        <p className="text-muted-foreground">
          Link an existing AkiliBiz desktop business to {business.name}. Pairing does not upload records.
        </p>
      </div>
      {business.role === "owner" ? (
        <PairingForm />
      ) : (
        <p className="text-muted-foreground">Only the business owner can link a desktop device.</p>
      )}
      <p className="text-sm text-muted-foreground">
        Desktop businesses can now register directly from Backup & Restore and upload a manual category and product snapshot. Stock and transactions are not synchronized yet.
      </p>
    </main>
  );
}
