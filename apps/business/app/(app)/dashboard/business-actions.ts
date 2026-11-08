"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { ACTIVE_BUSINESS_COOKIE, requireActiveBusiness, listAccessibleBusinesses } from "@/lib/business-context";
import { redirect } from "next/navigation";
import {
  businessProfileFromFormData,
  firstValidationMessage,
} from "@/lib/business-profile";
import { createClient } from "@/lib/supabase/server";

export type BusinessFormState = {
  error: string | null;
  saved?: boolean;
};



async function authenticatedClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims.sub) {
    redirect("/sign-in?next=/dashboard");
  }

  return supabase;
}

async function findOwnedBusinessId() {
  const business = await requireActiveBusiness();
  if (business.role !== "owner") {
    return { error: "Only the business owner can update this profile." };
  }
  const supabase = await authenticatedClient();
  return { businessId: business.id, supabase };
}

export async function selectBusiness(formData: FormData) {
  const businessId = formData.get("business_id");
  if (typeof businessId !== "string") redirect("/businesses");
  const businesses = await listAccessibleBusinesses();
  if (!businesses.some((business) => business.id === businessId)) {
    redirect("/businesses");
  }
  (await cookies()).set(ACTIVE_BUSINESS_COOKIE, businessId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
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
  const { data: business, error } = await supabase.rpc("onboard_business", {
    business_name: parsed.data.name,
    business_trading_name: parsed.data.tradingName,
    business_contact_email: parsed.data.contactEmail,
    business_contact_phone: parsed.data.contactPhone,
    business_locale: parsed.data.locale,
    business_time_zone: parsed.data.timeZone,
    business_currency_code: parsed.data.currencyCode,
  });

  if (error || !business?.id) {
    return {
      error:
        "We could not create your business. Check the details and try again.",
    };
  }

  (await cookies()).set(ACTIVE_BUSINESS_COOKIE, business.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard/settings/business");
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
  return { error: null, saved: true };
}
