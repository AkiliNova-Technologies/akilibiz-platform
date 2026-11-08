"use server";

import { createClient } from "@/lib/supabase/server";
import { requireActiveBusiness } from "@/lib/business-context";

export type PairingState = {
  error: string | null;
  code: string | null;
  expiresAt: string | null;
};

export async function createPairingCode(
  _previous: PairingState,
  _formData: FormData,
): Promise<PairingState> {
  const business = await requireActiveBusiness();
  if (business.role !== "owner") {
    return { error: "Only the business owner can link a desktop device.", code: null, expiresAt: null };
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "Sign in again to link your desktop.", code: null, expiresAt: null };
  }
  const { data, error } = await supabase.rpc("create_desktop_pairing", {
    target_business_id: business.id,
  });
  const first = Array.isArray(data) ? data[0] : null;
  if (error || !first?.pairing_code || !first?.expires_at) {
    return { error: "Unable to generate a pairing code. Confirm the cloud migration is applied.", code: null, expiresAt: null };
  }
  return { error: null, code: first.pairing_code, expiresAt: first.expires_at };
}
