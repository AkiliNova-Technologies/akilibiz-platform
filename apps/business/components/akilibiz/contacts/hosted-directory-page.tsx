import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import {
  CONTACTS_PAGE_SIZE,
  contactPageCount,
  contactSearchPattern,
  parseContactDirectoryQuery,
} from "@/lib/contact-directory-query";
import { HostedDirectory, type HostedCustomer, type HostedSupplier } from "@/components/akilibiz/contacts/hosted-directory";

export async function HostedDirectoryPage({
  view,
  searchParams,
}: {
  view: "customers" | "suppliers";
  searchParams?: { page?: string | string[]; q?: string | string[] };
}) {
  const business = await requireActiveBusiness();
  const supabase = await createClient();
  const { page: requestedPage, search } = parseContactDirectoryQuery(searchParams ?? {});
  const table = view === "customers" ? "desktop_customers" : "desktop_suppliers";
  const fields = view === "customers"
    ? "id,name,email,phone,address,customer_type,loyalty_points,is_active,updated_at"
    : "id,name,contact_person,phone,email,address,payment_terms,is_active,updated_at";
  let error: string | null = null;
  let records: Record<string, unknown>[] = [];
  let total = 0;
  let page = requestedPage;

  // Supabase's authenticated client enforces RLS. The membership check above
  // and explicit business filter both apply on every page/search request.
  let countQuery = supabase.from(table).select("id", { count: "exact", head: true })
    .eq("business_id", business.id);
  if (search) countQuery = countQuery.ilike("name", contactSearchPattern(search));
  const countResult = await countQuery;

  if (countResult.error || countResult.count == null) {
    error = "Could not load this business's contact directory. Try again.";
  } else {
    total = countResult.count;
    page = Math.min(requestedPage, contactPageCount(total));
    let dataQuery = supabase.from(table).select(fields)
      .eq("business_id", business.id);
    if (search) dataQuery = dataQuery.ilike("name", contactSearchPattern(search));
    const offset = (page - 1) * CONTACTS_PAGE_SIZE;
    const result = await dataQuery.order("id", { ascending: true })
      .range(offset, offset + CONTACTS_PAGE_SIZE - 1);
    if (result.error) {
      error = "Could not load this business's contact directory. Try again.";
      total = 0;
      records = [];
    } else {
      records = (result.data ?? []) as Record<string, unknown>[];
    }
  }

  return <HostedDirectory
    businessName={business.name}
    view={view}
    canEditContacts={business.role === "owner" && process.env.AKILIBIZ_ENABLE_BIDIRECTIONAL_CONTACTS === "1"}
    error={error}
    pagination={{ page, total, search }}
    customers={view === "customers" ? records as unknown as HostedCustomer[] : []}
    suppliers={view === "suppliers" ? records as unknown as HostedSupplier[] : []}
  />;
}
