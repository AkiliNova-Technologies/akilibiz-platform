import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { HostedDirectory, type HostedCustomer, type HostedSupplier } from "@/components/akilibiz/contacts/hosted-directory";

export async function HostedDirectoryPage({ view }: { view: "customers" | "suppliers" }) {
  const business = await requireActiveBusiness();
  const supabase = await createClient();
  const table = view === "customers" ? "desktop_customers" : "desktop_suppliers";
  const fields = view === "customers"
    ? "id,name,email,phone,address,customer_type,loyalty_points,is_active,updated_at"
    : "id,name,contact_person,phone,email,address,payment_terms,is_active,updated_at";
  const records: Record<string, unknown>[] = [];
  let error: string | null = null;

  const pageSize = 500;
  const maxRecords = 5000;
  for (let offset = 0; offset <= maxRecords; offset += pageSize) {
    const result = await supabase.from(table).select(fields)
      .eq("business_id", business.id).order("id").range(offset, offset + pageSize - 1);
    if (result.error) {
      error = view === "customers"
        ? "Could not load your customers. Check your connection and try again."
        : "Could not load your suppliers. Check your connection and try again.";
      records.length = 0;
      break;
    }
    const batch = (result.data ?? []) as Record<string, unknown>[];
    if (offset === maxRecords && batch.length) {
      // Do not present a silently truncated customer/supplier list as complete.
      error = "This business has more records than this directory can safely display. Use the desktop application until hosted pagination is available.";
      records.length = 0;
      break;
    }
    records.push(...batch);
    if (batch.length < pageSize) break;
  }

  return <HostedDirectory
    businessName={business.name}
    view={view}
    canEditContacts={business.role==="owner" && process.env.AKILIBIZ_ENABLE_BIDIRECTIONAL_CONTACTS==="1"}
    error={error}
    customers={view === "customers" ? records as unknown as HostedCustomer[] : []}
    suppliers={view === "suppliers" ? records as unknown as HostedSupplier[] : []}
  />;
}
