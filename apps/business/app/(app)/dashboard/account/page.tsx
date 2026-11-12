import { redirect } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";
import { LinkedAccounts } from "@/components/akilibiz/auth/linked-accounts";
import { AccountActionsPanel } from "@/components/akilibiz/auth/account-actions-panel";

export default async function AccountProfilePage() {
  const business = await requireActiveBusiness();
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user || error) redirect("/sign-in");
  const { data: identityData } = await supabase.auth.getUserIdentities();
  const googleConnected = identityData?.identities?.some((identity) => identity.provider === "google") ?? false;
  const fullName = typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
    ? user.user_metadata.full_name.trim()
    : typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()
      ? user.user_metadata.display_name.trim() : "";
  const displayName = fullName || user.email || "Account";
  const initials = displayName.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const joined = user.created_at && !Number.isNaN(new Date(user.created_at).getTime())
    ? new Intl.DateTimeFormat("en-UG", { day: "numeric", month: "short", year: "numeric" }).format(new Date(user.created_at))
    : "—";

  return (
    <main className="flex min-w-0 flex-col gap-5">
      <div className="space-y-1 pt-1">
        <h1 className="text-xl font-semibold sm:text-2xl">My Account</h1>
        <p className="text-sm text-muted-foreground">Your profile and account security.</p>
      </div>
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="min-w-0 gap-0 py-0">
          <CardContent className="space-y-5 px-4 py-5 sm:px-5">
            <div className="flex flex-wrap items-center gap-4">
              <Avatar className="size-18 rounded-2xl">
                <AvatarFallback className="rounded-2xl bg-primary/10 text-xl font-semibold text-primary">{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-1">
                <h2 className="break-words text-xl font-semibold">{displayName}</h2>
                <p className="break-all text-sm text-muted-foreground">{user.email ?? "Email unavailable"}</p>
                <div className="flex flex-wrap gap-2"><Badge variant="outline" className="capitalize">{business.role.replaceAll("_", " ")}</Badge><Badge variant="outline">Signed in</Badge></div>
              </div>
            </div>
            <Separator />
            <section className="space-y-3">
              <h3 className="font-semibold">Personal information</h3>
              <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                <div className="space-y-1"><dt className="text-muted-foreground">Full name</dt><dd className="break-words font-medium">{displayName}</dd></div>
                <div className="space-y-1"><dt className="text-muted-foreground">Email address</dt><dd className="break-all font-medium">{user.email ?? "—"}</dd></div>
                <div className="space-y-1"><dt className="text-muted-foreground">Phone number</dt><dd className="font-medium">{user.phone || "Not provided"}</dd></div>
                <div className="space-y-1"><dt className="text-muted-foreground">Account created</dt><dd className="font-medium">{joined}</dd></div>
              </dl>
            </section>
          </CardContent>
        </Card>
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="gap-0 py-0">
            <CardContent className="space-y-4 px-4 py-5 sm:px-5">
              <h2 className="font-semibold">Business access</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-3"><dt className="shrink-0 text-muted-foreground">Business</dt><dd className="break-words text-right font-medium">{business.name}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Role</dt><dd className="font-medium capitalize">{business.role.replaceAll("_", " ")}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Status</dt><dd className="font-medium">Signed in</dd></div>
              </dl>
            </CardContent>
          </Card>
          <Card className="gap-0 py-0">
            <CardContent className="space-y-4 px-4 py-5 sm:px-5">
              <h2 className="font-semibold">Account security</h2>
              <AccountActionsPanel name={fullName} />
              <Separator />
              <LinkedAccounts googleConnected={googleConnected} />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
