import { cookies } from "next/headers";
import { requireSupabase } from "./supabase";
import { verifyValue } from "./cookie-sign";
import { UserRecord } from "./types";

export const DEFAULT_USER_ID = 1;

/**
 * Gets the current active user ID from cookies (with impersonation support).
 * Cookie values are HMAC-signed, so a forged value is rejected.
 * If none set, returns null (unauthenticated).
 */
export async function getActiveUserId(): Promise<number | null> {
  try {
    const cookieStore = await cookies();
    const impersonateId = verifyValue(cookieStore.get("finance_impersonate_user_id")?.value);
    if (impersonateId && !isNaN(Number(impersonateId))) {
      return Number(impersonateId);
    }
    const userId = verifyValue(cookieStore.get("finance_user_id")?.value);
    if (userId && !isNaN(Number(userId))) {
      return Number(userId);
    }
  } catch {
    // If running outside request context
  }
  return null;
}

/**
 * Fetch a user by ID from Supabase
 */
export async function getUserById(id: number): Promise<UserRecord | null> {
  const client = requireSupabase();
  const { data, error } = await client.from("users").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as UserRecord) || null;
}

/**
 * Fetch a user by Email
 */
export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const cleanEmail = email.trim().toLowerCase();
  const client = requireSupabase();
  const { data, error } = await client.from("users").select("*").eq("email", cleanEmail).maybeSingle();
  if (error) throw error;
  return (data as UserRecord) || null;
}

/**
 * Returns true when the currently authenticated user is a system admin.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const userId = await getActiveUserId();
  if (!userId) return false;
  const user = await getUserById(userId);
  return Boolean(user?.is_admin);
}

/**
 * Throws unless the current session belongs to a redirect-to-login-able user. Kept in auth layer
 * so API routes can share one guard.
 */
export async function requireUser(): Promise<number> {
  const userId = await getActiveUserId();
  if (!userId) {
    throw new Response("غير مصرح - يرجى تسجيل الدخول أولاً", {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return userId;
}