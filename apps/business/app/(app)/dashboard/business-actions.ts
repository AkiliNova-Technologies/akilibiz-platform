"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  businessProfileFromFormData,
  firstValidationMessage,
} from "@/lib/business-profile";
import { createClient } from "@/lib/supabase/server";

export type BusinessFormState = {
  error: string | null;
};

export const initialBusinessFormState: BusinessFormState = { error: null };

async function authenticatedClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims.sub) {
    redirect("/sign-in?next=/dashboard");
  }

  return supabase;
}

async function findOwnedBusinessId() {
  const supabase = await authenticatedClient();
  const { data, error } = await supabase
    .from("business_memberships")
    .select("business_id")
    .eq("active", true)
    .eq("role", "owner")
    .limit(2);

  if (error || !data || data.length !== 1) {
    return {
      error: "Business profile settings are unavailable for this account.",
    };
  }

  return { businessId: data[0].business_id, supabase };
}

export async function onboardBusiness(
  _previousState: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const parsed = businessProfileFromFormData(formData);

  if (!parsed.success) {
    return { error: firstValidationMessage(parsed.error) };
  }

  const supabase = await authenticatedClient();
  const { error } = await supabase.rpc("onboard_business", {
    business_name: parsed.data.name,
    business_trading_name: parsed.data.tradingName,
    business_contact_email: parsed.data.contactEmail,
    business_contact_phone: parsed.data.contactPhone,
    business_locale: parsed.data.locale,
    business_time_zone: parsed.data.timeZone,
    business_currency_code: parsed.data.currencyCode,
  });

  if (error) {
    return {
      error:
        "We could not create your business. Check the details and try again.",
    };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard/settings");
}

export async function updateBusinessProfile(
  _previousState: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const parsed = businessProfileFromFormData(formData);

  if (!parsed.success) {
    return { error: firstValidationMessage(parsed.error) };
  }

  const result = await findOwnedBusinessId();

  if ("error" in result) {
    return {
      error:
        result.error ??
        "Business profile settings are unavailable for this account.",
    };
  }

  const { error } = await result.supabase
    .from("businesses")
    .update({
      name: parsed.data.name,
      trading_name: parsed.data.tradingName,
      contact_email: parsed.data.contactEmail,
      contact_phone: parsed.data.contactPhone,
      locale: parsed.data.locale,
      time_zone: parsed.data.timeZone,
      currency_code: parsed.data.currencyCode,
    })
    .eq("id", result.businessId);

  if (error) {
    return {
      error: "We could not save your business profile. Please try again.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/settings");
  return { error: null };
}
