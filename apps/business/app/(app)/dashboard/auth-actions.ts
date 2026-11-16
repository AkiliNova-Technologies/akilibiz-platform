"use server";

import { cookies } from "next/headers";
import { ACTIVE_BUSINESS_COOKIE } from "@/lib/business-context";
import { createClient } from "@/lib/supabase/server";

export type SignOutResult = { ok: true } | { ok: false; error: string };

export async function signOut(): Promise<SignOutResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  // Tenant selection must never survive an account transition, even when the
  // upstream session is already invalid and signOut reports an error.
  (await cookies()).delete(ACTIVE_BUSINESS_COOKIE);
  if (error) {
    return { ok: false, error: "We could not sign you out. Please try again." };
  }
  return { ok: true };
}
