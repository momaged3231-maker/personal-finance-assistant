"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Send, User } from "lucide-react";

const GOALS = [
  "صندوق طوارئ",
  "توفير لجهاز أو سيارة",
  "تقسيم المرتب على الالتزامات",
  "سداد ديون",
  "متابعة مصاريف البيت",
  "أخرى",
];

type Status = "idle" | "loading" | "success" | "error";

export default function WaitlistForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/marketing/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          goal: goal.trim(),
          website: "",
          company: "",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setStatus("error");
        setMessage(data.error || "تعذر الحفظ. حاول مرة أخرى.");
        return;
      }
      setStatus("success");
      setMessage("تم تسجيلك في القايمة! هنوصلك أول ما يفتح التسجيل الفعلي.");
      setName("");
      setEmail("");
      setGoal("");
    } catch {
      setStatus("error");
      setMessage("حدث خطأ أثناء الاتصال. يرجى المحاولة لاحقاً.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">الاسم</label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="محمد أحمد"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">
            البريد الإلكتروني
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            dir="ltr"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-left"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-600 mb-1.5">
          هدفك المالي الأساسي (اختياري)
        </label>
        <select
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
        >
          <option value="">اختر هدفك من القايمة...</option>
          {GOALS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="lp-btn lp-btn-primary w-full py-3.5 disabled:opacity-60 cursor-pointer"
      >
        {status === "loading" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>جارٍ التسجيل...</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4 rotate-180" />
            <span>اشترك في قايمة الانتظار</span>
          </>
        )}
      </button>

      {status === "success" && (
        <p className="flex items-start gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          {message}
        </p>
      )}
      {status === "error" && (
        <p className="flex items-start gap-2 text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3.5 py-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {message}
        </p>
      )}

      <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
        بالتسجيل معنا أنت توافق على{" "}
        <Link href="/privacy" className="text-emerald-700 hover:underline font-bold">
          سياسة الخصوصية
        </Link>{" "}
        و{" "}
        <Link href="/terms" className="text-emerald-700 hover:underline font-bold">
          شروط الاستخدام
        </Link>
        . لن نرسل إليك إلا ما يهمك فعلاً.
      </p>
    </form>
  );
}