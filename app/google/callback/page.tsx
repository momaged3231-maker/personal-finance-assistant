"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Stage = "processing" | "error" | "done";

function parseHashTokens(hash: string): Record<string, string> {
  const params: Record<string, string> = {};
  const trimmed = hash.startsWith("#") ? hash.slice(1) : hash;
  for (const pair of trimmed.split("&")) {
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const key = decodeURIComponent(pair.slice(0, idx));
    const value = decodeURIComponent(pair.slice(idx + 1));
    params[key] = value;
  }
  return params;
}

function GoogleCallbackInner() {
  const [stage, setStage] = useState<Stage>("processing");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.get("error")) {
          setStage("error");
          setMessage("تم إلغاء تسجيل الدخول عبر جوجل، أو حدث خطأ أثناء التفعيل.");
          return;
        }

        // Implicit grant: GoTrue returns the tokens in the URL fragment.
        const tokens = parseHashTokens(window.location.hash);
        const accessToken = tokens.access_token;

        if (!accessToken) {
          setStage("error");
          setMessage("لم يتم العثور على جلسة جوجل صالحة. يرجى المحاولة مرة أخرى.");
          return;
        }

        // Clean the tokens out of the address bar before we continue.
        const cleanUrl = window.location.href.split("#")[0];
        window.history.replaceState(window.history.state, "", cleanUrl);

        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken,
            plan: url.searchParams.get("plan") || "monthly",
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || "تعذر الاتصال بالخادم.");
        }

        if (!cancelled) {
          setStage("done");
          window.setTimeout(() => {
            window.location.href = "/";
          }, 700);
        }
      } catch (err) {
        if (cancelled) return;
        setStage("error");
        setMessage(
          err instanceof Error && err.message ? err.message : "حدث خطأ أثناء التحقق من حساب جوجل."
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm text-center space-y-5">
        {stage === "processing" && (
          <>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
              <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">جارٍ تسجيل الدخول عبر جوجل</h1>
              <p className="text-sm text-slate-400 mt-1">نتحقق من حسابك ونجهز مساحتك المالية...</p>
            </div>
          </>
        )}

        {stage === "done" && (
          <>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">تم بنجاح!</h1>
              <p className="text-sm text-slate-400 mt-1">جارٍ تحويلك إلى لوحتك المالية...</p>
            </div>
          </>
        )}

        {stage === "error" && (
          <>
            <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-rose-400" />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">تعذر تسجيل الدخول</h1>
              <p className="text-sm text-slate-400 mt-1" dir="auto">
                {message}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/login"
                className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
              >
                العودة لتسجيل الدخول
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      }
    >
      <GoogleCallbackInner />
    </Suspense>
  );
}