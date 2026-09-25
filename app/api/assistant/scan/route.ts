import { NextRequest, NextResponse } from "next/server";
import { getActiveUserId } from "@/lib/auth";
import { analyzeReceiptImage, notificationToAction } from "@/lib/ai";
import { getAccounts } from "@/lib/finance";

export async function POST(req: NextRequest) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "غير مصرح - يرجى تسجيل الدخول أولاً", unauthenticated: true },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { imageDataUrl, text } = body;

    // 1. Bank / InstaPay / Vodafone Cash notification text → instant local parse
    if (text && typeof text === "string") {
      const accounts = await getAccounts(userId);
      const action = notificationToAction(text, accounts);
      if (!action) {
        return NextResponse.json(
          { error: "مش عارف أقرا الإشعار ده — تأكد إنك لصقت النص كامل" },
          { status: 422 }
        );
      }
      return NextResponse.json({ text: "وصلني الإشعار، جاهز أسجله كعملية:", action });
    }

    // 2. Receipt photo → AI vision
    if (imageDataUrl && typeof imageDataUrl === "string") {
      if (imageDataUrl.length > 6_000_000) {
        return NextResponse.json(
          { error: "الصورة كبيرة جداً — جرّب صورة أصغر (معظم الكاميرات شغالة)." },
          { status: 400 }
        );
      }
      const result = await analyzeReceiptImage(imageDataUrl, userId);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "ابعت صورة الفاتورة أو نص الإشعار البنكي" },
      { status: 400 }
    );
  } catch (error: unknown) {
    console.error("Scan route Error:", error);
    const msg = error instanceof Error ? error.message : "تعذر قراءة الفاتورة";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}