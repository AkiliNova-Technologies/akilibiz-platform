"use server";

import { revalidatePath } from "next/cache";
import { requireActiveBusiness } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";

export type StaffActionState = { error: string | null; message: string | null };

async function ownerContext() {
  const business = await requireActiveBusiness();
  if (business.role !== "owner") return null;
  return { business, supabase: await createClient() };
}

export async function grantStaffAccess(
  _previous: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const context = await ownerContext();
  if (!context) return { error: "Only business owners can manage staff access.", message: null };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "");
  const permitted = ["manager", "cashier", "inventory_staff", "accountant"];
  if (!email.includes("@") || email.length > 320 || !permitted.includes(role)) {
    return { error: "Enter a valid email and choose a staff role.", message: null };
  }
  const { error } = await context.supabase.rpc("grant_business_staff", {
    target_business_id: context.business.id,
    target_email: email,
    target_role: role,
  });
  if (error) return {
    error: error.message.includes("No existing AkiliBiz user")
      ? "The person must create an AkiliBiz account before you can grant access."
      : "Could not grant access. Check the account and try again.",
    message: null,
  };
  revalidatePath("/dashboard/staff");
  return { error: null, message: "Business access saved." };
}

export async function deactivateStaffAccess(formData: FormData): Promise<void> {
  const context = await ownerContext();
  if (!context) throw new Error("Only business owners can manage staff access.");
  const userId = formData.get("user_id");
  if (typeof userId !== "string" || !/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(userId)) {
    throw new Error("Invalid staff member.");
  }
  const { error } = await context.supabase.rpc("deactivate_business_staff", {
    target_business_id: context.business.id,
    target_user_id: userId,
  });
  if (error) throw new Error("Could not remove business access.");
  revalidatePath("/dashboard/staff");
}
