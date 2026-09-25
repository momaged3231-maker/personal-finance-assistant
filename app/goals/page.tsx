"use client";

import { useEffect, useState } from "react";
import {
  Target,
  Plus,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Calendar,
  Sparkles,
  Trash2,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
} from "lucide-react";
import { formatEgp, egpToPiastres, SavingsGoalItem } from "@/lib/types";

function goalStartLabel(createdAt: string): string {
  const start = new Date(createdAt);
  if (isNaN(start.getTime())) return "النهاردة";
  const now = new Date();
  const totalDays = Math.floor((now.getTime() - start.getTime()) / 86400000);
  if (totalDays <= 0) return "النهاردة";
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (months < 1) return `${totalDays} يوم`;
  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years > 0 && remMonths > 0) return `${years} سنة و${remMonths} شهر`;
  if (years > 0) return `${years} سنة`;
  return `${months} شهر`;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<SavingsGoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoalItem | null>(null);
  const [depositAmount, setDepositAmount] = useState("");

  // Form
  const [formTitle, setFormTitle] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formCurrent, setFormCurrent] = useState("");
  const [formDate, setFormDate] = useState("");

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/finance?view=goals");
      const data = await res.json();
      if (data.goals) {
        setGoals(data.goals);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formTarget) return;

    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_goal",
          title: formTitle,
          targetAmount: parseFloat(formTarget),
          currentAmount: formCurrent ? parseFloat(formCurrent) : 0,
          targetDate: formDate || undefined,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormTitle("");
        setFormTarget("");
        setFormCurrent("");
        setFormDate("");
        fetchGoals();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeposit = async () => {
    if (!selectedGoal || !depositAmount) return;

    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deposit_goal",
          id: selectedGoal.id,
          amount: parseFloat(depositAmount),
        }),
      });

      if (res.ok) {
        setIsDepositModalOpen(false);
        setSelectedGoal(null);
        setDepositAmount("");
        fetchGoals();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الهدف؟")) return;
    try {
      await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_goal", id }),
      });
      fetchGoals();
    } catch (e) {
      console.error(e);
    }
  };

  // Calculations
  const totalTarget = goals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrent = goals.reduce((sum, g) => sum + g.current_amount, 0);
  const overallProgress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-12" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6 mb-8">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <span className="p-2 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Target className="w-6 h-6" />
              </span>
              أهداف التوفير وصندوق الطوارئ
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              خطط لأحلامك المستقبلية، سيارة، عمرة، أو بناء صندوق طوارئ يغطي مصاريفك 6 أشهر
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 flex items-center gap-2 self-start md:self-auto transition"
          >
            <Plus className="w-4 h-4" />
            إنشاء هدف توفير جديد
          </button>
        </div>

        {/* Top Summary Banner */}
        <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900/80 mb-8 relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div>
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-4 h-4" />
                المعدل الكلي لإنجاز أهدافك
              </span>
              <div className="text-3xl font-black text-white">{overallProgress}%</div>
              <p className="text-xs text-slate-400 mt-1">
                تم توفير {formatEgp(totalCurrent)} من أصل {formatEgp(totalTarget)}
              </p>
            </div>

            <div className="md:col-span-2 space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-medium">
                <span>التقدم نحو الحرية المالية</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                💡 نصيحة مالية: ينصح الخبراء بادخار ما لا يقل عن 20% من دخلك الشهري في صندوق الطوارئ أولاً قبل الاستثمار.
              </p>
            </div>
          </div>
        </div>

        {/* Goals Grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-500">جاري تحميل الأهداف...</div>
        ) : goals.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800/60 p-8">
            <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">لم تضف أهداف توفير بعد</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              ابدأ الآن بإنشاء هدفك الأول، مثل "صندوق الطوارئ" أو "دفعة مقدم سيارة" لتتبع مدخراتك بذكاء
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((g) => {
              const progress = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
              const isCompleted = progress >= 100;
              const remaining = Math.max(0, g.target_amount - g.current_amount);

              return (
                <div
                  key={g.id}
                  className={`glass-panel p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
                    isCompleted
                      ? "border-emerald-500/40 bg-emerald-950/10 shadow-lg shadow-emerald-500/10"
                      : "border-slate-800 bg-slate-900/80 hover:border-amber-500/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
                          isCompleted
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white">{g.title}</h4>
                        <span className="text-xs text-slate-400">
                          {g.target_date ? `الموعد المستهدف: ${g.target_date}` : "هدف مستمر"}
                        </span>
                        <span className="text-[11px] font-semibold text-amber-400 inline-flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          التحويش من {goalStartLabel(g.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="grid grid-cols-2 gap-2 my-4">
                    <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block mb-0.5">تم توفيره:</span>
                      <span className="text-base font-bold text-emerald-400">{formatEgp(g.current_amount)}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
                      <span className="text-[11px] text-slate-400 block mb-0.5">المبلغ المطلوب:</span>
                      <span className="text-base font-bold text-white">{formatEgp(g.target_amount)}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-400">نسبة التحقيق:</span>
                      <span className={isCompleted ? "text-emerald-400" : "text-amber-400"}>
                        {progress}% {isCompleted && "✨ اكتمل بنجاح!"}
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted
                            ? "bg-emerald-500"
                            : progress >= 60
                            ? "bg-amber-500"
                            : "bg-blue-500"
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {!isCompleted && (
                      <span className="text-[11px] text-slate-400 block text-left">
                        متبقي {formatEgp(remaining)}
                      </span>
                    )}
                  </div>

                  {/* Action button */}
                  <button
                    onClick={() => {
                      setSelectedGoal(g);
                      setIsDepositModalOpen(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    إيداع مبلغ في الهدف
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create Goal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white">إنشاء هدف توفير جديد</h3>
              <form onSubmit={handleCreateGoal} className="space-y-3.5">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">اسم الهدف:</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="مثال: صندوق الطوارئ، دفعة عربية، مصيف"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">المبلغ المطلوب (ج.م):</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formTarget}
                      onChange={(e) => setFormTarget(e.target.value)}
                      placeholder="50000"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">المتوفر حالياً (ج.م):</label>
                    <input
                      type="number"
                      step="any"
                      value={formCurrent}
                      onChange={(e) => setFormCurrent(e.target.value)}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">تاريخ الوصول المستهدف:</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition"
                  >
                    حفظ الهدف
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Deposit to Goal */}
        {isDepositModalOpen && selectedGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white">إيداع مبلغ في الهدف</h3>
              <p className="text-xs text-slate-400">
                الهدف: <span className="text-white font-bold">{selectedGoal.title}</span>
                <br />
                الرصيد الحالي:{" "}
                <span className="text-emerald-400 font-bold">{formatEgp(selectedGoal.current_amount)}</span>
              </p>

              <div>
                <label className="text-xs text-slate-400 block mb-1">المبلغ المراد إيداعه (ج.م):</label>
                <input
                  type="number"
                  step="any"
                  autoFocus
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleDeposit}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition"
                >
                  إيداع في الرصيد
                </button>
                <button
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
