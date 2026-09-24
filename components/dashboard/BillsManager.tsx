"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Bell,
  Zap,
} from "lucide-react";
import { formatEgp, piastresToEgp } from "@/lib/types";

interface RecurringBill {
  id: number;
  user_id: number;
  name: string;
  amount: number;
  category: string;
  account_id: number | null;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  day_of_month: number;
  next_due_date: string;
  end_date: string | null;
  reminder_days: number;
  auto_pay: boolean;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  days_until_due?: number;
  is_overdue?: boolean;
  is_due_soon?: boolean;
}

interface Account {
  id: number;
  name: string;
  balance: number;
}

const FREQUENCY_LABELS: Record<RecurringBill['frequency'], string> = {
  weekly: "أسبوعي",
  monthly: "شهري",
  quarterly: "كل 3 شهور",
  yearly: "سنوي",
};

const FREQUENCY_OPTIONS: { value: RecurringBill['frequency']; label: string }[] = [
  { value: "weekly", label: "أسبوعي" },
  { value: "monthly", label: "شهري" },
  { value: "quarterly", label: "كل 3 شهور" },
  { value: "yearly", label: "سنوي" },
];

export function BillsManager() {
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    amount: "",
    category: "فواتير والتزامات",
    account_id: "",
    frequency: "monthly" as RecurringBill['frequency'],
    day_of_month: 1,
    next_due_date: new Date().toISOString().split("T")[0],
    end_date: "",
    reminder_days: 3,
    auto_pay: false,
    notes: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [billsRes, accountsRes] = await Promise.all([
        fetch("/api/bills?view=upcoming&days=60"),
        fetch("/api/finance"),
      ]);

      if (!billsRes.ok || !accountsRes.ok) throw new Error("فشل تحميل البيانات");

      const billsData = await billsRes.json();
      const accountsData = await accountsRes.json();

      setBills(billsData.bills || []);
      setAccounts(accountsData.accounts || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ في التحميل");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [billsRes, accountsRes] = await Promise.all([
          fetch("/api/bills?view=upcoming&days=60"),
          fetch("/api/finance"),
        ]);

        if (!billsRes.ok || !accountsRes.ok) throw new Error("فشل تحميل البيانات");

        const billsData = await billsRes.json();
        const accountsData = await accountsRes.json();

        if (mounted) {
          setBills(billsData.bills || []);
          setAccounts(accountsData.accounts || []);
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "خطأ في التحميل");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      amount: "",
      category: "فواتير والتزامات",
      account_id: "",
      frequency: "monthly",
      day_of_month: 1,
      next_due_date: new Date().toISOString().split("T")[0],
      end_date: "",
      reminder_days: 3,
      auto_pay: false,
      notes: "",
    });
    setEditingBill(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const payload = {
        action: editingBill ? "update" : "create",
        id: editingBill?.id,
        name: formData.name,
        amount: Number(formData.amount),
        category: formData.category,
        account_id: formData.account_id ? Number(formData.account_id) : null,
        frequency: formData.frequency,
        day_of_month: formData.day_of_month,
        next_due_date: formData.next_due_date,
        end_date: formData.end_date || null,
        reminder_days: formData.reminder_days,
        auto_pay: formData.auto_pay,
        notes: formData.notes,
      };

      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل العملية");

      setSuccess(editingBill ? "تم تحديث الفاتورة" : "تم إضافة الفاتورة");
      resetForm();
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ في الحفظ");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("متأكد إنك عايز تمسح الفاتورة دي؟")) return;

    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحذف");

      setSuccess("تم حذف الفاتورة");
      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ في الحذف");
    }
  };

  const handleToggleActive = async (bill: RecurringBill) => {
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle_active", id: bill.id, is_active: !bill.is_active }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التحديث");

      fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ في التحديث");
    }
  };

  const startEdit = (bill: RecurringBill) => {
    setEditingBill(bill);
    setFormData({
      name: bill.name,
      amount: piastresToEgp(bill.amount).toString(),
      category: bill.category,
      account_id: bill.account_id?.toString() || "",
      frequency: bill.frequency,
      day_of_month: bill.day_of_month,
      next_due_date: bill.next_due_date,
      end_date: bill.end_date || "",
      reminder_days: bill.reminder_days,
      auto_pay: bill.auto_pay,
      notes: bill.notes || "",
    });
    setShowForm(true);
  };

  const getStatusBadge = (bill: RecurringBill) => {
    if (!bill.is_active) return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">متوقفة</span>;
    if (bill.is_overdue) return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded flex items-center gap-1"><AlertCircle className="w-3 h-3" /> متأخرة</span>;
    if (bill.is_due_soon) return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded flex items-center gap-1"><Bell className="w-3 h-3" /> خلال {bill.reminder_days} أيام</span>;
    return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded flex items-center gap-1"><CheckCircle className="w-3 h-3" /> بعد {bill.days_until_due} يوم</span>;
  };

  const getFrequencyLabel = (freq: RecurringBill['frequency']) => FREQUENCY_LABELS[freq];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-100 rounded animate-pulse w-1/4" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">الفواتير المتكررة</h2>
          <p className="text-gray-500 mt-1">تتبّع فواتيرك الدورية وتذكيرات الاستحقاق</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> فاتورة جديدة
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">×</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess("")} className="text-green-500 hover:text-green-700">×</button>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{editingBill ? "تعديل الفاتورة" : "فاتورة جديدة"}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">×</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم الفاتورة *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: فاتورة الكهرباء، اشتراك النت، قسط المدرسة"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (جنيه) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التكرار *</label>
                <select
                  value={formData.frequency}
                  onChange={e => setFormData({ ...formData, frequency: e.target.value as RecurringBill['frequency'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {FREQUENCY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">يوم الاستحقاق *</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.day_of_month}
                  onChange={e => setFormData({ ...formData, day_of_month: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">31 = آخر يوم في الشهر</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">أول استحقاق *</label>
                <input
                  type="date"
                  value={formData.next_due_date}
                  onChange={e => setFormData({ ...formData, next_due_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ينتهي في (اختياري)</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التنبيه قبل (أيام)</label>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={formData.reminder_days}
                  onChange={e => setFormData({ ...formData, reminder_days: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">الحساب المدفوع منه</label>
                <select
                  value={formData.account_id}
                  onChange={e => setFormData({ ...formData, account_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">— اختر حساب (للدفع التلقائي) —</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatEgp(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_pay}
                    onChange={e => setFormData({ ...formData, auto_pay: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="text-sm">دفع تلقائي يوم الاستحقاق (يحتاج حساب مختار)</span>
                  {formData.auto_pay && !formData.account_id && (
                    <span className="text-xs text-red-500">⚠️ اختر حساب أولاً</span>
                  )}
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
              >
                {editingBill ? "حفظ التعديلات" : "إضافة الفاتورة"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bills List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bills.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900">مفيش فواتير متكررة لسه</h3>
            <p className="text-gray-500 mt-1">اضغط &quot;فاتورة جديدة&quot; عشان تبدأ</p>
          </div>
        ) : (
          bills.map(bill => (
            <div
              key={bill.id}
              className={`bg-white border rounded-xl p-4 transition ${
                bill.is_overdue ? "border-red-200 bg-red-50" :
                bill.is_due_soon ? "border-yellow-200 bg-yellow-50" :
                "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate">{bill.name}</h4>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">{formatEgp(bill.amount)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(bill)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    title="تعديل"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(bill.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-0.5 bg-gray-100 rounded">{getFrequencyLabel(bill.frequency)}</span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded">
                    {bill.day_of_month === 31 ? "آخر الشهر" : `يوم ${bill.day_of_month}`}
                  </span>
                  {bill.auto_pay && bill.account_id && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded">
                      <Zap className="w-3 h-3" /> تلقائي
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>
                    قادم: {new Date(bill.next_due_date).toLocaleDateString("ar-EG", { day: "numeric", month: "long" })}
                    {bill.end_date && ` — ينتهي ${new Date(bill.end_date).toLocaleDateString("ar-EG")}`}
                  </span>
                </div>

                {bill.account_id && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                    <span className="truncate">
                      من: {accounts.find(a => a.id === bill.account_id)?.name || "غير معروف"}
                    </span>
                  </div>
                )}

                {bill.notes && (
                  <div className="text-xs text-gray-500 line-clamp-1">{bill.notes}</div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                {getStatusBadge(bill)}
                <button
                  onClick={() => handleToggleActive(bill)}
                  className={`text-xs px-2 py-1 rounded transition ${
                    bill.is_active
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                  }`}
                >
                  {bill.is_active ? "إيقاف" : "تفعيل"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}