import { NextRequest, NextResponse } from "next/server";
import { getActiveUserId, getUserById } from "@/lib/auth";
import { requireSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
    }

    // Google linkage is stored as a per-user settings row by the Google
    // sign-in route (key: google_linked).
    const client = requireSupabase();
    const { data: linkedRow } = await client
      .from("settings")
      .select("value")
      .eq("user_id", userId)
      .eq("key", "google_linked")
      .maybeSingle();

    const safe: Record<string, unknown> = { ...user };
    delete safe.password;

    return NextResponse.json({
      user: safe,
      googleLinked: linkedRow?.value === "1",
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "تعذر تحميل المعلومات الشخصية";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const name = String(body.name || "").trim().slice(0, 120);
    const phone = String(body.phone || "").trim().slice(0, 30);

    if (!name) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
    }

    const update: Record<string, string> = { name };
    if (phone) update.phone = phone;

    const client = requireSupabase();
    const { error } = await client.from("users").update(update).eq("id", userId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "تعذر حفظ المعلومات الشخصية";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}