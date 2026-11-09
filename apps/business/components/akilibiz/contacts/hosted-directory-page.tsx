import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { HostedDirectory, type HostedCustomer, type HostedSupplier } from "@/components/akilibiz/contacts/hosted-directory";

export async function HostedDirectoryPage({ view }: { view: "customers" | "suppliers" }) {
  const business = await requireActiveBusiness();
  const supabase = await createClient();
  const table = view === "customers" ? "desktop_customers" : "desktop_suppliers";
  const fields = view === "customers"
    ? "id,name,email,phone,address,customer_type,loyalty_points,is_active"
    : "id,name,contact_person,phone,email,address,payment_terms,is_active";
  const records: Record<string, unknown>[] = [];
  let error: string | null = null;

  for (let offset = 0; offset < 5000; offset += 500) {
    const result = await supabase.from(table).select(fields)
      .eq("business_id", business.id).order("id").range(offset, offset + 499);
    if (result.error) {
      error = view === "customers"
        ? "Could not load your customers. Check your connection and try again."
        : "Could not load your suppliers. Check your connection and try again.";
      records.length = 0;
      break;
    }
    const batch = (result.data ?? []) as Record<string, unknown>[];
    records.push(...batch);
    if (batch.length < 500) break;
  }

  return <HostedDirectory
    businessName={business.name}
    view={view}
    error={error}
    customers={view === "customers" ? records as unknown as HostedCustomer[] : []}
    suppliers={view === "suppliers" ? records as unknown as HostedSupplier[] : []}
  />;
}
