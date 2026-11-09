import { ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import { cookies } from "next/headers";
import { AuthShell } from "../auth-shell";
import { OnboardingForm } from "@/app/(app)/dashboard/onboarding-form";
import { selectBusiness } from "@/app/(app)/dashboard/business-actions";
import { ACTIVE_BUSINESS_COOKIE, listAccessibleBusinesses } from "@/lib/business-context";
import { Button } from "@/components/ui/button";

export default async function BusinessesPage() {
  const businesses = await listAccessibleBusinesses();
  const selected = (await cookies()).get(ACTIVE_BUSINESS_COOKIE)?.value;

  return (
    <AuthShell>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">AkiliBiz Business</p>
        <h1 className="pt-2 font-[family-name:var(--font-sora)] text-3xl font-semibold tracking-tight sm:text-4xl">
          {businesses.length ? "Choose your business" : "Set up your business"}
        </h1>
        <p className="pt-1 text-sm leading-6 text-muted-foreground">
          {businesses.length
            ? "Select the business you want to manage."
            : "Create your first business to continue."}
        </p>
      </div>
      {businesses.length > 0 ? (
        <div className="mt-7 space-y-2" aria-label="Your businesses">
          {businesses.map((business) => (
            <form
              action={selectBusiness}
              key={business.id}
              className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-full border bg-card px-3 py-3 transition-colors hover:bg-muted/30 sm:px-4"
            >
              <input type="hidden" name="business_id" value={business.id} />
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Building2 aria-hidden="true" className="size-4 text-muted-foreground" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" title={business.tradingName || business.name}>
                    {business.tradingName || business.name}
                  </p>
                  {business.tradingName ? (
                    <p className="truncate text-xs text-muted-foreground" title={business.name}>{business.name}</p>
                  ) : null}
                  <p className="text-xs capitalize text-muted-foreground">{business.role.replaceAll("_", " ")}</p>
                </div>
              </div>
              <Button type="submit" size="sm" variant={selected === business.id ? "secondary" : "default"} className="shrink-0">
                {selected === business.id ? (
                  <><CheckCircle2 className="size-4" /> Continue</>
                ) : (
                  <>Open <ArrowRight className="size-4" /></>
                )}
              </Button>
            </form>
          ))}
        </div>
      ) : (
        <div className="mt-7">
          <OnboardingForm />
        </div>
      )}
    </AuthShell>
  );
}
