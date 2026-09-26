"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { KeyRound, Loader2 } from "lucide-react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("كلمة المرور لازم تكون 6 حروف على الأقل");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (!token) {
      setError("الرابط غير صالح أو ناقص");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_password", token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setDone(true);
        setTimeout(() => router.replace("/"), 1200);
      } else {
        setError(data?.error || "حصلت مشكلة - جرب تاني");
      }
    } catch {
      setError("حصلت مشكلة في الاتصال - جرب تاني");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-950">
      <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900/70 p-7 shadow-2xl backdrop-blur">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/15">
            <KeyRound className="h-6 w-6 text-blue-400" />
          </div>
          <h1 className="text-lg font-bold text-white">تعيين كلمة مرور جديدة</h1>
          <p className="mt-1 text-xs text-slate-400">اكتب كلمة مرور جديدة لحسابك في صحبي</p>
        </div>

        {done ? (
          <p className="text-center text-sm font-bold text-emerald-400">
            تم تغيير كلمة المرور — جارٍ تسجيل دخولك…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-slate-400">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-bold text-slate-400">تأكيد كلمة المرور</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-blue-500"
              />
            </div>

            {error && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-bold text-rose-300">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:opacity-50"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> جارٍ الحفظ…
                </span>
              ) : (
                "تغيير كلمة المرور"
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-200"
            >
              العودة لتسجيل الدخول
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}