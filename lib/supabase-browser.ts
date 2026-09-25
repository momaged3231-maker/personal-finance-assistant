import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Client-side credentials only — safe to expose via NEXT_PUBLIC_.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

let clientInstance: SupabaseClient | null = null;

/**
 * Returns a browser-side Supabase client used solely to start the Google OAuth
 * flow. We use the implicit grant (tokens returned in the URL fragment) so no
 * PKCE code verifier needs to survive the redirect round-trip — the callback
 * page hands the access token straight to our own API, which validates it.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        flowType: "implicit",
        detectSessionInUrl: true,
      },
    });
  }
  return clientInstance;
}