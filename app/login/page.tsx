"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserCheck,
  Zap,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e?: React.FormEvent, customEmail?: string, customPass?: string) {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    const targetEmail = customEmail || email;
    const targetPass = customPass || password;

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "login",
          email: targetEmail,
          password: targetPass,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "فشل تسجيل الدخول. يرجى التأكد من البيانات.");
        setLoading(false);
        return;
      }

      // Success -> Redirect to dashboard
      window.location.href = "/";
    } catch {
      setError("حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.");
      setLoading(false);
    }
  }

  function handleDemoLogin(type: "admin" | "user") {
    if (type === "admin") {
      setEmail("admin@fintech.eg");
      setPassword("admin123");
      handleLogin(undefined, "admin@fintech.eg", "admin123");
    } else {
      setEmail("mahmoud@garage.eg");
      setPassword("user123");
      handleLogin(undefined, "mahmoud@garage.eg", "user123");
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/landing" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7DFF51] via-[#00DBB7] to-[#7DFF51] flex items-center justify-center shadow-xl shadow-[#7DFF51]/25 group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="w-6 h-6 text-[#0A0A17]" />
            </div>
          </Link>
          <h1 className="text-2xl font-black text-white">تسجيل الدخول للمنظومة</h1>
          <p className="text-sm text-slate-400">
            مساعدك المالي السحابي لإدارة الدخل والمصروفات الشخصية الذكية
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  dir="ltr"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pr-10 pl-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-left"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  كلمة المرور
                </label>
                <span className="text-[11px] text-blue-400/80 hover:text-blue-300 cursor-pointer">
                  نسيت كلمة المرور؟
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pr-10 pl-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-left"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cta-pill w-full py-3.5 px-4 flex items-center justify-center gap-2 text-sm font-black disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                  <span>جارٍ تسجيل الدخول والتحقق...</span>
                </>
              ) : (
                <>
                  <span>تسجيل الدخول</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <p className="text-[11px] font-semibold text-slate-400 text-center">
              تجربة سريعة بنقرة واحدة (حسابات تجريبية مسبقة)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin("admin")}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 flex flex-col items-center gap-1 transition-all group"
              >
                <div className="flex items-center gap-1.5 text-amber-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="font-bold">حساب الأدمن</span>
                </div>
                <span className="text-[10px] text-slate-400 group-hover:text-slate-300">
                  admin@fintech.eg
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoLogin("user")}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-slate-200 flex flex-col items-center gap-1 transition-all group"
              >
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="font-bold">حساب عميل</span>
                </div>
                <span className="text-[10px] text-slate-400 group-hover:text-slate-300">
                  mahmoud@garage.eg
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center space-y-3 text-xs text-slate-400">
          <p>
            ليس لديك حساب بعد؟{" "}
            <Link
              href="/signup"
              className="text-blue-400 font-bold hover:text-blue-300 transition-colors"
            >
              أنشئ حسابك الجديد الآن مجاناً 🚀
            </Link>
          </p>

          <div>
            <Link
              href="/landing"
              className="text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1 text-[11px]"
            >
              <span>العودة لصفحة التعريف ومميزات المنظومة</span>
              <ArrowRight className="w-3 h-3 rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
