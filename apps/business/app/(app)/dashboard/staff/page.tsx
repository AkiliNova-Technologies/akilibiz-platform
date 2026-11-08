import { ShieldCheck, UserRoundCheck, Users } from "lucide-react";
import MetricCard from "@/components/akilibiz/metric-card";
import { StatusBanner } from "@/components/akilibiz/status-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { deactivateStaffAccess } from "./staff-actions";
import { GrantAccessForm } from "./grant-access-form";

type Member = {
  user_id: string;
  email: string;
  role: "owner" | "manager" | "cashier" | "inventory_staff" | "accountant";
  active: boolean;
};

export default async function StaffPage() {
  const business = await requireActiveBusiness();
  const owner = business.role === "owner";
  const supabase = await createClient();
  let members: Member[] = [];
  let errorMessage: string | null = null;

  if (owner) {
    const response = await supabase.rpc("list_business_staff", {
      target_business_id: business.id,
    });
    if (response.error) errorMessage = "Staff access is not available. Apply the staff-access migration and try again.";
    else members = (response.data ?? []) as Member[];
  }

  const active = members.filter((member) => member.active);
  return (
    <main className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staff Directory</h1>
        <p className="text-sm text-muted-foreground">
          Manage who can access {business.tradingName || business.name}.
        </p>
      </div>
      {!owner ? (
        <StatusBanner title="Staff access is managed by the business owner" tone="info">
          Your current role is {business.role.replaceAll("_", " ")}. Ask the owner to change your access.
        </StatusBanner>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard title="Team Members" value={String(members.length)}
              description="Including the owner" icon={<Users className="size-5" />} />
            <MetricCard title="Active Accounts" value={String(active.length)}
              description="Currently allowed to access this business"
              icon={<UserRoundCheck className="size-5" />} />
            <MetricCard title="Business Owner" value="Protected"
              description="Owner membership cannot be removed here"
              icon={<ShieldCheck className="size-5" />} />
          </section>
          {errorMessage && <StatusBanner title="Staff access unavailable" tone="error">{errorMessage}</StatusBanner>}
          <Card>
            <CardHeader><CardTitle className="text-base">Grant business access</CardTitle></CardHeader>
            <CardContent><GrantAccessForm /></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Business members</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {members.length === 0 && <p className="text-sm text-muted-foreground">
                No staff accounts are available yet.
              </p>}
              {members.map((member) => (
                <div key={member.user_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                  <div className="min-w-0 space-y-1">
                    <p className="break-all font-medium">{member.email}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {member.role.replaceAll("_", " ")}
                      </Badge>
                      <Badge variant={member.active ? "secondary" : "outline"}>
                        {member.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                  {member.role !== "owner" && member.active ? (
                    <form action={deactivateStaffAccess}>
                      <input type="hidden" name="user_id" value={member.user_id} />
                      <Button type="submit" variant="outline" size="sm">
                        Remove access
                      </Button>
                    </form>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
