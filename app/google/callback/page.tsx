"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase-browser";

type Stage = "processing" | "error" | "done";

function GoogleCallbackInner() {
  const [stage, setStage] = useState<Stage>("processing");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const sb = getBrowserSupabase();
        if (!sb) {
          setStage("error");
          setMessage("خدمة تسجيل الدخول عبر جوجل غير مهيأة حالياً.");
          return;
        }

        const url = new URL(window.location.href);
        if (url.searchParams.get("error")) {
          setStage("error");
          setMessage("تم إلغاء تسجيل الدخول عبر جوجل، أو حدث خطأ أثناء التفعيل.");
          return;
        }

        const code = url.searchParams.get("code");
        let session = null;

        if (code) {
          // PKCE: exchange the one-time code for a session.
          const { data, error } = await sb.auth.exchangeCodeForSession(code);
          if (error) throw new Error(error.message);
          session = data.session;
        } else {
          const { data, error } = await sb.auth.getSession();
          if (error) throw new Error(error.message);
          session = data.session;
        }

        if (!session?.user?.email) {
          throw new Error("لم يتم العثور على جلسة جوجل صالحة.");
        }

        const meta = session.user.user_metadata || {};
        const email = session.user.email;
        const name = String(meta.full_name || meta.name || "") || email.split("@")[0];

        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: session.access_token,
            email,
            name,
            plan: url.searchParams.get("plan") || "monthly",
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || "تعذر الاتصال بالخادم.");
        }

        // We use our own signed cookie (not GoTrue's), so discard the local
        // GoTrue session and its tokens from browser storage.
        await sb.auth.signOut().catch(() => {});

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