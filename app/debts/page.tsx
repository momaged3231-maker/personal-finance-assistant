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
  Pencil,
  Bell,
  CalendarClock,
} from "lucide-react";
import { formatEgp, egpToPiastres, DebtItem, GamEyaMeta, GamEyaInstallment } from "@/lib/types";

export default function DebtsPage() {
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [gamMeta, setGamMeta] = useState<Record<number, GamEyaMeta>>({});
  const [gamSchedules, setGamSchedules] = useState<Record<number, GamEyaInstallment[]>>({});
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "gam_eya" | "i_owe" | "owed_to_me">("all");
  const [periodType, setPeriodType] = useState<"all" | "today" | "week" | "month" | "year">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [payAmountInput, setPayAmountInput] = useState("");

  // Edit debt modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDebt, setEditDebt] = useState<DebtItem | null>(null);
  const [editType, setEditType] = useState<"gam_eya" | "i_owe" | "owed_to_me">("gam_eya");
  const [editTitle, setEditTitle] = useState("");
  const [editPerson, setEditPerson] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editInstallment, setEditInstallment] = useState("");
  const [editMonths, setEditMonths] = useState("");
  const [editReceiptMonth, setEditReceiptMonth] = useState("");
  const [editDayNum, setEditDayNum] = useState("");
  const [editPaidInstallments, setEditPaidInstallments] = useState("");

  // New debt form state
  const [formType, setFormType] = useState<"gam_eya" | "i_owe" | "owed_to_me">("gam_eya");
  const [formTitle, setFormTitle] = useState("");
  const [formPerson, setFormPerson] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formInstallment, setFormInstallment] = useState("");
  const [formMonths, setFormMonths] = useState("");
  const [formReceiptMonth, setFormReceiptMonth] = useState("");
  const [formDayNum, setFormDayNum] = useState("");
  const [formReceiptDate, setFormReceiptDate] = useState("");
  const [formPaidInstallments, setFormPaidInstallments] = useState("");

  const fetchDebts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/finance?view=debts");
      const data = await res.json();
      if (data.debts) {
        setDebts(data.debts);
      }
      if (data.gamEyaMeta) {
        const map: Record<number, GamEyaMeta> = {};
        for (const [id, meta] of Object.entries(data.gamEyaMeta as Record<string, GamEyaMeta>)) {
          map[Number(id)] = meta;
        }
        setGamMeta(map);
      }
      if (data.gamEyaSchedules) {
        const map: Record<number, GamEyaInstallment[]> = {};
        for (const [id, sched] of Object.entries(data.gamEyaSchedules as Record<string, GamEyaInstallment[]>)) {
          map[Number(id)] = sched;
        }
        setGamSchedules(map);
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

  const isStructuredGamEya = (type: string) =>
    type === "gam_eya" && parseFloat(formInstallment) > 0 && parseFloat(formMonths) > 0;

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle) return;
    if (isStructuredGamEya(formType)) {
      if (!formInstallment || !formMonths) return;
      const pot = parseFloat(formInstallment) * parseFloat(formMonths);
      try {
        const res = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create_gam_eya",
            title: formTitle,
            personName: formPerson,
            monthlyInstallment: parseFloat(formInstallment),
            totalMonths: parseFloat(formMonths),
            receiptMonth: formReceiptMonth ? parseFloat(formReceiptMonth) : undefined,
            installmentDay: formDayNum ? parseFloat(formDayNum) : undefined,
            dueDate: formReceiptDate || undefined,
            installmentsPaid: formPaidInstallments ? parseFloat(formPaidInstallments) : undefined,
          }),
        });
        if (res.ok) {
          setIsModalOpen(false);
          setFormTitle("");
          setFormPerson("");
          setFormInstallment("");
          setFormMonths("");
          setFormReceiptMonth("");
          setFormDayNum("");
          setFormReceiptDate("");
          setFormPaidInstallments("");
          fetchDebts();
        }
        return;
      } catch (err) {
        console.error(err);
        return;
      }
    }

    if (!formAmount) return;
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

  const openEditModal = (item: DebtItem) => {
    setEditDebt(item);
    setEditType(item.type);
    setEditTitle(item.title);
    setEditPerson(item.person_name || "");
    setEditAmount((item.amount / 100).toFixed(2));
    setEditDueDate(item.due_date || "");
    const meta = gamMeta[item.id];
    if (meta) {
      setEditInstallment((meta.monthlyInstallment / 100).toFixed(2));
      setEditMonths(String(meta.totalMonths));
      setEditReceiptMonth(meta.receiptMonth ? String(meta.receiptMonth) : "");
      setEditDayNum(meta.installmentDay ? String(meta.installmentDay) : "");
      setEditPaidInstallments("");
    } else {
      setEditInstallment("");
      setEditMonths("");
      setEditReceiptMonth("");
      setEditDayNum("");
      setEditPaidInstallments("");
    }
    setIsEditModalOpen(true);
  };

  const handleUpdateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDebt || !editTitle) return;

    if (editType === "gam_eya" && gamMeta[editDebt.id]) {
      const pot = parseFloat(editInstallment) * parseFloat(editMonths);
      try {
        const res = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update_gam_eya",
            id: editDebt.id,
            title: editTitle,
            personName: editPerson,
            monthlyInstallment: parseFloat(editInstallment),
            totalMonths: parseFloat(editMonths),
            receiptMonth: editReceiptMonth ? parseFloat(editReceiptMonth) : undefined,
            installmentDay: editDayNum ? parseFloat(editDayNum) : undefined,
            dueDate: editDueDate || null,
            installmentsPaid: editPaidInstallments ? parseFloat(editPaidInstallments) : undefined,
          }),
        });
        if (res.ok) {
          setIsEditModalOpen(false);
          setEditDebt(null);
          fetchDebts();
        }
        return;
      } catch (err) {
        console.error(err);
        return;
      }
    }

    if (!editAmount) return;
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_debt",
          id: editDebt.id,
          type: editType,
          title: editTitle,
          personName: editPerson,
          amount: parseFloat(editAmount),
          dueDate: editDueDate || undefined,
        }),
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        setEditDebt(null);
        fetchDebts();
      }
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

  const daysDiff = (due: string) => {
    const dueDate = new Date(due.length <= 10 ? due + "T00:00:00" : due);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round((dueDate.getTime() - now.getTime()) / 86400000);
  };

  const getNextDue = (d: DebtItem): string | null => {
    if (d.type === "gam_eya" && gamSchedules[d.id]?.length) {
      const next = gamSchedules[d.id].find((inst) => !inst.paid && inst.dueDate);
      if (next?.dueDate) return next.dueDate;
    }
    return d.due_date || null;
  };

  const periodClassify = (d: DebtItem): typeof periodType | null => {
    const due = getNextDue(d);
    if (!due) return null;
    const days = daysDiff(due);
    if (days === 0) return "today";
    if (days >= 1 && days <= 7) return "week";
    if (days >= 8 && days <= 30) return "month";
    if (days >= 31 && days <= 365) return "year";
    return null;
  };

  const filteredDebts = debts.filter((d) => {
    if (filterType !== "all" && d.type !== filterType) return false;
    if (periodType !== "all" && periodClassify(d) !== periodType) return false;
    return true;
  });

  const periodOptions: Array<{ id: typeof periodType; label: string }> = [
    { id: "all", label: "كل المواعيد" },
    { id: "today", label: "النهاردة" },
    { id: "week", label: "خلال أسبوع" },
    { id: "month", label: "خلال شهر" },
    { id: "year", label: "خلال سنة" },
  ];

  const periodCount = (id: typeof periodType): number => {
    if (id === "all") return filteredDebts.length;
    return debts.filter((d) => periodClassify(d) === id && (filterType === "all" || d.type === filterType)).length;
  };

  // Payment notifications (overdue + due within 14 days), including
  // gam'eya next-installment dates derived from the schedule
  const notificationItems: Array<
    { d: DebtItem; days: number; label: string; remaining: number; dates: string[] }
  > = [];
  for (const d of debts) {
    if (d.status === "paid" && d.paid_amount >= d.amount) continue;
    const dates: string[] = [];
    let label = d.title;

    if (d.type === "gam_eya" && gamSchedules[d.id]?.length) {
      const meta = gamMeta[d.id];
      const next = gamSchedules[d.id].find((inst) => !inst.paid && inst.dueDate && daysDiff(inst.dueDate) <= 14);
      const receiptDue = d.due_date && daysDiff(String(d.due_date)) <= 14 ? String(d.due_date) : undefined;
      if (next) {
        dates.push(next.dueDate!);
        label = `${d.title} — ${next.label}`;
      }
      if (receiptDue) dates.push(receiptDue);
      if (dates.length === 0) continue;
      const first = dates.sort((a, b) => daysDiff(a) - daysDiff(b))[0];
      if (daysDiff(String(first)) > 14) continue;
      notificationItems.push({
        d,
        days: daysDiff(String(first)),
        label,
        remaining: next ? next.amount : Math.max(d.amount - d.paid_amount, 0),
        dates: [...new Set(dates.sort((a, b) => daysDiff(a) - daysDiff(b)))],
      });
      continue;
    }

    if (!d.due_date || d.paid_amount >= d.amount) continue;
    const day = daysDiff(String(d.due_date));
    if (day > 14) continue;
    if (daysDiff(String(d.due_date)) !== undefined) {
      notificationItems.push({
        d,
        days: day,
        label: d.title,
        remaining: Math.max(d.amount - d.paid_amount, 0),
        dates: [String(d.due_date)],
      });
    }
  }
  notificationItems.sort((a, b) => a.days - b.days);

  const notificationTypeLabel = (type: string) => {
    if (type === "gam_eya") return "جمعية";
    if (type === "owed_to_me") return "مستحق ليك";
    return "دين عليك";
  };

  const notificationTypeColor = (type: string) => {
    if (type === "gam_eya") return "bg-indigo-500/20 text-indigo-400";
    if (type === "owed_to_me") return "bg-emerald-500/20 text-emerald-400";
    return "bg-rose-500/20 text-rose-400";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24 md:pb-12" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">

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

        {/* Payment Notifications */}
        {notificationItems.length > 0 && (
          <div className="rounded-3xl border border-amber-500/25 bg-amber-950/15 p-4 mb-8">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-3">
              <Bell className="w-4 h-4" />
              تنبيهات السداد والقبض
            </div>
            <div className="space-y-2">
              {notificationItems.map(({ d, days, label, remaining }) => (
                <div
                  key={`${d.id}-${label}`}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${notificationTypeColor(d.type)}`}>
                      {notificationTypeLabel(d.type)}
                    </span>
                    <span className="text-xs font-semibold text-slate-200 truncate">{label}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      المتبقي <span className="text-amber-400 font-black">{formatEgp(remaining)}</span>
                    </span>
                    <span
                      className={`text-[11px] font-bold whitespace-nowrap ${
                        days < 0 ? "text-rose-400" : days === 0 ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {days < 0 ? `متأخر ${Math.abs(days)} يوم` : days === 0 ? "مستحق النهاردة" : `باقي ${days} يوم`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* Filter Tabs: type + period */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-3 mb-6 space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto">
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
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-500 shrink-0 flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5" />
              المواعيد:
            </span>
            {periodOptions.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriodType(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  periodType === tab.id
                    ? "bg-indigo-600 text-white border border-indigo-500 shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent"
                }`}
              >
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-black ${
                    periodType === tab.id ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {periodCount(tab.id)}
                </span>
              </button>
            ))}
          </div>
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
              const nextInst =
                item.type === "gam_eya" && gamSchedules[item.id]
                  ? gamSchedules[item.id].find((inst) => !inst.paid)
                  : undefined;

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
                      {item.type === "gam_eya" && gamMeta[item.id] && (
                        <div className="mt-2 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                              قسط {formatEgp(gamMeta[item.id].monthlyInstallment)} شهرياً
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              {gamMeta[item.id].totalMonths} شهور
                            </span>
                            {gamMeta[item.id].receiptMonth > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                                ⭐ هتقبض في الشهر {gamMeta[item.id].receiptMonth}
                              </span>
                            )}
                          </div>
                          {gamSchedules[item.id]?.length > 0 && (
                            <p className="text-[11px] text-slate-400">
                              الأقساط المدفوعة:{" "}
                              <span className="text-slate-200 font-bold">
                                {gamSchedules[item.id].filter((inst) => inst.paid).length}
                              </span>{" "}
                              من {gamSchedules[item.id].length}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-slate-500 hover:text-indigo-400 transition p-1"
                        title="تعديل"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-500 hover:text-rose-400 transition p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

                  {!isPaid && (
                    <div className="flex items-center justify-between text-xs mb-3 rounded-2xl bg-slate-900/70 border border-slate-800 px-3 py-2">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                        المتبقي:
                      </span>
                      <span className="font-black text-amber-400">{formatEgp(item.amount - item.paid_amount)}</span>
                    </div>
                  )}

                  {/* Footer details & Action */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {item.due_date
                          ? item.type === "gam_eya"
                            ? `القبض: ${item.due_date}`
                            : `الاستحقاق: ${item.due_date}`
                          : "بدون موعد محدد"}
                      </span>
                    </div>
                    {!isPaid && nextInst && (
                      <div className="text-[10px] text-indigo-300 font-semibold mt-1">
                        {nextInst.label} بتاريخ {nextInst.dueDate} — متبقي {formatEgp(nextInst.amount)}
                      </div>
                    )}

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

                {formType === "gam_eya" ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">القسط الشهري (ج.م):</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={formInstallment}
                          onChange={(e) => setFormInstallment(e.target.value)}
                          placeholder="مثال: 1000"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">عدد الشهور:</label>
                        <input
                          type="number"
                          required
                          value={formMonths}
                          onChange={(e) => setFormMonths(e.target.value)}
                          placeholder="مثال: 10"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">يوم السداد كل شهر:</label>
                        <input
                          type="number"
                          value={formDayNum}
                          onChange={(e) => setFormDayNum(e.target.value)}
                          placeholder="مثال: 5"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">شهر القبض (اختياري):</label>
                        <input
                          type="number"
                          value={formReceiptMonth}
                          onChange={(e) => setFormReceiptMonth(e.target.value)}
                          placeholder="مثال: 5"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">تاريخ القبض (اختياري):</label>
                        <input
                          type="date"
                          value={formReceiptDate}
                          onChange={(e) => setFormReceiptDate(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">أقساط مدفوعة مسبقاً:</label>
                        <input
                          type="number"
                          value={formPaidInstallments}
                          onChange={(e) => setFormPaidInstallments(e.target.value)}
                          placeholder="مثال: 3"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    {parseFloat(formInstallment) > 0 && parseFloat(formMonths) > 0 && (
                      <div className="rounded-xl bg-indigo-950/40 border border-indigo-500/25 px-3 py-2 text-xs text-slate-300 flex items-center justify-between">
                        <span>إجمالي القبض (القسط × الشهور):</span>
                        <span className="font-black text-indigo-300">
                          {formatEgp(egpToPiastres(parseFloat(formInstallment) * parseFloat(formMonths)))}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
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
                )}

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

        {/* Modal: Edit Debt / Gam'eya */}
        {isEditModalOpen && editDebt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-white">تعديل السجل</h3>
              <form onSubmit={handleUpdateDebt} className="space-y-3.5">
                <div className="text-xs text-slate-400">
                  المعاملة: <span className="text-white font-bold">{editDebt.title}</span>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">النوع:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "gam_eya", label: "جمعية شهرية" },
                      { id: "i_owe", label: "دين عليّ" },
                      { id: "owed_to_me", label: "فلوس ليا برة" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setEditType(t.id as typeof editType)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                          editType === t.id
                            ? "bg-indigo-600 border-indigo-500 text-white"
                            : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200"
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
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">الطرف الآخر (اختياري):</label>
                  <input
                    type="text"
                    value={editPerson}
                    onChange={(e) => setEditPerson(e.target.value)}
                    placeholder="اسم أمين الجمعية أو الشخص"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {editType === "gam_eya" && gamMeta[editDebt.id] ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">القسط الشهري (ج.م):</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={editInstallment}
                          onChange={(e) => setEditInstallment(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">عدد الشهور:</label>
                        <input
                          type="number"
                          required
                          value={editMonths}
                          onChange={(e) => setEditMonths(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">يوم السداد كل شهر:</label>
                        <input
                          type="number"
                          value={editDayNum}
                          onChange={(e) => setEditDayNum(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">شهر القبض (اختياري):</label>
                        <input
                          type="number"
                          value={editReceiptMonth}
                          onChange={(e) => setEditReceiptMonth(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">تاريخ القبض:</label>
                        <input
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">متابعة من قسط رقم:</label>
                        <input
                          type="number"
                          value={editPaidInstallments}
                          onChange={(e) => setEditPaidInstallments(e.target.value)}
                          placeholder="القسط الأخير المدفوع"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                    {parseFloat(editInstallment) > 0 && parseFloat(editMonths) > 0 && (
                      <div className="rounded-xl bg-indigo-950/40 border border-indigo-500/25 px-3 py-2 text-xs text-slate-300 flex items-center justify-between">
                        <span>إجمالي القبض (القسط × الشهور):</span>
                        <span className="font-black text-indigo-300">
                          {formatEgp(egpToPiastres(parseFloat(editInstallment) * parseFloat(editMonths)))}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">إجمالي المبلغ (ج.م):</label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">تاريخ الاستحقاق:</label>
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-3">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition"
                  >
                    حفظ التعديل
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditDebt(null);
                    }}
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
