"use client";

import { useState } from "react";
import { X, ArrowLeftRight, Check } from "lucide-react";

interface Account {
  id: number;
  name: string;
  balance: number;
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSuccess: () => void;
}

export default function TransferModal({
  isOpen,
  onClose,
  accounts,
  onSuccess,
}: TransferModalProps) {
  const [fromAccountId, setFromAccountId] = useState(
    accounts.find((a) => a.name.includes("كاش"))?.id || accounts[0]?.id || 1
  );
  const [toAccountId, setToAccountId] = useState(
    accounts.find((a) => a.name.includes("بنك"))?.id || accounts[1]?.id || 2
  );
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError("من فضلك أدخل مبلغ تحويل صحيح");
      return;
    }

    if (fromAccountId === toAccountId) {
      setError("لا يمكن التحويل لنفس الحساب! اختر حسابين مختلفين");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_transfer",
          amount: parseFloat(amount),
          description: description.trim() || undefined,
          fromAccountId,
          toAccountId,
          date,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إتمام التحويل");

      setAmount("");
      setDescription("");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء تنفيذ التحويل");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#101726] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-blue-950/20">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800/80 bg-blue-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">تحويل بين الحسابات</h3>
              <p className="text-xs text-slate-400">نقل أموال بدون احتسابها كمصروف أو دخل</p>
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
              المبلغ المحول (بالجنيه المصري)
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
                className="w-full text-3xl font-extrabold px-4 py-3 bg-slate-900/90 border border-slate-700/80 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ج.م
              </span>
            </div>
          </div>

          {/* Accounts Transfer Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                من حساب (المصدر)
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
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
                إلى حساب (الوجهة)
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                ملاحظات التحويل (اختياري)
              </label>
              <input
                type="text"
                placeholder="مثال: إيداع بنكي، تحويل لمحفظة"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/70 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                التاريخ
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-700/70 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-base shadow-lg shadow-blue-600/30 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <span>جاري التحويل...</span>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>تأكيد التحويل</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
