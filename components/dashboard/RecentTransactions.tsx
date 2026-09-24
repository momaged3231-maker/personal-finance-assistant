"use client";

import { useState } from "react";
import { ArrowUpLeft, ArrowDownRight, ArrowLeftRight, Trash2, Calendar, Pencil } from "lucide-react";
import { formatEgp, Transaction, Account } from "@/lib/types";
import EditTransactionModal from "@/components/transactions/EditTransactionModal";

interface RecentTransactionsProps {
  transactions: Transaction[];
  accounts: Account[];
  onTransactionDeleted: () => void;
  onTransactionUpdated: () => void;
}

export default function RecentTransactions({
  transactions,
  accounts,
  onTransactionDeleted,
  onTransactionUpdated,
}: RecentTransactionsProps) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  async function handleDelete(id: number) {
    if (!confirm("هل أنت متأكد من حذف هذه العملية؟")) return;

    setDeletingId(id);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_transaction", id }),
      });
      if (res.ok) {
        onTransactionDeleted();
      }
    } catch (e) {
      console.error("Delete failed", e);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-300">آخر العمليات</h2>
        <span className="text-xs text-slate-400">
          {transactions.length} عملية مسجلة
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="glass-card p-8 rounded-3xl text-center border-dashed border-slate-800">
          <p className="text-slate-400 text-sm">
            لسه مفيش أي عمليات مسجلة النهارده.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            سجل أول مصروف أو دخل من الأزرار بالأعلى أو اطلب من المساعد!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((t) => {
            const isIncome = t.type === "income";
            const isExpense = t.type === "expense";
            const isTransfer = t.type === "transfer";

            return (
              <div
                key={t.id}
                className="glass-card p-3.5 sm:p-4 rounded-2xl flex items-center justify-between hover:border-slate-700/80 transition-all duration-200 group"
              >
                {/* Left side: Icon & Info */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
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

                    <div className="flex items-center gap-2.5 mt-1 text-[11px] text-slate-400">
                      <span>
                        {isTransfer
                          ? `${t.account_name} ➔ ${t.to_account_name}`
                          : t.account_name}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {t.date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Amount, Edit & Delete actions */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="text-left ml-1">
                    <span
                      className={`text-sm sm:text-base font-extrabold block ${
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
                  </div>

                  {/* Edit Button */}
                  <button
                    onClick={() => setEditingTransaction(t)}
                    title="تعديل العملية"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    title="حذف العملية"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <EditTransactionModal
        isOpen={Boolean(editingTransaction)}
        onClose={() => setEditingTransaction(null)}
        transaction={editingTransaction}
        accounts={accounts}
        onSuccess={onTransactionUpdated}
      />
    </div>
  );
}
