"use client";

import { useEffect, useState } from "react";
import { Loader2, Target, CheckCircle2, AlertCircle } from "lucide-react";

const SUGGESTIONS = [
  "صندوق طوارئ",
  "توفير لجهاز أو سيارة",
  "تقسيم المرتب على الالتزامات",
  "سداد ديون",
  "متابعة مصاريف البيت",
];

export default function FinancialGoalCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasGoal, setHasGoal] = useState(false);
  const [goal, setGoal] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/marketing/profile", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        setHasGoal(Boolean(data?.exists));
        setGoal(data?.primaryGoal || "");
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleSave() {
    const trimmed = goal.trim().slice(0, 300);
    if (!trimmed) {
      setMessage({ text: "اكتب هدفك المالي الأول أولاً", type: "error" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/marketing/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryGoal: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setMessage({ text: data.error || "تعذر الحفظ. حاول مرة أخرى.", type: "error" });
        return;
      }
      setGoal(trimmed);
      setHasGoal(true);
      setMessage({ text: "تم حفظ هدفك المالي", type: "success" });
    } catch {
      setMessage({ text: "حدث خطأ أثناء الحفظ", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="glass-card p-5 rounded-3xl flex items-center gap-3 text-slate-400 text-xs animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
        <span>جارٍ تحميل الهدف المالي...</span>
      </div>
    );
  }

  return (
    <div
      className={`glass-card p-5 rounded-3xl ${
        hasGoal ? "" : "ring-2 ring-amber-500/40 shadow-lg shadow-amber-500/10"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
            hasGoal
              ? "bg-emerald-500/15 border border-emerald-500/25 text-emerald-400"
              : "bg-amber-500/15 border border-amber-500/30 text-amber-400"
          }`}
        >
          <Target className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h3 className="text-sm font-black text-white">هدفك المالي معنا</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {hasGoal
                ? "هدفك الحالي — عدّله متى شئت."
                : "خطوتك الأولى في دقيقة: حدد هدفك المالي الأساسي عشان صحبي يرتب أولوياته معاك (اختياري)."}
            </p>
          </div>

          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="مثال: تكوين صندوق طوارئ بـ 50 ألف جنيه"
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all resize-none"
          />

          {!hasGoal && (
            <div className="flex flex-wrap items-center gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setGoal(s)}
                  className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 text-[11px] font-bold text-slate-300 hover:border-emerald-500 hover:text-emerald-400 transition-all cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {saving ? "جارٍ الحفظ..." : hasGoal ? "حفظ التعديل" : "احفظ هدفي"}
            </button>

            {message && (
              <span
                className={`flex items-center gap-1.5 text-[11px] font-bold ${
                  message.type === "success" ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                <span>{message.text}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}