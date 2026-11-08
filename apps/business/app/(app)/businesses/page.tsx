import { Building2, CheckCircle2, ArrowRight } from "lucide-react";
import { cookies } from "next/headers";
import { OnboardingForm } from "@/app/(app)/dashboard/onboarding-form";
import { selectBusiness } from "@/app/(app)/dashboard/business-actions";
import { ACTIVE_BUSINESS_COOKIE, listAccessibleBusinesses } from "@/lib/business-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BusinessesPage() {
  const businesses = await listAccessibleBusinesses();
  const selected = (await cookies()).get(ACTIVE_BUSINESS_COOKIE)?.value;

  return (
    <main className="w-full max-w-5xl space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Choose your business</h1>
        <p className="text-sm text-muted-foreground">
          Select a business to continue to your workspace.
        </p>
      </div>
      {businesses.length > 0 ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Your businesses</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {businesses.map((business) => (
              <form action={selectBusiness} key={business.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/30">
                <input type="hidden" name="business_id" value={business.id} />
                <div className="flex items-start gap-3">
                  <Building2 aria-hidden className="mt-0.5 size-5 text-primary" />
                  <div>
                    <p className="font-medium">{business.tradingName || business.name}</p>
                    {business.tradingName ? <p className="text-sm text-muted-foreground">{business.name}</p> : null}
                    <p className="text-xs capitalize text-muted-foreground">{business.role.replaceAll("_", " ")}</p>
                  </div>
                </div>
                <Button type="submit" variant={selected === business.id ? "secondary" : "default"}>
                  {selected === business.id ? <><CheckCircle2 className="mr-2 size-4" /> Continue</> : <><span>Open business</span><ArrowRight className="size-4" /></>}
                </Button>
              </form>
            ))}
          </CardContent>
        </Card>
      ) : <p className="text-sm text-muted-foreground">No business is linked to your account yet. Create one below to get started.</p>}
      {businesses.length === 0 ? <OnboardingForm /> : null}
    </main>
  );
}
