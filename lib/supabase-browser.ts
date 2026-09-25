import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Client-side credentials only — safe to expose via NEXT_PUBLIC_.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "";

let clientInstance: SupabaseClient | null = null;

/**
 * Returns a browser-side Supabase client used solely for the Google OAuth flow.
 * We keep GoTrue's local session so the PKCE code verifier survives the redirect
 * back to /google/callback, then discard it after our own signed cookie is set.
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
        flowType: "pkce",
        detectSessionInUrl: true,
      },
    });
  }
  return clientInstance;
}