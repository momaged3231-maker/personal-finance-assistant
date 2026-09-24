"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon,
  Shield,
  Coins,
  Wallet,
  Tags,
  Bot,
  Database,
  Check,
  Plus,
  Trash2,
  Lock,
  Download,
  AlertTriangle,
  Loader2,
  UserCheck,
  Calculator,
  RefreshCw,
  Cloud,
  CheckCircle2,
} from "lucide-react";
import { formatEgp, Account } from "@/lib/types";

interface Category {
  id: number;
  name: string;
  type: "expense" | "income";
  icon?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "roles" | "finance" | "accounts" | "categories" | "ai" | "backup" | "supabase"
  >("roles");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Supabase State
  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured?: boolean;
    connected?: boolean;
    message?: string;
    error?: string;
    hint?: string;
  } | null>(null);
  const [checkingSupabase, setCheckingSupabase] = useState(false);
  const [migratingSupabase, setMigratingSupabase] = useState(false);

  // Financial Settings
  const [salary, setSalary] = useState("12000");
  const [shopCut, setShopCut] = useState("10");
  const [userCut, setUserCut] = useState("50");
  const [currency, setCurrency] = useState("ج.م");

  // Roles & Security
  const [currentRole, setCurrentRole] = useState("admin"); // 'admin' | 'entry' | 'viewer'
  const [pinLock, setPinLock] = useState(false);
  const [pinCode, setPinCode] = useState("");

  // AI Settings
  const [openAiKey, setOpenAiKey] = useState("");
  const [aiTone, setAiTone] = useState("egyptian");
  const [aiProvider, setAiProvider] = useState<"openai" | "openrouter">("openrouter");
  const [aiBaseUrl, setAiBaseUrl] = useState("https://openrouter.ai/api/v1");
  const [aiModel, setAiModel] = useState("openrouter/auto");
  const [importedModels, setImportedModels] = useState<string[]>([]);
  const [importingModels, setImportingModels] = useState(false);

  // Accounts & Categories
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // New account modal / form
  const [newAccName, setNewAccName] = useState("");
  const [newAccBalance, setNewAccBalance] = useState("");

  // New category form
  const [newCatName, setNewCatName] = useState("");
  const [newCatType, setNewCatType] = useState<"expense" | "income">("expense");

  // Apply finance data from API to state
  function applyFinanceData(data: { accounts?: Account[]; categories?: Category[]; settings?: Record<string, string> }) {
    setAccounts(data.accounts || []);
    setCategories(data.categories || []);

    const s = data.settings || {};
    if (s.monthly_salary) setSalary(s.monthly_salary);
    if (s.maintenance_shop_cut) setShopCut(s.maintenance_shop_cut);
    if (s.maintenance_user_cut) setUserCut(s.maintenance_user_cut);
    if (s.currency_symbol) setCurrency(s.currency_symbol);
    if (s.current_role) setCurrentRole(s.current_role);
    if (s.require_pin) setPinLock(s.require_pin === "true");
    if (s.security_pin) setPinCode(s.security_pin);
    if (s.openai_key) setOpenAiKey(s.openai_key);
    if (s.ai_tone) setAiTone(s.ai_tone);
    if (s.ai_provider === "openai" || s.ai_provider === "openrouter") setAiProvider(s.ai_provider);
    if (s.ai_base_url) setAiBaseUrl(s.ai_base_url);
    if (s.ai_model) setAiModel(s.ai_model);
  }

  // Fetch initial settings & data
  async function loadData() {
    try {
      const res = await fetch("/api/finance");
      if (res.status === 401) {
        router.replace("/landing");
        return;
      }
      if (res.ok) {
        const data = await res.json();
        applyFinanceData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    const initialLoad = async () => {
      try {
        const res = await fetch("/api/finance");
        if (res.status === 401) {
          if (active) router.replace("/landing");
          return;
        }
        if (res.ok && active) {
          const data = await res.json();
          applyFinanceData(data);
        }
      } catch (e) {
        if (active) console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    };
    initialLoad();
    return () => { active = false; };
  }, [router]);

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  }

  // Save setting key/value
  async function handleSaveSetting(key: string, value: string, successMsg?: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_setting", key, value }),
      });
      if (res.ok) {
        notify(successMsg || "تم حفظ الإعداد بنجاح!");
      }
    } catch {
      notify("حدث خطأ أثناء الحفظ", "error");
    } finally {
      setSaving(false);
    }
  }

  // Save all AI provider settings
  async function handleSaveAiSettings() {
    setSaving(true);
    try {
      const pairs: Array<[string, string]> = [
        ["ai_provider", aiProvider],
        ["ai_base_url", aiBaseUrl],
        ["ai_model", aiModel],
      ];
      if (openAiKey.trim()) pairs.push(["ai_api_key", openAiKey.trim()]);
      for (const [key, value] of pairs) {
        const res = await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update_setting", key, value }),
        });
        if (!res.ok) throw new Error("فشل حفظ أحد الإعدادات");
      }
      notify("تم حفظ إعدادات مزود الذكاء الاصطناعي بنجاح!");
    } catch (e) {
      notify(e instanceof Error ? e.message : "حدث خطأ أثناء الحفظ", "error");
    } finally {
      setSaving(false);
    }
  }

  // Import available models from OpenRouter
  async function handleImportModels() {
    setImportingModels(true);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models");
      if (!res.ok) throw new Error("فشل الاتصال بـ OpenRouter");
      const json = await res.json();
      const ids = (json.data || [])
        .map((m: { id?: string }) => m.id)
        .filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
      setImportedModels(ids);
      notify(`تم استيراد ${ids.length} موديل من OpenRouter!`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "فشل استيراد الموديلات", "error");
    } finally {
      setImportingModels(false);
    }
  }

  // Account creation
  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newAccName.trim()) return;

    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_account",
          name: newAccName.trim(),
          openingBalance: parseFloat(newAccBalance) || 0,
        }),
      });
      if (res.ok) {
        setNewAccName("");
        setNewAccBalance("");
        notify("تمت إضافة الحساب بنجاح!");
        loadData();
      }
    } catch {
      notify("فشل إنشاء الحساب", "error");
    }
  }

  // Account deletion
  async function handleDeleteAccount(id: number) {
    if (!confirm("هل أنت متأكد من حذف هذا الحساب؟")) return;
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_account", id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحذف");
      notify("تم حذف الحساب بنجاح");
      loadData();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "فشل الحذف", "error");
    }
  }

  // Category creation
  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_category",
          name: newCatName.trim(),
          type: newCatType,
        }),
      });
      if (res.ok) {
        setNewCatName("");
        notify("تمت إضافة التصنيف بنجاح!");
        loadData();
      }
    } catch {
      notify("فشل إنشاء التصنيف", "error");
    }
  }

  // Category deletion
  async function handleDeleteCategory(id: number) {
    if (!confirm("هل تريد حذف هذا التصنيف؟")) return;
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_category", id }),
      });
      if (res.ok) {
        notify("تم حذف التصنيف");
        loadData();
      }
    } catch {
      notify("فشل الحذف", "error");
    }
  }

  // Backup Export
  async function handleExportBackup() {
    try {
      const res = await fetch("/api/finance?view=backup");
      if (res.ok) {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `finance-backup-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        notify("تم تنزيل النسخة الاحتياطية بنجاح!");
      }
    } catch {
      notify("فشل التصدير", "error");
    }
  }

  // Clear / Reset demo transactions
  async function handleResetData() {
    const confirmation = prompt(
      'تحذير: هذا الإجراء سيقوم بمسح جميع العمليات المالية المسجلة.\nللتأكيد اكتب كلمة: "تأكيد"'
    );
    if (confirmation !== "تأكيد") {
      notify("تم إلغاء تصفير البيانات", "error");
      return;
    }

    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_data" }),
      });
      if (res.ok) {
        notify("تم تصفير جميع العمليات بنجاح!");
        loadData();
      }
    } catch {
      notify("فشل التصفير", "error");
    }
  }

  // Check Supabase status
  async function checkSupabase() {
    setCheckingSupabase(true);
    try {
      const res = await fetch("/api/supabase");
      const json = await res.json();
      setSupabaseStatus(json);
      if (json.connected) {
        notify("تم التحقق: الاتصال بقاعدة بيانات Supabase يعمل بشكل ممتاز!");
      } else if (json.configured) {
        notify(json.error || "يحتاج تشغيل ملف SQL في Supabase", "error");
      }
    } catch {
      notify("تعذر فحص اتصال Supabase", "error");
    } finally {
      setCheckingSupabase(false);
    }
  }

  // Migrate SQLite data to Supabase
  async function handleMigrateToSupabase() {
    if (!confirm("هل تريد ترحيل جميع بياناتك من SQLite إلى Supabase السحابية الآن؟")) return;
    setMigratingSupabase(true);
    try {
      const res = await fetch("/api/supabase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "migrate_to_supabase" }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        notify(json.message);
        checkSupabase();
      } else {
        notify(json.error || "فشل ترحيل البيانات", "error");
      }
    } catch {
      notify("فشل الاتصال بـ Supabase", "error");
    } finally {
      setMigratingSupabase(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-sm">جاري تحميل إعدادات النظام...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-blue-400" />
            <span>إعدادات النظام والصلاحيات</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            تحكم كامل في كل كبيرة وصغيرة: الصلاحيات، الحسابات، النسب والعمولات
          </p>
        </div>

        {message && (
          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-bold animate-in fade-in duration-200 ${
              message.type === "success"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        {[
          { id: "roles", label: "الأدوار والصلاحيات", icon: Shield },
          { id: "finance", label: "الرواتب والعمولات", icon: Coins },
          { id: "accounts", label: "إدارة الحسابات", icon: Wallet },
          { id: "categories", label: "التصنيفات", icon: Tags },
          { id: "ai", label: "المساعد الذكي", icon: Bot },
          { id: "supabase", label: "سحابة Supabase", icon: Cloud },
          { id: "backup", label: "النسخ الاحتياطي", icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ROLES & PERMISSIONS */}
      {activeTab === "roles" && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-400" />
              الأدوار وصلاحيات الوصول للنظام (Roles & Access Control)
            </h2>
            <p className="text-xs text-slate-400">
              حدد الدور النشط للنظام للتحكم في ما يمكن للواجهة عرضه أو تنفيذه
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {/* Role 1: Owner / Admin */}
              <div
                onClick={() => {
                  setCurrentRole("admin");
                  handleSaveSetting("current_role", "admin", "تم تفعيل دور: المدير المالي الكامل");
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  currentRole === "admin"
                    ? "bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-600/10"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-extrabold text-white">👑 المدير المالي (Owner)</span>
                  {currentRole === "admin" && <Check className="w-4 h-4 text-blue-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  كامل الصلاحيات بلا قيود: تسجيل المعاملات، تعديلها، حذفها، تغيير قواعد العمولات والرواتب، والتحكم بالحسابات.
                </p>
              </div>

              {/* Role 2: Data Entry */}
              <div
                onClick={() => {
                  setCurrentRole("entry");
                  handleSaveSetting("current_role", "entry", "تم تفعيل دور: مدخل بيانات فقط");
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  currentRole === "entry"
                    ? "bg-amber-600/15 border-amber-500 text-white shadow-lg shadow-amber-600/10"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-extrabold text-white">✍️ مدخل بيانات (Data Entry)</span>
                  {currentRole === "entry" && <Check className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  صلاحية تسجيل المصروفات والدخل اليومي فقط. يتم تقييد حذف العمليات وتعديل الإعدادات الأساسية.
                </p>
              </div>

              {/* Role 3: Viewer / Audit */}
              <div
                onClick={() => {
                  setCurrentRole("viewer");
                  handleSaveSetting("current_role", "viewer", "تم تفعيل دور: مستعرض الحسابات");
                }}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  currentRole === "viewer"
                    ? "bg-emerald-600/15 border-emerald-500 text-white shadow-lg shadow-emerald-600/10"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-extrabold text-white">👁️ مراجع / مشاهد (Viewer)</span>
                  {currentRole === "viewer" && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  عرض الأرصدة والتقارير والشريط الزمني فقط دون إمكانية إضافة أو تعديل أي معاملات مالية.
                </p>
              </div>
            </div>
          </div>

          {/* PIN Lock Protection */}
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-400" />
              حماية الخصوصية برقم سري (PIN Lock)
            </h2>
            <p className="text-xs text-slate-400">
              قفل التطبيق برقم سري مكون من 4 أرقام عند فتحه لمنع المتطفلين من رؤية أرصدتك
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-3">
                <input
                  type="password"
                  maxLength={4}
                  placeholder="مثال: 1234"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="w-32 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-center text-lg font-bold tracking-widest text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => {
                    handleSaveSetting("security_pin", pinCode);
                    handleSaveSetting("require_pin", "true", "تم تفعيل القفل برقم سري بنجاح!");
                    setPinLock(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20"
                >
                  حفظ وتفعيل القفل
                </button>
              </div>

              {pinLock && (
                <button
                  onClick={() => {
                    handleSaveSetting("require_pin", "false", "تم تعطيل القفل");
                    setPinLock(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/20"
                >
                  تعطيل القفل
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SALARY & MAINTENANCE RULES */}
      {activeTab === "finance" && (
        <div className="glass-card p-6 rounded-3xl space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-400" />
            إعدادات الراتب وقواعد حساب العمولات والنسب
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Monthly Salary */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                المرتب الشهري الافتراضي
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="w-full text-xl font-bold px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  ج.م / شهر
                </span>
              </div>
              <button
                onClick={() => handleSaveSetting("monthly_salary", salary, "تم تحديث المرتب الافتراضي")}
                className="w-full py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-600/30 transition-all cursor-pointer"
              >
                تحديث قيمة المرتب
              </button>
            </div>

            {/* Currency Symbol */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                رمز العملة المعروض
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-xl font-bold px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={() => handleSaveSetting("currency_symbol", currency, "تم تحديث رمز العملة")}
                className="w-full py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-600/30 transition-all cursor-pointer"
              >
                حفظ رمز العملة
              </button>
            </div>
          </div>

          {/* General Commission Settings */}
          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-4">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              قواعد حساب العمولة والنسب التلقائية
            </h3>
            <p className="text-xs text-slate-400">
              القاعدة المعتمدة: (المبلغ الإجمالي − نسبة خصم المكان / المحل / الشريك) × نسبة نصيبك المستحق
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  نسبة خصم المكان / المحل / الشريك (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={shopCut}
                    onChange={(e) => setShopCut(e.target.value)}
                    className="w-full font-bold px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    %
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  نسبة نصيبك من صافي المبلغ (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={userCut}
                    onChange={(e) => setUserCut(e.target.value)}
                    className="w-full font-bold px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                    %
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                handleSaveSetting("maintenance_shop_cut", shopCut);
                handleSaveSetting("maintenance_user_cut", userCut, "تم حفظ قواعد ونسب العمولة الجديدة");
              }}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              حفظ وتطبيق قواعد العمولة الجديدة
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: ACCOUNTS MANAGEMENT */}
      {activeTab === "accounts" && (
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-sky-400" />
              الحسابات المالية الحالية ({accounts.length})
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between"
                >
                  <div>
                    <span className="text-sm font-bold text-white block">{acc.name}</span>
                    <span className="text-xs text-slate-400">
                      الرصيد الحالي: {formatEgp(acc.balance)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Disallow deleting core accounts */}
                    {!["الكاش", "البنك", "فودافون كاش"].includes(acc.name) && (
                      <button
                        onClick={() => handleDeleteAccount(acc.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="حذف الحساب"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add new account form */}
            <form onSubmit={handleCreateAccount} className="pt-4 border-t border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-400" />
                إضافة حساب أو محفظة جديدة (مثلاً: InstaPay، بنك مصر، اتصالات كاش...)
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="اسم الحساب الجديد (مثال: محفظة انستاباي)"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
                <input
                  type="number"
                  placeholder="رصيد افتتاحي (اختياري)"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                  className="px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all"
              >
                + حفظ الحساب الجديد
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: CATEGORIES MANAGEMENT */}
      {activeTab === "categories" && (
        <div className="glass-card p-6 rounded-3xl space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Tags className="w-5 h-5 text-purple-400" />
            إدارة تصنيفات المصروفات والإيرادات
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expense Categories */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-rose-400 block pb-1 border-b border-rose-500/20">
                تصنيفات المصروفات
              </span>
              <div className="flex flex-wrap gap-2">
                {categories
                  .filter((c) => c.type === "expense")
                  .map((cat) => (
                    <div
                      key={cat.id}
                      className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 text-xs flex items-center gap-2"
                    >
                      <span>{cat.name}</span>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Income Categories */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-emerald-400 block pb-1 border-b border-emerald-500/20">
                تصنيفات الإيرادات
              </span>
              <div className="flex flex-wrap gap-2">
                {categories
                  .filter((c) => c.type === "income")
                  .map((cat) => (
                    <div
                      key={cat.id}
                      className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 text-xs flex items-center gap-2"
                    >
                      <span>{cat.name}</span>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Add Category Form */}
          <form onSubmit={handleCreateCategory} className="pt-4 border-t border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-300">إضافة تصنيف جديد</h3>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                required
                placeholder="اسم التصنيف (مثال: صيانة سيارة، فواتير كهربا...)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
              />
              <select
                value={newCatType}
                onChange={(e) => setNewCatType(e.target.value as "expense" | "income")}
                className="w-full sm:w-40 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="expense">مصروف</option>
                <option value="income">دخل</option>
              </select>
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs whitespace-nowrap shadow-md shadow-purple-600/20"
              >
                + إضافة التصنيف
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: AI SETTINGS */}
      {activeTab === "ai" && (
        <div className="glass-card p-6 rounded-3xl space-y-5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-indigo-400" />
            إعدادات الذكاء الاصطناعي والمحادثة
          </h2>

          {/* Provider Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              مزود الذكاء الاصطناعي (Provider)
            </label>
            <div className="grid grid-cols-2 gap-2 max-w-md">
              {[
                { id: "openrouter", label: "راوتر OpenRouter", desc: "OpenRouter.ai" },
                { id: "openai", label: "أوبن إيه آي OpenAI", desc: "OpenAI" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setAiProvider(p.id as "openai" | "openrouter");
                    setAiBaseUrl(
                      p.id === "openrouter"
                        ? "https://openrouter.ai/api/v1"
                        : "https://api.openai.com/v1"
                    );
                    setAiModel(
                      p.id === "openrouter" ? "openrouter/auto" : "gpt-4o-mini"
                    );
                  }}
                  className={`p-3 rounded-xl border text-start transition-all ${
                    aiProvider === p.id
                      ? "bg-indigo-600/20 border-indigo-500 text-white"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <span className="block text-sm font-extrabold">{p.label}</span>
                  <span className="block text-[11px] opacity-70 mt-0.5">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              مفتاح API Key (اختياري)
            </label>
            <p className="text-[11px] text-slate-400 mb-2">
              {aiProvider === "openrouter"
                ? "انسخ مفتاحك من openrouter.ai/keys (تنسيق sk-or-...). المساعد يعمل محلياً حتى بدون المفتاح."
                : "المساعد المالي يعمل بكفاءة محلياً حتى بدون المفتاح. لو أردت ذكاء متقدم، ضع مفتاحك هنا."}
            </p>
            <input
              type="password"
              placeholder={aiProvider === "openrouter" ? "sk-or-..." : "sk-proj-..."}
              value={openAiKey}
              onChange={(e) => setOpenAiKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              رابط الإصدار API (Base URL)
            </label>
            <input
              type="text"
              value={aiBaseUrl}
              onChange={(e) => setAiBaseUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Model */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              اسم الموديل (Model)
            </label>
            <input
              type="text"
              list="ai-model-list"
              placeholder="اكتب اسم الموديل يدوياً أو اختر من القائمة..."
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
            />
            <datalist id="ai-model-list">
              {(importedModels.length > 0
                ? importedModels
                : [
                    "openrouter/auto",
                    "openai/gpt-4o-mini",
                    "openai/gpt-4o",
                    "anthropic/claude-3.5-sonnet",
                    "google/gemini-flash-1.5",
                    "meta-llama/llama-3.3-70b-instruct",
                  ]
              ).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <p className="text-[11px] text-slate-400 mt-1.5">
              ممكن تكتب اسم الموديل يدوياً (مثلاً: openai/gpt-4o-mini) أو تستورد كل الموديلات المتاحة من OpenRouter بالزر ده.
            </p>
            <button
              onClick={handleImportModels}
              disabled={importingModels}
              className="mt-2 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition"
            >
              {importingModels ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {importingModels ? "جاري الاستيراد..." : "استيراد كل موديلات OpenRouter"}
            </button>
            {importedModels.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {importedModels.map((m) => (
                  <button
                    key={m}
                    onClick={() => setAiModel(m)}
                    className={`text-[10px] px-2 py-1 rounded-lg border transition ${
                      aiModel === m
                        ? "bg-indigo-600/30 border-indigo-500 text-indigo-200"
                        : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800">
            <label className="block text-xs font-bold text-slate-300 mb-2">
              أسلوب رد المساعد
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "egyptian", label: "🇪🇬 عامية مصرية ودودة" },
                { id: "formal", label: "📜 فصحى رسمية" },
                { id: "brief", label: "⚡ أرقام مباشرة ومختصرة" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setAiTone(t.id);
                    handleSaveSetting("ai_tone", t.id, `تم ضبط الأسلوب: ${t.label}`);
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                    aiTone === t.id
                      ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSaveAiSettings}
            disabled={saving}
            className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition"
          >
            <Check className="w-4 h-4" />
            حفظ إعدادات الذكاء الاصطناعي
          </button>
        </div>
      )}

      {/* TAB 6: BACKUP & DATA RESET */}
      {activeTab === "backup" && (
        <div className="glass-card p-6 rounded-3xl space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-400" />
            النسخ الاحتياطي وإدارة البيانات
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Export */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                تصدير نسخة احتياطية كاملة (JSON)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                حمّل ملف يحتوي على كل الحسابات، العمليات المالية، التصنيفات، والإعدادات الخاصة بك للاحتفاظ بها.
              </p>
              <button
                onClick={handleExportBackup}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
              >
                تنزيل النسخة الاحتياطية الآن
              </button>
            </div>

            {/* Clear Data */}
            <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-3">
              <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                تصفير بيانات العمليات (Reset)
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                حذف كل المعاملات المالية المسجلة للبدء بسجل نظيف، مع الحفاظ على الحسابات والإعدادات.
              </p>
              <button
                onClick={handleResetData}
                className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all"
              >
                تصفير العمليات بالكامل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: SUPABASE CLOUD DATABASE */}
      {activeTab === "supabase" && (
        <div className="glass-card p-6 rounded-3xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Cloud className="w-5 h-5 text-emerald-400" />
                ربط وتكامل قاعدة بيانات Supabase السحابية (PostgreSQL)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                توصيل النظام بقاعدة بيانات سحابية دائمة لضمان بقاء البيانات بعد نشر المشروع على Vercel
              </p>
            </div>

            <button
              onClick={checkSupabase}
              disabled={checkingSupabase}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingSupabase ? "animate-spin" : ""}`} />
              فحص الاتصال بـ Supabase
            </button>
          </div>

          {/* Status Display Card */}
          {supabaseStatus && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2 ${
                supabaseStatus.connected
                  ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                  : supabaseStatus.configured
                  ? "bg-amber-950/20 border-amber-500/40 text-amber-300"
                  : "bg-slate-900 border-slate-800 text-slate-300"
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {supabaseStatus.connected ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                )}
                <span>
                  {supabaseStatus.connected
                    ? "الاتصال نشط وقاعدة البيانات جاهزة للعمل على Vercel و Supabase"
                    : supabaseStatus.configured
                    ? "تم العثور على المفاتيح، ولكن الجداول غير مكتملة"
                    : "المتغيرات غير مضبوطة في البيئة (.env)"}
                </span>
              </div>
              <p className="text-[11px] opacity-90">{supabaseStatus.message || supabaseStatus.error}</p>
              {supabaseStatus.hint && (
                <p className="text-[11px] font-semibold text-amber-400">💡 {supabaseStatus.hint}</p>
              )}
            </div>
          )}

          {/* Setup Steps */}
          <div className="space-y-4 text-xs">
            <h3 className="font-bold text-slate-200">خطوات تشغيل وربط Supabase مع Vercel في 3 خطوات:</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Step 1 */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-black text-xs flex items-center justify-center border border-blue-500/30">
                  1
                </span>
                <h4 className="font-bold text-white">إنشاء مشروع Supabase</h4>
                <p className="text-[11px] text-slate-400">
                  افتح موقع supabase.com وأنشئ مشروع جديد مجاني، ثم انسخ رابط المشروع والمفتاح العام (anon key).
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-black text-xs flex items-center justify-center border border-indigo-500/30">
                  2
                </span>
                <h4 className="font-bold text-white">تشغيل ملف SQL</h4>
                <p className="text-[11px] text-slate-400">
                  في Supabase افتح SQL Editor والصق محتوى ملف <code>supabase_schema.sql</code> الموجود بمشروعك واضغط Run.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center border border-emerald-500/30">
                  3
                </span>
                <h4 className="font-bold text-white">إضافة المتغيرات في Vercel</h4>
                <p className="text-[11px] text-slate-400">
                  في إعدادات مشروعك على Vercel (Environment Variables) أضف المتغيرين:
                  <br />
                  <code className="text-blue-400">NEXT_PUBLIC_SUPABASE_URL</code>
                  <br />
                  <code className="text-blue-400">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>
                </p>
              </div>
            </div>
          </div>

          {/* Action: 1-Click Migration */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/20 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <Cloud className="w-4 h-4" />
                  ترحيل ونقل جميع البيانات المحلية إلى Supabase
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  يقوم بنسخ ونقل جميع الحسابات والمعاملات والأهداف والجمعيات المسجلة حالياً إلى قاعدة Supabase بضغطة واحدة
                </p>
              </div>

              <button
                onClick={handleMigrateToSupabase}
                disabled={migratingSupabase}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 self-start sm:self-auto"
              >
                {migratingSupabase ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    جاري نقل البيانات...
                  </>
                ) : (
                  <>
                    <Cloud className="w-3.5 h-3.5" />
                    ترحيل البيانات الآن 🚀
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
