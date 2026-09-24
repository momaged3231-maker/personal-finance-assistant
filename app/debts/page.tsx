"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  DollarSign,
  AlertCircle,
  Calendar,
  Sparkles,
  Wallet,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { formatEgp, egpToPiastres, DebtItem } from "@/lib/types";

export default function DebtsPage() {
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "gam_eya" | "i_owe" | "owed_to_me">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [payAmountInput, setPayAmountInput] = useState("");

  // New debt form state
  const [formType, setFormType] = useState<"gam_eya" | "i_owe" | "owed_to_me">("gam_eya");
  const [formTitle, setFormTitle] = useState("");
  const [formPerson, setFormPerson] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueDate, setFormDueDate] = useState("");

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/finance?view=debts");
      const data = await res.json();
      if (data.debts) {
        setDebts(data.debts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, []);

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formAmount) return;

    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_debt",
          type: formType,
          title: formTitle,
          personName: formPerson,
          amount: parseFloat(formAmount),
          dueDate: formDueDate || undefined,
        }),
      });
      if (res.ok) {
        setIsModalOpen(false);
        setFormTitle("");
        setFormPerson("");
        setFormAmount("");
        setFormDueDate("");
        fetchDebts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdatePayment = async () => {
    if (!selectedDebt || !payAmountInput) return;
    try {
      const currentPaid = selectedDebt.paid_amount;
      const additional = egpToPiastres(parseFloat(payAmountInput));
      const newPaid = currentPaid + additional;

      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_debt_payment",
          id: selectedDebt.id,
          paidAmount: newPaid,
        }),
      });

      if (res.ok) {
        setIsPayModalOpen(false);
        setSelectedDebt(null);
        setPayAmountInput("");
        fetchDebts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_debt", id }),
      });
      fetchDebts();
    } catch (e) {
      console.error(e);
    }
  };

  // Calculations
  const totalGamEya = debts
    .filter((d) => d.type === "gam_eya" && d.status === "pending")
    .reduce((sum, d) => sum + (d.amount - d.paid_amount), 0);

  const totalIOwe = debts
    .filter((d) => d.type === "i_owe" && d.status === "pending")
    .reduce((sum, d) => sum + (d.amount - d.paid_amount), 0);

  const totalOwedToMe = debts
    .filter((d) => d.type === "owed_to_me" && d.status === "pending")
    .reduce((sum, d) => sum + (d.amount - d.paid_amount), 0);

  const filteredDebts = debts.filter((d) => {
    if (filterType === "all") return true;
    return d.type === filterType;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-12" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Navbar />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6 mb-8">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
              <span className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Users className="w-6 h-6" />
              </span>
              الجمعيات والديون والالتزامات
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              متابعة الجمعيات الشهرية، الأقساط، الديون المستحقة عليك، ومستحقاتك لدى الآخرين
            </p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 self-start md:self-auto transition"
          >
            <Plus className="w-4 h-4" />
            إضافة جمعية أو دين جديد
          </button>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Gam'eya Card */}
          <div className="glass-panel p-5 rounded-3xl border border-indigo-500/30 bg-indigo-950/20 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-indigo-400">جمعيات شهرية نشطة</span>
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-white tracking-tight">
              {formatEgp(totalGamEya)}
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">متبقي سداده بالجمعيات</span>
          </div>

          {/* I Owe Card */}
          <div className="glass-panel p-5 rounded-3xl border border-rose-500/30 bg-rose-950/20 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-rose-400">ديون والتزامات عليّ</span>
              <ArrowUpRight className="w-5 h-5 text-rose-400" />
            </div>
            <div className="text-2xl font-black text-rose-400 tracking-tight">
              {formatEgp(totalIOwe)}
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">مطلوب سداده للغير</span>
          </div>

          {/* Owed To Me Card */}
          <div className="glass-panel p-5 rounded-3xl border border-emerald-500/30 bg-emerald-950/20 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-emerald-400">أموال لي بالخارج</span>
              <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 tracking-tight">
              {formatEgp(totalOwedToMe)}
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">سلف وأموال مستحقة لك</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-6 overflow-x-auto">
          {[
            { id: "all", label: "الكل" },
            { id: "gam_eya", label: "الجمعيات الشهرية" },
            { id: "i_owe", label: "ديون عليّ" },
            { id: "owed_to_me", label: "فلوس ليا برة" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as typeof filterType)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                filterType === tab.id
                  ? "bg-slate-800 text-white border border-slate-700 shadow-md"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Debts Grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-500">جاري تحميل البيانات...</div>
        ) : filteredDebts.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800/60 p-8">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-300">لا توجد سجلات مسجلة حالياً</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              سجّل جمعياتك، أقساطك أو مبالغ السلف لتبقى دائماً على دراية بمواعيد السداد والقبض
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredDebts.map((item) => {
              const progress = Math.min(100, Math.round((item.paid_amount / item.amount) * 100));
              const isPaid = item.status === "paid" || item.paid_amount >= item.amount;

              return (
                <div
                  key={item.id}
                  className={`glass-panel p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
                    isPaid
                      ? "border-slate-800/60 bg-slate-900/40 opacity-70"
                      : item.type === "gam_eya"
                      ? "border-indigo-500/20 bg-slate-900/80 hover:border-indigo-500/40"
                      : item.type === "i_owe"
                      ? "border-rose-500/20 bg-slate-900/80 hover:border-rose-500/40"
                      : "border-emerald-500/20 bg-slate-900/80 hover:border-emerald-500/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            item.type === "gam_eya"
                              ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                              : item.type === "i_owe"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {item.type === "gam_eya"
                            ? "جمعية شهرية"
                            : item.type === "i_owe"
                            ? "دين عليّ"
                            : "فلوس ليا برة"}
                        </span>
                        {isPaid && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> تم السداد
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-bold text-white mt-1.5">{item.title}</h4>
                      {item.person_name && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <span>الطرف الآخر:</span>
                          <span className="text-slate-200 font-medium">{item.person_name}</span>
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-slate-500 hover:text-rose-400 transition p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Amounts */}
                  <div className="flex items-baseline justify-between text-xs mt-4 mb-2">
                    <span className="text-slate-400">
                      المسدد: <span className="text-white font-bold">{formatEgp(item.paid_amount)}</span>
                    </span>
                    <span className="text-slate-400">
                      الإجمالي: <span className="text-white font-bold">{formatEgp(item.amount)}</span>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPaid
                          ? "bg-emerald-500"
                          : item.type === "gam_eya"
                          ? "bg-indigo-500"
                          : item.type === "i_owe"
                          ? "bg-rose-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Footer details & Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{item.due_date ? `الاستحقاق: ${item.due_date}` : "بدون موعد محدد"}</span>
                    </div>

                    {!isPaid && (
                      <button
                        onClick={() => {
                          setSelectedDebt(item);
                          setIsPayModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition"
                      >
                        تسجيل سداد / دفعة
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Create Debt / Gam'eya */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white">إضافة جمعية أو دين جديد</h3>
              <form onSubmit={handleCreateDebt} className="space-y-3.5">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">النوع:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "gam_eya", label: "جمعية شهرية" },
                      { id: "i_owe", label: "دين عليّ" },
                      { id: "owed_to_me", label: "فلوس ليا برة" },
                    ].map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setFormType(t.id as typeof formType)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                          formType === t.id
                            ? "bg-indigo-600 border-indigo-500 text-white"
                            : "bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">اسم الجمعية / المعاملة:</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="مثال: جمعية الشغل، سلفة الحاج محمد، قسط تكييف"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">الطرف الآخر (اختياري):</label>
                  <input
                    type="text"
                    value={formPerson}
                    onChange={(e) => setFormPerson(e.target.value)}
                    placeholder="اسم أمين الجمعية أو الشخص"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">إجمالي المبلغ (ج.م):</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">تاريخ الاستحقاق:</label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition"
                  >
                    حفظ وإضافة
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

        {/* Modal: Record Payment */}
        {isPayModalOpen && selectedDebt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white">تسجيل دفعة سداد</h3>
              <p className="text-xs text-slate-400">
                المعاملة: <span className="text-white font-bold">{selectedDebt.title}</span>
                <br />
                المتبقي للسداد:{" "}
                <span className="text-indigo-400 font-bold">
                  {formatEgp(selectedDebt.amount - selectedDebt.paid_amount)}
                </span>
              </p>

              <div>
                <label className="text-xs text-slate-400 block mb-1">المبلغ المدفوع الآن (ج.م):</label>
                <input
                  type="number"
                  step="any"
                  autoFocus
                  value={payAmountInput}
                  onChange={(e) => setPayAmountInput(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleUpdatePayment}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition"
                >
                  تأكيد السداد
                </button>
                <button
                  onClick={() => setIsPayModalOpen(false)}
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
