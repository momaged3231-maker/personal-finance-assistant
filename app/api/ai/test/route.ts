import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { baseUrl, apiKey, model, provider } = body;

    if (!apiKey || !apiKey.trim() || !model || !model.trim()) {
      return NextResponse.json(
        { ok: false, message: "أدخل مفتاح API والموديل أولاً لاختبارهما" },
        { status: 400 }
      );
    }

    const base = (baseUrl || "https://openrouter.ai/api/v1").trim().replace(/\/+$/, "");

    // Try the real chat completion with a tiny prompt
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model.trim(),
        messages: [{ role: "user", content: "رد باختصار: تمام" }],
        max_tokens: 200,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(45000),
    });

    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(text);
    } catch {
      // not JSON; fall through
    }

    if (res.status === 200) {
      const choices = json.choices as Array<{ message?: { content?: string | null } }> | undefined;
      const content = choices?.[0]?.message?.content;
      if (content && String(content).trim()) {
        return NextResponse.json({
          ok: true,
          status: "success",
          message: `الموديل شغال! 🎉 رد فعلي: «${String(content).trim().slice(0, 80)}${String(content).length > 80 ? "…" : ""}»`,
        });
      }
      // 200 but empty content — reasoning-style model that needs more tokens
      return NextResponse.json({
        ok: true,
        status: "success",
        message:
          "الموديل اتصل بنجاح ✅ (موديل بيفكر الأول، رسالتك طولت شوية ناقصة شوية... لو الرد جاء فاضي حاول بدالة تانية أكبر)",
      });
    }

    // Map common errors to friendly Arabic messages
    const rawMessage =
      (json.error as { message?: string } | undefined)?.message || text.slice(0, 200);
    let hint = "";
    if (res.status === 401 || /invalid.*key|unauthorized|401/i.test(rawMessage)) {
      hint = "مفتاح API غير صحيح أو منتهي. تحقق من المفتاح من إعدادات المزود.";
    } else if (res.status === 402 || /402|credits|quota|insufficient|payment/i.test(rawMessage)) {
      hint = "رصيد حسابك غير كافٍ. أضف كريدت من إعدادات المزود.";
    } else if (res.status === 404 || /model.*not found|404|unknown model/i.test(rawMessage)) {
      hint = "اسم الموديل غير موجود أو غلط. تحقق من الكتابة أو استورد قائمة الموديلات.";
    } else if (res.status === 429 || /429|rate.?limit/i.test(rawMessage)) {
      hint = "المزود بيطلب منك تمهّل (Rate Limit) شوية دلوقتي. جرّب بعد دقيقة أو غيّر الموديل.";
    } else if (/base.?url|connection|fetch failed|ECONN|ENOTFOUND|timeout/i.test(rawMessage)) {
      hint = "مش ممكن نوصّل لرابط الـ API ده. تأكد من Base URL صح.";
    }

    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message: hint ? `${hint}` : "الموديل رجع خطأ. شوف التفاصيل تحت.",
        detail: rawMessage.slice(0, 300),
        httpStatus: res.status,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "خطأ غير متوقع";
    const timedOut = /timeout|aborted/i.test(msg);
    return NextResponse.json({
      ok: false,
      status: "error",
      message: timedOut
        ? "الاختبار استغرق وقت طويل وانقطع. جرّب مرة تانية أو تأكد من Base URL."
        : "حصل خطأ أثناء الاتصال بالمزود.",
      detail: msg.slice(0, 300),
    });
  }
}