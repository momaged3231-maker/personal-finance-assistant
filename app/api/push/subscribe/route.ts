import { NextRequest, NextResponse } from "next/server";
import { getActiveUserId } from "@/lib/auth";
import { savePushSubscription, removePushSubscription, isPushConfigured } from "@/lib/push";

export async function GET() {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ configured: isPushConfigured(), enabled: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: "غير مصرح - يرجى تسجيل الدخول أولاً", unauthenticated: true }, { status: 401 });
    }

    const body = await req.json();
    const sub = body?.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined;

    if (!sub || !sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return NextResponse.json({ error: "اشتراك push غير صالح" }, { status: 400 });
    }
    if (!sub.endpoint.startsWith("https://")) {
      return NextResponse.json({ error: "نقطة الإرسال يجب أن تكون HTTPS" }, { status: 400 });
    }

    await savePushSubscription(userId, { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    await removePushSubscription(userId);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}