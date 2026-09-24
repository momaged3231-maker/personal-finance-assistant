"use client";

import { useState, useEffect } from "react";
import { X, ArrowUpLeft, Check, Calculator, Percent, Briefcase, PlusCircle } from "lucide-react";
import { calculateCommission } from "@/lib/types";

interface Account {
  id: number;
  name: string;
}

interface IncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSuccess: () => void;
}

export default function IncomeModal({
  isOpen,
  onClose,
  accounts,
  onSuccess,
}: IncomeModalProps) {
  const [category, setCategory] = useState("عمولة");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState(
    accounts.find((a) => a.name.includes("كاش"))?.id || accounts[0]?.id || 1
  );
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Commission calculation state
  const [grossLabor, setGrossLabor] = useState("");
  const [commDetails, setCommDetails] = useState<{
    grossLabor: number;
    shopDeduction: number;
    netLabor: number;
    userCommission: number;
  } | null>(null);

  // Auto-calculate commission whenever grossLabor changes
  useEffect(() => {
    if ((category === "عمولة" || category === "صيانة") && grossLabor) {
      const val = parseFloat(grossLabor);
      if (!isNaN(val) && val > 0) {
        const result = calculateCommission(val, 10, 50);
        setCommDetails(result);
        setAmount(result.userCommission.toString());
      } else {
        setCommDetails(null);
      }
    } else {
      setCommDetails(null);
    }
  }, [category, grossLabor]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError("من فضلك أدخل مبلغ صحيح");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_income",
          amount: parseFloat(amount),
          description: description.trim() || ((category === "عمولة" || category === "صيانة") ? "إيراد عمولة" : category),
          category: category === "صيانة" ? "عمولة" : category,
          accountId,
          date,
          grossLabor: (category === "عمولة" || category === "صيانة") && grossLabor ? parseFloat(grossLabor) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تسجيل الدخل");

      setAmount("");
      setGrossLabor("");
      setDescription("");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#101726] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-emerald-950/20">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-emerald-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ArrowUpLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">تسجيل دخل جديد</h3>
              <p className="text-xs text-slate-400">إضافة إيراد صيانة، مرتب أو دخل إضافي</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
              {error}
            </div>
          )}

          {/* Source Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              مصدر الدخل
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setCategory("عمولة");
                  setGrossLabor("");
                  setAmount("");
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-sm font-bold transition-all ${
                  category === "عمولة" || category === "صيانة"
                    ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-lg shadow-emerald-500/10"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <Percent className="w-4 h-4" />
                <span>عمولة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategory("مرتب");
                  setGrossLabor("");
                  setAmount("12000"); // Default 12,000 monthly
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-sm font-bold transition-all ${
                  category === "مرتب"
                    ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-lg shadow-emerald-500/10"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>المرتب</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCategory("دخل إضافي");
                  setGrossLabor("");
                  setAmount("");
                }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-sm font-bold transition-all ${
                  category === "دخل إضافي"
                    ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400 shadow-lg shadow-emerald-500/10"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>دخل إضافي</span>
              </button>
            </div>
          </div>

          {/* General Commission Calculator Box */}
          {(category === "عمولة" || category === "صيانة") && (
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-emerald-400" />
                  حاسبة قواعد العمولة (تطبيق القواعد والنسب التلقائية)
                </span>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1">
                  المبلغ الإجمالي / المصنعية / إجمالي الخدمة
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    placeholder="مثال: 1500"
                    value={grossLabor}
                    onChange={(e) => setGrossLabor(e.target.value)}
                    className="w-full text-lg font-bold px-3 py-2 bg-slate-900/90 border border-emerald-500/40 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-400"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    ج.م
                  </span>
                </div>
              </div>

              {commDetails && (
                <div className="grid grid-cols-3 gap-2 text-center pt-1 text-xs">
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">خصم المكان / الشريك</span>
                    <span className="font-bold text-rose-400">-{commDetails.shopDeduction} ج.م</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">الصافي بعد الخصم</span>
                    <span className="font-bold text-slate-200">{commDetails.netLabor} ج.م</span>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40">
                    <span className="text-[10px] text-emerald-300 block font-semibold">عمولتك المستحقة</span>
                    <span className="font-extrabold text-emerald-400">{commDetails.userCommission} ج.م</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Amount to Record */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              المبلغ الفعلي للدخل (الذي سينزل في رصيدك)
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-3xl font-extrabold px-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ج.م
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              الوصف (اختياري)
            </label>
            <input
              type="text"
              placeholder={(category === "عمولة" || category === "صيانة") ? "مثال: عمولة مبيعات، تسويق، مصنعية، شغل حر..." : "وصف إضافي"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/70 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Account & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                إيداع في حساب
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/70 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                التاريخ
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/70 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base shadow-lg shadow-emerald-600/30 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <span>جاري الحفظ...</span>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>تأكيد تسجيل الدخل</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
