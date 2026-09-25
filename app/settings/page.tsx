"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon,
  Coins,
  Wallet,
  Tags,
  Bot,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Calculator,
  RefreshCw,
  CheckCircle2,
  Zap,
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
    "finance" | "accounts" | "categories" | "ai"
  >("finance");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Financial Settings
  const [salary, setSalary] = useState("12000");
  const [shopCut, setShopCut] = useState("10");
  const [userCut, setUserCut] = useState("50");
  const [currency, setCurrency] = useState("ج.م");

  // AI Settings
  const [openAiKey, setOpenAiKey] = useState("");
  const [aiTone, setAiTone] = useState("egyptian");
  const [aiProvider, setAiProvider] = useState<"openai" | "openrouter">("openrouter");
  const [aiBaseUrl, setAiBaseUrl] = useState("https://openrouter.ai/api/v1");
  const [aiModel, setAiModel] = useState("openrouter/auto");
  const [importedModels, setImportedModels] = useState<string[]>([]);
  const [importingModels, setImportingModels] = useState(false);
  const [testingModel, setTestingModel] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    detail?: string;
  } | null>(null);

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

  // Test the currently typed AI config with a real API call
  async function handleTestModel() {
    if (!openAiKey.trim()) {
      setTestResult({ ok: false, message: "اكتب مفتاح API الأول عشان نقدر نختبر الموديل." });
      return;
    }
    if (!aiModel.trim()) {
      setTestResult({ ok: false, message: "اكتب اسم الموديل الأول." });
      return;
    }

    setTestingModel(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          baseUrl: aiBaseUrl,
          apiKey: openAiKey,
          model: aiModel,
        }),
      });
      const json = await res.json();
      setTestResult({
        ok: Boolean(json.ok),
        message: json.message || "انتهى الاختبار",
        detail: json.detail,
      });
    } catch {
      setTestResult({ ok: false, message: "حصل خطأ أثناء محاولة الاختبار." });
    } finally {
      setTestingModel(false);
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
            <span>إعدادات النظام</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            تحكم كامل في الحسابات، التصنيفات، الرواتب والعمولات، وإعدادات المساعد الذكي
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
          { id: "finance", label: "الرواتب والعمولات", icon: Coins },
          { id: "accounts", label: "إدارة الحسابات", icon: Wallet },
          { id: "categories", label: "التصنيفات", icon: Tags },
          { id: "ai", label: "المساعد الذكي", icon: Bot },
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

      {/* TAB 1: SALARY & MAINTENANCE RULES */}
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

            {/* Test Model Connection */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={handleTestModel}
                disabled={testingModel}
                className="py-2 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 disabled:opacity-50 text-emerald-300 text-xs font-bold flex items-center gap-2 border border-emerald-500/30 transition"
              >
                {testingModel ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : testResult?.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                {testingModel ? "جاري اختبار الاتصال..." : "اختبار الموديل (صحة الاتصال)"}
              </button>
            </div>

            {testResult && (
              <div
                className={`mt-2 px-3.5 py-2.5 rounded-xl border text-xs leading-relaxed ${
                  testResult.ok
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  {testResult.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  )}
                  <div>
                    <p>{testResult.message}</p>
                    {testResult.detail && (
                      <p className="mt-1 font-mono text-[10px] opacity-70 break-all" dir="ltr">
                        {testResult.detail}
                      </p>
                    )}
                  </div>
                </div>
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

      </div>
  );
}
