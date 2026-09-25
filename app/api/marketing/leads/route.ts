import { NextRequest, NextResponse } from "next/server";
import { requireSupabase } from "@/lib/supabase";
import { isRateLimited } from "@/lib/rate-limit";
import { upsertMarketingLead } from "@/lib/onboarding";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(`leads:${ip}`, 5, 60 * 1000)) {
      return NextResponse.json({ error: "طلبات كثيرة جداً. حاول بعد قليل." }, { status: 429 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    // Honeypot: bots fill hidden fields — pretend success so they stop probing.
    if (body.website || body.company) {
      return NextResponse.json({ success: true });
    }

    const email = String(body.email || "").trim().toLowerCase();
    const name = String(body.name || "").trim().slice(0, 120);
    const goal = String(body.goal || "").trim().slice(0, 300);

    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: "يرجى إدخال بريد إلكتروني صحيح" }, { status: 400 });
    }

    await upsertMarketingLead(requireSupabase(), {
      email,
      name: name || null,
      goal: goal || null,
      source: "waitlist",
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "تعذر حفظ البيانات. حاول لاحقاً.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}