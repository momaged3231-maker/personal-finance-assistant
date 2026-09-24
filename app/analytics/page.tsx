"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Calendar,
  PieChart,
  ArrowDownRight,
  ArrowUpLeft,
  Sparkles,
  Loader2,
  TrendingDown,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Sliders,
  Share2,
  Printer,
  ShieldAlert,
} from "lucide-react";
import { formatEgp, CategoryBudgetItem } from "@/lib/types";

interface AnalyticsData {
  today: {
    income: number;
    expense: number;
    net: number;
  };
  month: {
    month: string;
    income: number;
    expense: number;
    net: number;
    maintenanceIncome: number;
    salaryIncome: number;
    otherIncome: number;
  };
  categories: {
    category: string;
    total: number;
    count: number;
  }[];
  budgets?: CategoryBudgetItem[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  // Budget Edit Modal State
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [budgetLimitInput, setBudgetLimitInput] = useState("");

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/finance?view=analytics");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load analytics", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !budgetLimitInput) return;

    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_budget",
          category: selectedCategory,
          monthlyLimit: parseFloat(budgetLimitInput),
        }),
      });

      if (res.ok) {
        setIsBudgetModalOpen(false);
        setSelectedCategory("");
        setBudgetLimitInput("");
        loadAnalytics();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      setSharing(true);
      const res = await fetch("/api/finance?view=whatsapp");
      const json = await res.json();
      if (json.text) {
        const url = `https://api.whatsapp.com/send?text=${json.text}`;
        window.open(url, "_blank");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSharing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-sm">جاري تحليل بياناتك المالية...</span>
      </div>
    );
  }

  const totalExpense = data.month.expense || 1;

  // Category color palette
  const categoryColors = [
    "bg-rose-500",
    "bg-amber-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-purple-500",
    "bg-teal-500",
    "bg-slate-500",
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <span>التحليلات والميزانيات الذكية</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            مراقبة ميزانيات الفئات وتنبيهات تخطي الإنفاق مع مقارنة الدخل بالمصروفات
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShareWhatsApp}
            disabled={sharing}
            className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-2"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{sharing ? "جاري التجهيز..." : "مشاركة عبر واتساب"}</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition flex items-center gap-2"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة تقرير</span>
          </button>
        </div>
      </div>

      {/* Expense Metrics: مصروفات اليوم - الأسبوع - الشهر */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="glass-card p-5 rounded-3xl border-t-2 border-t-rose-400">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">مصروفات اليوم</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-rose-400">
            {formatEgp(data.today.expense)}
          </span>
        </div>

        <div className="glass-card p-5 rounded-3xl border-t-2 border-t-amber-400">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">دخل الشهر الحالي</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ArrowUpLeft className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-emerald-400">
            {formatEgp(data.month.income)}
          </span>
        </div>

        <div className="glass-card p-5 rounded-3xl border-t-2 border-t-blue-400">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">مصروفات الشهر الإجمالية</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-black text-rose-400">
            {formatEgp(data.month.expense)}
          </span>
        </div>
      </div>

      {/* FEATURE 4: Smart Category Budgets & Warnings */}
      <div id="budgets" className="glass-card p-6 rounded-3xl space-y-4 border border-blue-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                الميزانيات الشهرية الذكية لكل فئة وتنبيهات الإنفاق
              </h2>
              <p className="text-[11px] text-slate-400">
                تنبيه تحذيري عند بلوغ 80% من الميزانية، وتنبيه خطر عند تجاوز 100%
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedCategory(data.categories[0]?.category || "طعام ومشروبات");
              setIsBudgetModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 self-start sm:self-auto transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            ضبط حد ميزانية لفئة
          </button>
        </div>

        {/* Budgets List */}
        {!data.budgets || data.budgets.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">
            لم يتم ضبط حدود ميزانية بعد. انقر على "ضبط حد ميزانية لفئة" للبدء.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
            {data.budgets.map((b) => {
              const isExceeded = b.is_exceeded;
              const isWarning = b.is_warning;

              return (
                <div
                  key={b.category}
                  className={`p-4 rounded-2xl border transition-all ${
                    isExceeded
                      ? "bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/20"
                      : isWarning
                      ? "bg-amber-950/20 border-amber-500/40 shadow-lg shadow-amber-950/20"
                      : "bg-slate-900/60 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <span>{b.category}</span>
                      {isExceeded && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-400 text-[10px] font-bold border border-rose-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> تجاوزت الميزانية!
                        </span>
                      )}
                      {isWarning && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-bold border border-amber-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> اقتربت من الحد (80%+)
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedCategory(b.category);
                        setBudgetLimitInput((b.monthly_limit / 100).toString());
                        setIsBudgetModalOpen(true);
                      }}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
                    >
                      تعديل
                    </button>
                  </div>

                  <div className="flex items-baseline justify-between text-xs mb-1.5">
                    <span className="text-slate-400">
                      المنصرف: <strong className="text-white">{formatEgp(b.spent_amount)}</strong>
                    </span>
                    <span className="text-slate-400">
                      الحد الشهري:{" "}
                      <strong className="text-slate-200">{formatEgp(b.monthly_limit)}</strong>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isExceeded
                          ? "bg-rose-500"
                          : isWarning
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, b.percentage)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>نسبة الاستهلاك: {b.percentage}%</span>
                    <span>
                      {b.monthly_limit - b.spent_amount >= 0
                        ? `متبقي: ${formatEgp(b.monthly_limit - b.spent_amount)}`
                        : `عجز: ${formatEgp(Math.abs(b.monthly_limit - b.spent_amount))}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chart 1: Income vs Expense Visual Bar */}
      <div className="glass-card p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            مقارنة الدخل بالمصروفات هذا الشهر
          </h2>
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-xl ${
              data.month.net >= 0
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}
          >
            الصافي: {data.month.net >= 0 ? "+" : ""}
            {formatEgp(data.month.net)}
          </span>
        </div>

        {/* Visual Progress Bar Ratio */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex">
            {data.month.income > 0 && (
              <div
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (data.month.income / (data.month.income + data.month.expense || 1)) * 100
                    )
                  )}%`,
                }}
                className="bg-emerald-500 transition-all duration-500"
                title={`الدخل: ${formatEgp(data.month.income)}`}
              />
            )}
            {data.month.expense > 0 && (
              <div
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(
                      (data.month.expense / (data.month.income + data.month.expense || 1)) * 100
                    )
                  )}%`,
                }}
                className="bg-rose-500 transition-all duration-500"
                title={`المصروف: ${formatEgp(data.month.expense)}`}
              />
            )}
          </div>

          <div className="flex items-center justify-between text-xs font-medium text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              إجمالي الدخل: {formatEgp(data.month.income)}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              إجمالي المصروفات: {formatEgp(data.month.expense)}
            </span>
          </div>
        </div>

        {/* Breakdown of Income Sources */}
        <div className="pt-2 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">عمولات ونسب</span>
            <span className="font-bold text-emerald-400">
              {formatEgp(data.month.maintenanceIncome)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">المرتب</span>
            <span className="font-bold text-emerald-400">
              {formatEgp(data.month.salaryIncome)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-slate-400 block text-[11px]">دخل إضافي آخر</span>
            <span className="font-bold text-slate-200">
              {formatEgp(data.month.otherIncome)}
            </span>
          </div>
        </div>
      </div>

      {/* Chart 2: Category Breakdown */}
      <div className="glass-card p-6 rounded-3xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-rose-400" />
            توزيع المصروفات حسب التصنيف
          </h2>
          <span className="text-xs text-slate-400">
            {data.categories.length} تصنيفات
          </span>
        </div>

        {data.categories.length === 0 ? (
          <p className="text-slate-500 text-xs py-4 text-center">
            لا توجد مصروفات مسجلة للشهر الحالي بعد.
          </p>
        ) : (
          <div className="space-y-3">
            {data.categories.map((c, idx) => {
              const percent = Math.round((c.total / totalExpense) * 100);
              const colorClass = categoryColors[idx % categoryColors.length];

              return (
                <div key={c.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${colorClass}`} />
                      {c.category}
                      <span className="text-slate-500 text-[10px] font-normal">
                        ({c.count} عملية)
                      </span>
                    </span>
                    <span className="font-extrabold text-slate-200">
                      {formatEgp(c.total)} ({percent}%)
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percent}%` }}
                      className={`h-full ${colorClass} rounded-full transition-all duration-300`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Set / Edit Category Budget */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              ضبط الحد الشهري للميزانية
            </h3>
            <form onSubmit={handleSetBudget} className="space-y-3.5">
              <div>
                <label className="text-xs text-slate-400 block mb-1">التصنيف:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none"
                >
                  {[
                    "طعام ومشروبات",
                    "مواصلات وبنزين",
                    "تسوق ومشتريات",
                    "فواتير والتزامات",
                    "صحة وعلاج",
                    "ترفيه وخروجات",
                    "أخرى",
                  ].map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">الحد الشهري الأقصى (ج.م):</label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  value={budgetLimitInput}
                  onChange={(e) => setBudgetLimitInput(e.target.value)}
                  placeholder="مثال: 3000"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition"
                >
                  حفظ الميزانية
                </button>
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
