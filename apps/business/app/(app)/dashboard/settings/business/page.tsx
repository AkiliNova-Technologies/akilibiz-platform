import { StatusBanner } from "@/components/akilibiz/status-banner";
import { createClient } from "@/lib/supabase/server";
import { requireActiveBusiness } from "@/lib/business-context";
import { BusinessSettingsForm } from "./business-settings-form";

export default async function BusinessSettingsPage() {
  const active = await requireActiveBusiness();
  const supabase = await createClient();
  const { data: business, error } = await supabase
    .from("businesses")
    .select("name, trading_name, contact_email, contact_phone, locale, time_zone, currency_code")
    .eq("id", active.id)
    .single();

  const loadError = error || !business;
  const initial = business ? {
    name: business.name,
    tradingName: business.trading_name,
    contactEmail: business.contact_email,
    contactPhone: business.contact_phone,
    locale: business.locale,
    timeZone: business.time_zone,
    currencyCode: business.currency_code,
  } : {
    name: active.name,
    tradingName: active.tradingName,
    contactEmail: null,
    contactPhone: null,
    locale: "en-UG",
    timeZone: "Africa/Kampala",
    currencyCode: "UGX",
  };

  return (
    <main className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-8xl space-y-6">
        <div className="space-y-1 pt-1">
          <h1 className="text-2xl font-semibold tracking-tight">Business Profile</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Manage the verified profile for {active.name}. Changes are saved to this business only.
          </p>
        </div>
        {loadError && (
          <StatusBanner tone="error" title="Business profile unavailable">
            Your business details could not be loaded. Check your connection and try again.
          </StatusBanner>
        )}
        <BusinessSettingsForm
          initial={initial}
          canEdit={!loadError && active.role === "owner"}
        />
      </div>
    </main>
  );
}
