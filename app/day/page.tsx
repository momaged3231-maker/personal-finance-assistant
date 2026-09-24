"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar as CalendarIcon,
  ArrowUpLeft,
  ArrowDownRight,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Trash2,
  Pencil,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { formatEgp, Transaction, Account } from "@/lib/types";
import EditTransactionModal from "@/components/transactions/EditTransactionModal";

interface DayData {
  summary: {
    date: string;
    income: number;
    expense: number;
    net: number;
    transferCount: number;
    transactionsCount: number;
  };
  transactions: Transaction[];
  accounts?: Account[];
}

export default function DayPage() {
  const getToday = () => new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const fetchDayData = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance?view=day&date=${date}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load daily data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDayData(selectedDate);
  }, [selectedDate, fetchDayData]);

  function changeDay(deltaDays: number) {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + deltaDays);
    const newDateStr = current.toISOString().split("T")[0];
    setSelectedDate(newDateStr);
  }

  async function handleDelete(id: number) {
    if (!confirm("هل أنت متأكد من حذف هذه العملية؟")) return;
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_transaction", id }),
      });
      if (res.ok) {
        fetchDayData(selectedDate);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const isToday = selectedDate === getToday();

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Date Header Controls */}
      <div className="glass-card p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-400" />
            <span>عرض اليومية المفصل</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            تصفح العمليات والصافي المالي لأي يوم بالتحديد
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
          <button
            onClick={() => changeDay(-1)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
            title="اليوم السابق"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm font-semibold focus:outline-none focus:border-blue-500"
          />

          <button
            onClick={() => changeDay(1)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60"
            title="اليوم التالي"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              onClick={() => setSelectedDate(getToday())}
              className="px-3 py-1.5 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:bg-blue-600/30 text-xs font-bold transition-colors"
            >
              العودة لليوم
            </button>
          )}
        </div>
      </div>

      {loading || !data ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-sm">جاري جلب تفاصيل اليوم...</span>
        </div>
      ) : (
        <>
          {/* Day Summary Cards: دخل - مصروف - تحويلات - صافي اليوم */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* دخل */}
            <div className="glass-card p-4 rounded-2xl border-t-2 border-t-emerald-500">
              <span className="text-xs text-slate-400 font-semibold block mb-1">
                دخل اليوم
              </span>
              <span className="text-xl font-black text-emerald-400">
                {formatEgp(data.summary.income)}
              </span>
            </div>

            {/* مصروف */}
            <div className="glass-card p-4 rounded-2xl border-t-2 border-t-rose-500">
              <span className="text-xs text-slate-400 font-semibold block mb-1">
                مصروف اليوم
              </span>
              <span className="text-xl font-black text-rose-400">
                {formatEgp(data.summary.expense)}
              </span>
            </div>

            {/* تحويلات */}
            <div className="glass-card p-4 rounded-2xl border-t-2 border-t-blue-500">
              <span className="text-xs text-slate-400 font-semibold block mb-1">
                التحويلات
              </span>
              <span className="text-xl font-black text-blue-400">
                {data.summary.transferCount} عملية
              </span>
            </div>

            {/* صافي اليوم */}
            <div className="glass-card p-4 rounded-2xl border-t-2 border-t-indigo-500">
              <span className="text-xs text-slate-400 font-semibold block mb-1">
                صافي اليوم
              </span>
              <span
                className={`text-xl font-black ${
                  data.summary.net >= 0 ? "text-blue-400" : "text-amber-400"
                }`}
              >
                {data.summary.net >= 0 ? "+" : ""}
                {formatEgp(data.summary.net)}
              </span>
            </div>
          </div>

          {/* Timeline of Transactions */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-300">
              شريط العمليات الزمني ({data.transactions.length})
            </h2>

            {data.transactions.length === 0 ? (
              <div className="glass-card p-10 rounded-3xl text-center border-dashed border-slate-800">
                <CalendarIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">
                  لا توجد أي معاملات مسجلة في هذا اليوم ({selectedDate}).
                </p>
              </div>
            ) : (
              <div className="relative pl-2 sm:pl-4 space-y-3 before:absolute before:right-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-800">
                {data.transactions.map((t) => {
                  const isIncome = t.type === "income";
                  const isExpense = t.type === "expense";
                  const isTransfer = t.type === "transfer";

                  return (
                    <div
                      key={t.id}
                      className="glass-card p-4 rounded-2xl flex items-center justify-between relative group hover:border-slate-700 transition-all duration-200"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center border z-10 ${
                            isIncome
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              : isExpense
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                              : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                          }`}
                        >
                          {isIncome && <ArrowUpLeft className="w-5 h-5" />}
                          {isExpense && <ArrowDownRight className="w-5 h-5" />}
                          {isTransfer && <ArrowLeftRight className="w-5 h-5" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">
                              {t.description}
                            </span>
                            {t.category && (
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/40">
                                {t.category}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            {isTransfer
                              ? `من ${t.account_name} ➔ إلى ${t.to_account_name}`
                              : `الحساب: ${t.account_name}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={`text-base font-extrabold ${
                            isIncome
                              ? "text-emerald-400"
                              : isExpense
                              ? "text-rose-400"
                              : "text-blue-400"
                          }`}
                        >
                          {isIncome ? "+" : isExpense ? "-" : ""}
                          {formatEgp(t.amount)}
                        </span>

                        <button
                          onClick={() => setEditingTransaction(t)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          title="تعديل"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Edit Modal */}
          <EditTransactionModal
            isOpen={Boolean(editingTransaction)}
            onClose={() => setEditingTransaction(null)}
            transaction={editingTransaction}
            accounts={data.accounts || []}
            onSuccess={() => fetchDayData(selectedDate)}
          />
        </>
      )}
    </div>
  );
}
