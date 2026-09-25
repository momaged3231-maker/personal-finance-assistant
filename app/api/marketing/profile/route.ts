import { NextRequest, NextResponse } from "next/server";
import { getActiveUserId } from "@/lib/auth";
import { requireSupabase } from "@/lib/supabase";
import { isRateLimited } from "@/lib/rate-limit";

export async function GET() {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const client = requireSupabase();
    const { data, error } = await client
      .from("user_marketing_profiles")
      .select("primary_goal, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      exists: Boolean(data?.primary_goal),
      primaryGoal: data?.primary_goal ?? "",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "تعذر قراءة الملف التسويقي";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(`profile:${ip}`, 20, 60 * 1000)) {
      return NextResponse.json({ error: "طلبات كثيرة جداً. حاول بعد قليل." }, { status: 429 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const primaryGoal = String(body.primaryGoal || "").trim().slice(0, 300);
    if (!primaryGoal) {
      return NextResponse.json({ error: "يرجى إدخال هدفك المالي أولاً" }, { status: 400 });
    }

    const client = requireSupabase();
    const { error } = await client
      .from("user_marketing_profiles")
      .upsert(
        { user_id: userId, primary_goal: primaryGoal, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    if (error) throw error;

    return NextResponse.json({ success: true, primaryGoal });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "تعذر حفظ هدفك المالي";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}