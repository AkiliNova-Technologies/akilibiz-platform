import { createBrowserClient } from "@supabase/ssr";

/** Creates the browser client backed by the SSR cookie session. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
