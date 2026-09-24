import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-only credentials. NEVER prefix these with NEXT_PUBLIC_.
const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";

const supabaseSecretKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseSecretKey && supabaseUrl.startsWith("http"));
};

let clientInstance: SupabaseClient | null = null;

/**
 * Returns a server-side Supabase client.
 * Uses the service-role key when available (bypasses RLS), otherwise falls back
 * to the anon key for local development. Never call this from client components.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return clientInstance;
}

export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

/** Throws when Supabase env vars are missing so we fail loudly instead of silently misbehaving. */
export function requireSupabase(): SupabaseClient {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      "قاعدة بيانات Supabase غير مُهيأة. أضف SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في ملف .env.local"
    );
  }
  return client;
}