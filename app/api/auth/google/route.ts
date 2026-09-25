import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getUserByEmail } from "@/lib/auth";
import { requireSupabase } from "@/lib/supabase";
import { signValue } from "@/lib/cookie-sign";
import { hashPassword } from "@/lib/password";
import { isRateLimited } from "@/lib/rate-limit";
import { provisionNewTenant, upsertMarketingLead } from "@/lib/onboarding";

const PLAN_DAYS: Record<string, number> = {
  annual: 365,
  "semi-annual": 180,
  monthly: 30,
  free: 30,
};

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(`google:${ip}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json({ error: "طلبات كثيرة جداً. حاول بعد قليل." }, { status: 429 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const accessToken = String(body.accessToken || "");
    const clientEmail = String(body.email || "").trim().toLowerCase();
    const clientName = String(body.name || "").trim().slice(0, 120);
    const plan = String(body.plan || "monthly");

    if (!accessToken || !clientEmail.includes("@")) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    // Always verify the token with GoTrue server-side first — never trust the
    // client-supplied email on its own.
    const client = requireSupabase();
    const { data: tokenResult, error: tokenError } = await client.auth.getUser(accessToken);
    if (tokenError || !tokenResult?.user?.email) {
      return NextResponse.json({ error: "تعذر التحقق من هوية حساب جوجل" }, { status: 401 });
    }

    const verifiedEmail = tokenResult.user.email.toLowerCase();
    if (verifiedEmail !== clientEmail) {
      return NextResponse.json({ error: "بيانات غير متطابقة" }, { status: 401 });
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + (PLAN_DAYS[plan] ?? 30) * 24 * 60 * 60 * 1000
    ).toISOString();

    const meta = tokenResult.user.user_metadata || {};
    const googleName =
      clientName ||
      String(meta.full_name || meta.name || "") ||
      verifiedEmail.split("@")[0];

    let user = await getUserByEmail(verifiedEmail);

    if (!user) {
      const { data: newUser, error: insertErr } = await client
        .from("users")
        .insert({
          name: googleName,
          email: verifiedEmail,
          // Google-linked accounts have no real password: store a hash of a
          // random unguessable secret so password login always fails for them.
          password: hashPassword(randomBytes(32).toString("hex")),
          phone: null,
          plan,
          status: "active",
          expires_at: expiresAt,
          is_admin: false,
        })
        .select()
        .single();

      if (!insertErr) {
        const newUserId = Number((newUser as { id: number }).id);
        await provisionNewTenant(client, newUserId).catch(() => {});
        await upsertMarketingLead(client, {
          email: verifiedEmail,
          name: googleName,
          source: "google",
          userId: newUserId,
          converted: true,
        }).catch(() => {});
        user = await getUserByEmail(verifiedEmail);
      } else if (String(insertErr.code) === "23505") {
        // Concurrent creation race — re-fetch the winner.
        user = await getUserByEmail(verifiedEmail);
        if (!user) throw insertErr;
      } else {
        throw insertErr;
      }
    } else {
      // Existing account links by email.
      await upsertMarketingLead(client, {
        email: verifiedEmail,
        name: googleName,
        source: "google",
        userId: user.id,
        converted: true,
      }).catch(() => {});
    }

    if (!user) {
      return NextResponse.json({ error: "تعذر إنشاء الحساب. حاول مرة أخرى." }, { status: 500 });
    }

    if (user.is_blocked) {
      return NextResponse.json(
        { error: "تم حظر هذا الحساب من دخول النظام. يرجى التواصل مع الإدارة." },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set("finance_user_id", signValue(String(user.id)), {
      path: "/",
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 30,
    });
    cookieStore.delete("finance_impersonate_user_id");

    const safe: Record<string, unknown> = { ...user };
    delete safe.password;
    return NextResponse.json({ success: true, user: safe });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "تعذر إتمام تسجيل الدخول باستخدام جوجل";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}