"use client";

import { useState } from "react";
import { X, ArrowDownRight, Check, Sparkles } from "lucide-react";

interface Account {
  id: number;
  name: string;
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSuccess: () => void;
}

const DEFAULT_CATEGORIES = [
  "سجائر",
  "طعام ومشروبات",
  "مواصلات وبنزين",
  "فواتير والتزامات",
  "تسوق ومشتريات",
  "صحة وعلاج",
  "أخرى",
];

const QUICK_AMOUNTS = [20, 50, 75, 100, 200, 500];

export default function ExpenseModal({
  isOpen,
  onClose,
  accounts,
  onSuccess,
}: ExpenseModalProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("طعام ومشروبات");
  const [accountId, setAccountId] = useState(
    accounts.find((a) => a.name.includes("كاش"))?.id || accounts[0]?.id || 1
  );
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
          action: "create_expense",
          amount: parseFloat(amount),
          description: description.trim() || category,
          category,
          accountId,
          date,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تسجيل المصروف");

      setAmount("");
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
      <div className="bg-[#101726] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-rose-950/20">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-rose-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">تسجيل مصروف جديد</h3>
              <p className="text-xs text-slate-400">سجل مصاريفك اليومية وحدث رصيدك فوراً</p>
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

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">
              المبلغ (بالجنيه المصري)
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-3xl font-extrabold px-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ج.م
              </span>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-2 mt-2.5">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(val.toString())}
                  className="px-3 py-1 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/50 transition-colors"
                >
                  +{val} ج.م
                </button>
              ))}
            </div>
          </div>

          {/* Description & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                الوصف
              </label>
              <input
                type="text"
                placeholder="مثال: سجائر، غدا كشري..."
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (e.target.value.includes("سجائر")) setCategory("سجائر");
                }}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/70 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                التصنيف
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/70 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                خصم من حساب
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/70 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500"
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
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/70 rounded-xl text-white text-sm focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-base shadow-lg shadow-rose-600/30 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <span>جاري الحفظ...</span>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>تأكيد تسجيل المصروف</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
