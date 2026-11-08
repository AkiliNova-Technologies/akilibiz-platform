import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const ACTIVE_BUSINESS_COOKIE = "akilibiz_active_business";

export type BusinessMembership = {
  business_id: string;
  role: "owner" | "manager" | "cashier" | "inventory_staff" | "accountant";
  active: boolean;
};
export type BusinessAccess = {
  id: string;
  name: string;
  tradingName: string | null;
  role: BusinessMembership["role"];
};

export async function listAccessibleBusinesses(): Promise<BusinessAccess[]> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/sign-in?next=/businesses");

  const { data: memberships, error } = await supabase
    .from("business_memberships")
    .select("business_id, role, active")
    .eq("user_id", user.id)
    .eq("active", true);
  if (error) throw new Error("Unable to verify business access.");

  if (!memberships?.length) return [];
  const ids = memberships.map((membership) => membership.business_id);
  const { data: businesses, error: businessError } = await supabase
    .from("businesses")
    .select("id, name, trading_name")
    .in("id", ids);
  if (businessError) throw new Error("Unable to load businesses.");

  const byId = new Map((businesses ?? []).map((business) => [business.id, business]));
  return (memberships as BusinessMembership[]).flatMap((membership) => {
    const business = byId.get(membership.business_id);
    return business
      ? [{ id: business.id, name: business.name, tradingName: business.trading_name,
           role: membership.role }]
      : [];
  });
}

/** Cookie stores a selection, not authorization. Every request checks membership through RLS. */
export async function getActiveBusiness(): Promise<BusinessAccess | null> {
  const selectedId = (await cookies()).get(ACTIVE_BUSINESS_COOKIE)?.value;
  if (!selectedId) return null;
  const accessible = await listAccessibleBusinesses();
  return accessible.find((business) => business.id === selectedId) ?? null;
}

export async function requireActiveBusiness(): Promise<BusinessAccess> {
  const active = await getActiveBusiness();
  if (!active) redirect("/businesses");
  return active;
}
