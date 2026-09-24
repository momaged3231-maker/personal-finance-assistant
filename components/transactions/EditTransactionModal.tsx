"use client";

import { useState, useEffect } from "react";
import { X, Check, Edit3, ArrowUpLeft, ArrowDownRight, ArrowLeftRight } from "lucide-react";
import { Transaction, Account, piastresToEgp } from "@/lib/types";

interface EditTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  accounts: Account[];
  onSuccess: () => void;
}

const EXPENSE_CATEGORIES = [
  "سجائر",
  "طعام ومشروبات",
  "مواصلات وبنزين",
  "فواتير والتزامات",
  "تسوق ومشتريات",
  "صحة وعلاج",
  "أخرى",
];

const INCOME_CATEGORIES = ["مرتب", "عمولة", "صيانة", "دخل إضافي", "أخرى"];

export default function EditTransactionModal({
  isOpen,
  onClose,
  transaction,
  accounts,
  onSuccess,
}: EditTransactionModalProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("أخرى");
  const [accountId, setAccountId] = useState<number>(1);
  const [toAccountId, setToAccountId] = useState<number | undefined>(undefined);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (transaction) {
      setAmount(piastresToEgp(transaction.amount).toString());
      setDescription(transaction.description || "");
      setCategory(transaction.category || "أخرى");
      setAccountId(transaction.account_id);
      setToAccountId(transaction.to_account_id || undefined);
      setDate(transaction.date || new Date().toISOString().split("T")[0]);
      setError("");
    }
  }, [transaction]);

  if (!isOpen || !transaction) return null;

  const isIncome = transaction.type === "income";
  const isExpense = transaction.type === "expense";
  const isTransfer = transaction.type === "transfer";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError("من فضلك أدخل مبلغ صحيح");
      return;
    }

    if (isTransfer && accountId === toAccountId) {
      setError("لا يمكن التحويل لنفس الحساب");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_transaction",
          id: transaction?.id,
          amount: parseFloat(amount),
          description: description.trim() || category,
          category,
          accountId,
          toAccountId: isTransfer ? toAccountId : null,
          date,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل تعديل العملية");

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء تعديل العملية");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#101726] border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                isIncome
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : isExpense
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                  : "bg-blue-500/10 border-blue-500/20 text-blue-400"
              }`}
            >
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>تعديل العملية #{transaction.id}</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    isIncome
                      ? "bg-emerald-500/20 text-emerald-400"
                      : isExpense
                      ? "bg-rose-500/20 text-rose-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {isIncome ? "دخل" : isExpense ? "مصروف" : "تحويل"}
                </span>
              </h3>
              <p className="text-xs text-slate-400">عدّل المبلغ أو الوصف أو التاريخ والحساب</p>
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-3xl font-extrabold px-4 py-3 bg-slate-900 border border-slate-700 rounded-2xl text-white focus:outline-none focus:border-blue-500"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ج.م
              </span>
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {!isTransfer && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  التصنيف
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  {(isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Accounts & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                {isTransfer ? "من حساب" : isIncome ? "إيداع في حساب" : "خصم من حساب"}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            {isTransfer ? (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  إلى حساب
                </label>
                <select
                  value={toAccountId || accounts[1]?.id}
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
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  التاريخ
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          {isTransfer && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                التاريخ
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Submit Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>جاري الحفظ...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
