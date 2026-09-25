import { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_ACCOUNTS = ["الكاش", "البنك", "فودافون كاش"];

const DEFAULT_CATEGORIES = [
  { name: "طعام ومشروبات", type: "expense", icon: "Utensils" },
  { name: "مواصلات وبنزين", type: "expense", icon: "Car" },
  { name: "فواتير والتزامات", type: "expense", icon: "Receipt" },
  { name: "تسوق ومشتريات", type: "expense", icon: "ShoppingBag" },
  { name: "صحة وعلاج", type: "expense", icon: "HeartPulse" },
  { name: "أخرى", type: "expense", icon: "MoreHorizontal" },
  { name: "مرتب", type: "income", icon: "Briefcase" },
  { name: "دخل إضافي", type: "income", icon: "Coins" },
] as const;

/** Initializes the default accounts and categories for a newly created tenant. */
export async function provisionNewTenant(
  client: SupabaseClient,
  userId: number
): Promise<void> {
  const accountRows = DEFAULT_ACCOUNTS.map((name) => ({
    user_id: userId,
    name,
    opening_balance: 0,
  }));
  if (accountRows.length) {
    await client.from("accounts").insert(accountRows);
  }

  const categoryRows = DEFAULT_CATEGORIES.map((cat) => ({
    user_id: userId,
    name: cat.name,
    type: cat.type,
    icon: cat.icon,
  }));
  if (categoryRows.length) {
    await client.from("categories").insert(categoryRows);
  }
}

type LeadSource = "waitlist" | "signup" | "google";

interface MarketingLeadInput {
  email: string;
  source: LeadSource;
  name?: string | null;
  goal?: string | null;
  userId?: number | null;
  converted?: boolean;
}

/**
 * Records or updates a marketing lead without clobbering the first-touch source.
 * New rows keep the given source; existing rows only fill gaps and optionally
 * flip to "converted" (never downgrade, never rewrite source).
 */
export async function upsertMarketingLead(
  client: SupabaseClient,
  input: MarketingLeadInput
): Promise<void> {
  const email = input.email.trim().toLowerCase();

  const { data: existing } = await client
    .from("marketing_leads")
    .select("id, name, goal, status")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    const patch: Record<string, unknown> = {};
    if (!existing.name && input.name) patch.name = input.name;
    if (!existing.goal && input.goal) patch.goal = input.goal;
    if (input.userId) patch.user_id = input.userId;
    if (input.converted && existing.status !== "converted" && existing.status !== "opted_out") {
      patch.status = "converted";
      patch.converted_at = new Date().toISOString();
    }
    if (Object.keys(patch).length) {
      await client.from("marketing_leads").update(patch).eq("id", existing.id);
    }
    return;
  }

  const payload: Record<string, unknown> = {
    email,
    source: input.source,
    status: input.converted ? "converted" : "subscribed",
  };
  if (input.converted) payload.converted_at = new Date().toISOString();
  if (input.name) payload.name = input.name;
  if (input.goal) payload.goal = input.goal;
  if (input.userId) payload.user_id = input.userId;

  await client.from("marketing_leads").insert(payload);
}