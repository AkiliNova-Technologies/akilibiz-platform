import { StatusBanner } from "@/components/akilibiz/status-banner";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { StaffDirectory, type StaffMember } from "./staff-directory";

export default async function StaffPage() {
  const business = await requireActiveBusiness();
  const owner = business.role === "owner";
  if (!owner) {
    return (
      <StatusBanner title="Staff access is managed by the business owner" tone="info">
        Your current role is {business.role.replaceAll("_", " ")}. Ask the owner to change your access.
      </StatusBanner>
    );
  }

  const supabase = await createClient();
  const response = await supabase.rpc("list_business_staff", {
    target_business_id: business.id,
  });
  const error = response.error
    ? "Could not load your staff accounts. Check your connection and try again."
    : null;

  return <StaffDirectory
    members={error ? [] : (response.data ?? []) as StaffMember[]}
    error={error}
  />;
}
