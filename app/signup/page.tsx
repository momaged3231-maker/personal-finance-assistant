"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  Crown,
} from "lucide-react";

function SignupForm() {
  const searchParams = useSearchParams();
  const initialPlan = searchParams.get("plan") || "monthly";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState<"free" | "monthly" | "semi-annual" | "annual">(
    initialPlan === "annual"
      ? "annual"
      : initialPlan === "semi-annual"
      ? "semi-annual"
      : initialPlan === "free"
      ? "free"
      : "monthly"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qPlan = searchParams.get("plan");
    if (qPlan && ["free", "monthly", "semi-annual", "annual"].includes(qPlan)) {
      setPlan(qPlan as any);
    }
  }, [searchParams]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password.length < 6) {
      setError("يجب أن تكون كلمة المرور 6 أحرف أو أرقام على الأقل.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "register",
          name,
          email,
          password,
          phone,
          plan,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "تعذر إنشاء الحساب. يرجى مراجعة البيانات.");
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

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/landing" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-xl shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </Link>
          <h1 className="text-2xl font-black text-white">إنشاء حساب جديد في المنظومة</h1>
          <p className="text-sm text-slate-400">
            ابدأ رحلتك المالية الذكية الآن وتحكم في كل قرش بدقة وسهولة
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl space-y-5">
          {/* Plan Selector Header */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              اختر خطة الاشتراك المناسبة لك:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPlan("free")}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  plan === "free"
                    ? "bg-blue-600/20 border-blue-500 text-blue-300 shadow-md shadow-blue-500/10 font-bold"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="text-xs">المجانية</div>
                <div className="text-[10px] text-slate-400 mt-0.5">0 ج.م / شهر</div>
              </button>

              <button
                type="button"
                onClick={() => setPlan("monthly")}
                className={`p-2.5 rounded-xl border text-center transition-all relative ${
                  plan === "monthly"
                    ? "bg-blue-600/20 border-blue-500 text-blue-300 shadow-md shadow-blue-500/10 font-bold"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-full">
                  شائع
                </span>
                <div className="text-xs">المحترف</div>
                <div className="text-[10px] text-slate-400 mt-0.5">149 ج.م / شهر</div>
              </button>

              <button
                type="button"
                onClick={() => setPlan("annual")}
                className={`p-2.5 rounded-xl border text-center transition-all relative ${
                  plan === "annual"
                    ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10 font-bold"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <span className="absolute -top-2 right-2 px-1.5 py-0.2 bg-amber-400 text-slate-950 text-[9px] font-black rounded-full">
                  توفير 33%
                </span>
                <div className="text-xs flex items-center justify-center gap-1">
                  <Crown className="w-3 h-3 text-amber-400" />
                  <span>سنوي VIP</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">1190 ج.م / سنة</div>
              </button>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                الاسم الكامل
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="محمد أحمد"
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pr-10 pl-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  كلمة المرور
                </label>
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  رقم الهاتف (اختياري)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01012345678"
                    dir="ltr"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pr-10 pl-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-left"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="cta-pill w-full py-3.5 px-4 flex items-center justify-center gap-2 text-sm font-black disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-900" />
                    <span>جارٍ إنشاء الحساب وتهيئة السحابة...</span>
                  </>
                ) : (
                  <>
                    <span>إنشاء الحساب وبدء الاستخدام فوراً</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* SaaS Perks */}
          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>تهيئة فورية لـ 3 حسابات مالية و 8 تصنيفات ذكية</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>مزامنة سحابية فائقة الأمان مشفرة بالكامل على Supabase</span>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="text-center space-y-3 text-xs text-slate-400">
          <p>
            لديك حساب بالفعل؟{" "}
            <Link
              href="/login"
              className="text-blue-400 font-bold hover:text-blue-300 transition-colors"
            >
              تسجيل الدخول الآن
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

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center text-slate-400 text-sm">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
