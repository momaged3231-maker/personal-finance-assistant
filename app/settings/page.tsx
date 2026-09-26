"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Settings as SettingsIcon,
  Coins,
  Wallet,
  Tags,
  Bot,
  User,
  Check,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  Calculator,
  RefreshCw,
  CheckCircle2,
  Zap,
  Bell,
} from "lucide-react";
import { formatEgp, Account } from "@/lib/types";
import FinancialGoalCard from "@/components/FinancialGoalCard";
import GoogleAuthButton, { GoogleIcon } from "@/components/GoogleAuthButton";
import PushToggle from "@/components/PushToggle";

interface Category {
  id: number;
  name: string;
  type: "expense" | "income";
  icon?: string;
}

// Fully-free AI providers (OpenAI-compatible endpoints) + OpenAI as the paid option.
// Source: github.com/ShaikhWarsi/free-ai-tools#fully-free-providers
const AI_PROVIDERS: Array<{
  id: string;
  label: string;
  desc: string;
  baseUrl: string;
  model: string;
  keyHint: string;
  placeholder: string;
}> = [
  {
    id: "openrouter",
    label: "OpenRouter",
    desc: "29 موديل مجاني — الأشهر والأوسع",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    keyHint: "انسخ مفتاحك من openrouter.ai/keys (تنسيق sk-or-...). الموديلات المجانية تعمل حتى بدون مفتاح.",
    placeholder: "sk-or-...",
  },
  {
    id: "groq",
    label: "Groq",
    desc: "الأسرع — حتى 14.4K طلب/يوم",
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
    keyHint: "أنشئ مفتاحك من console.groq.com/keys (مجاني، بدون بطاقة).",
    placeholder: "gsk_...",
  },
  {
    id: "google",
    label: "Google AI Studio",
    desc: "Gemini — حتى 1,500 طلب/يوم",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-2.0-flash",
    keyHint: "أنشئ مفتاحك من aistudio.google.com/apikey (مجاني، بدون بطاقة).",
    placeholder: "AIza...",
  },
  {
    id: "nvidia",
    label: "NVIDIA NIM",
    desc: "46+ موديل — 40 طلب/دقيقة",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    model: "meta/llama-3.3-70b-instruct",
    keyHint: "أنشئ مفتاحك من build.nvidia.com (يتطلب تحقق برقم الهاتف).",
    placeholder: "nvapi-...",
  },
  {
    id: "mistral",
    label: "Mistral",
    desc: "1B توكن/شهر مجاناً",
    baseUrl: "https://api.mistral.ai/v1",
    model: "mistral-small-latest",
    keyHint: "أنشئ مفتاحك من console.mistral.ai (يتطلب موافقة على تدريب البيانات).",
    placeholder: "مفتاحك...",
  },
  {
    id: "cerebras",
    label: "Cerebras",
    desc: "الأسرع عالمياً — 1M توكن/يوم",
    baseUrl: "https://api.cerebras.ai/v1",
    model: "llama-3.3-70b",
    keyHint: "أنشئ مفتاحك من cloud.cerebras.ai (مجاني، بدون بطاقة).",
    placeholder: "csk-...",
  },
  {
    id: "zai",
    label: "ZAI (GLM)",
    desc: "GLM-4.7-Flash مجاني — 200K سياق",
    baseUrl: "https://api.z.ai/api/paas/v4",
    model: "glm-4.7-flash",
    keyHint: "أنشئ مفتاحك من z.ai (ZAI_API_KEY — حصة مجانية كريمة).",
    placeholder: "مفتاحك...",
  },
  {
    id: "siliconflow",
    label: "SiliconFlow",
    desc: "1K RPM — موديلات Qwen",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "Qwen/Qwen2.5-7B-Instruct",
    keyHint: "أنشئ مفتاحك من cloud.siliconflow.cn (مجاني).",
    placeholder: "sk-...",
  },
  {
    id: "deepinfra",
    label: "DeepInfra",
    desc: "200 طلب متوازٍ مجاناً",
    baseUrl: "https://api.deepinfra.com/v1/openai",
    model: "meta-llama/Llama-3.3-70B-Instruct",
    keyHint: "أنشئ مفتاحك من deepinfra.com (مجاني).",
    placeholder: "مفتاحك...",
  },
  {
    id: "openai",
    label: "OpenAI",
    desc: "المدفوع — GPT-4o/5",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    keyHint: "انسخ مفتاحك من platform.openai.com/api-keys (يتطلب رصيد).",
    placeholder: "sk-proj-...",
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "finance" | "accounts" | "categories" | "ai" | "personal"
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
  const [aiProvider, setAiProvider] = useState<string>("openrouter");
  const [aiBaseUrl, setAiBaseUrl] = useState("https://openrouter.ai/api/v1");
  const [aiModel, setAiModel] = useState("openrouter/auto");
  const [importedModels, setImportedModels] = useState<string[]>([]);
  const [importingModels, setImportingModels] = useState(false);
  // Fallback assistants: when the primary provider's credits run out, the
  // assistant tries these in order (stored as JSON in ai_fallbacks).
  const [fallbacks, setFallbacks] = useState<
    Array<{ provider: string; baseUrl: string; apiKey: string; model: string }>
  >([]);
  const [newFbProvider, setNewFbProvider] = useState("groq");
  const [newFbKey, setNewFbKey] = useState("");
  const [newFbModel, setNewFbModel] = useState("");
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

  // Personal info
  const [personalInfo, setPersonalInfo] = useState<{
    name: string;
    email: string;
    phone: string;
    plan: string;
    status: string;
    created_at: string;
  } | null>(null);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [personalSaving, setPersonalSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
    if (s.ai_provider) setAiProvider(s.ai_provider);
    if (s.ai_base_url) setAiBaseUrl(s.ai_base_url);
    if (s.ai_model) setAiModel(s.ai_model);
    if (s.ai_fallbacks) {
      try {
        const parsed = JSON.parse(s.ai_fallbacks) as Array<{
          provider: string;
          baseUrl: string;
          apiKey: string;
          model: string;
        }>;
        if (Array.isArray(parsed)) setFallbacks(parsed.filter((f) => f && f.provider && f.baseUrl));
      } catch {
        // ignore malformed
      }
    }
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

  // Load personal info + Google linkage + admin flag
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [personalRes, authRes] = await Promise.all([
          fetch("/api/personal"),
          fetch("/api/auth"),
        ]);
        if (active && authRes.ok) {
          const authData = await authRes.json();
          if (active) setIsAdmin(Boolean(authData.user?.is_admin));
        }
        if (active && personalRes.ok) {
          const data = await personalRes.json();
          if (active) {
            setPersonalInfo({
              name: data.user?.name || "",
              email: data.user?.email || "",
              phone: data.user?.phone || "",
              plan: data.user?.plan || "",
              status: data.user?.status || "",
              created_at: data.user?.created_at || "",
            });
            setGoogleLinked(Boolean(data.googleLinked));
          }
        }
      } catch {
        // ignore — tab shows fallback
      }
    })();
    return () => { active = false; };
  }, []);

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

  // Save personal info (name / phone)
  async function handleSavePersonal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const elements = e.currentTarget.elements as HTMLFormControlsCollection;
    const nameInput = elements.namedItem("personal_name") as HTMLInputElement | null;
    const phoneInput = elements.namedItem("personal_phone") as HTMLInputElement | null;
    if (!nameInput?.value.trim()) {
      notify("الاسم مطلوب", "error");
      return;
    }
    setPersonalSaving(true);
    try {
      const res = await fetch("/api/personal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput.value.trim(),
          phone: phoneInput?.value.trim() || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحفظ");
      notify("تم حفظ معلوماتك الشخصية بنجاح!");
      const refresh = await fetch("/api/personal");
      if (refresh.ok) {
        const fresh = await refresh.json();
        setPersonalInfo({
          name: fresh.user?.name || "",
          email: fresh.user?.email || "",
          phone: fresh.user?.phone || "",
          plan: fresh.user?.plan || "",
          status: fresh.user?.status || "",
          created_at: fresh.user?.created_at || "",
        });
        setGoogleLinked(Boolean(fresh.googleLinked));
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "فشل الحفظ", "error");
    } finally {
      setPersonalSaving(false);
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
        ["ai_fallbacks", JSON.stringify(fallbacks)],
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

  // Import available models from the selected provider (OpenAI-compatible /models)
  async function handleImportModels() {
    setImportingModels(true);
    try {
      const headers: Record<string, string> = {};
      if (openAiKey.trim()) headers["Authorization"] = `Bearer ${openAiKey.trim()}`;
      const res = await fetch(`${aiBaseUrl.replace(/\/+$/, "")}/models`, { headers });
      if (!res.ok) throw new Error("فشل الاتصال بالمزود — تأكد من الـ Base URL وأن المفتاح صحيح");
      const json = await res.json();
      const ids = (json.data || [])
        .map((m: { id?: string }) => m.id)
        .filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
      if (ids.length === 0) throw new Error("المزود لم يرجع أي موديلات — تأكد من المفتاح");
      setImportedModels(ids);
      notify(`تم استيراد ${ids.length} موديل من ${aiProvider}! اختر من الصندوق.`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "فشل استيراد الموديلات", "error");
    } finally {
      setImportingModels(false);
    }
  }

  // Fallback assistants (chain): add / remove
  function handleAddFallback() {
    const p = AI_PROVIDERS.find((x) => x.id === newFbProvider);
    if (!p) return;
    if (!newFbKey.trim()) {
      notify("اكتب مفتاح الـ API الخاص بالمساعد الاحتياطي", "error");
      return;
    }
    const model = newFbModel.trim() || p.model;
    if (fallbacks.some((f) => f.apiKey === newFbKey.trim() && f.model === model)) {
      notify("المساعد الاحتياطي ده مضاف بالفعل بنفس المفتاح والموديل", "error");
      return;
    }
    setFallbacks([
      ...fallbacks,
      { provider: p.id, baseUrl: p.baseUrl, apiKey: newFbKey.trim(), model },
    ]);
    setNewFbKey("");
    setNewFbModel("");
    notify(`تم إضافة ${p.label} كمساعد احتياطي — اضغط «حفظ إعدادات الذكاء الاصطناعي» لتثبيته`);
  }

  function handleRemoveFallback(idx: number) {
    setFallbacks(fallbacks.filter((_, i) => i !== idx));
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

      {/* Marketing goal nudge */}
      <FinancialGoalCard />

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-none">
        {[
          { id: "finance", label: "الرواتب والعمولات", icon: Coins },
          { id: "accounts", label: "إدارة الحسابات", icon: Wallet },
          { id: "categories", label: "التصنيفات", icon: Tags },
          // AI provider settings are admin-only
          ...(isAdmin ? [{ id: "ai", label: "المساعد الذكي", icon: Bot }] : []),
          { id: "personal", label: "المعلومات الشخصية", icon: User },
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

          {/* Provider Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2">
              مزود الذكاء الاصطناعي (Provider) — اختر من الكروت
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {AI_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setAiProvider(p.id);
                    setAiBaseUrl(p.baseUrl);
                    setAiModel(p.model);
                  }}
                  className={`p-3.5 rounded-2xl border text-start transition-all cursor-pointer ${
                    aiProvider === p.id
                      ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold">{p.label}</span>
                    {aiProvider === p.id && (
                      <CheckCircle2 className="w-4 h-4 text-indigo-300 shrink-0" />
                    )}
                  </div>
                  <span className="block text-[11px] opacity-70 mt-0.5">{p.desc}</span>
                  <span className="block text-[10px] opacity-50 mt-1 font-mono break-all" dir="ltr">
                    {p.baseUrl}
                  </span>
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
              {AI_PROVIDERS.find((p) => p.id === aiProvider)?.keyHint ||
                "المساعد المالي يعمل بكفاءة محلياً حتى بدون المفتاح."}
            </p>
            <input
              type="password"
              placeholder={AI_PROVIDERS.find((p) => p.id === aiProvider)?.placeholder || "مفتاحك..."}
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
            {importedModels.length > 0 ? (
              <select
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {aiModel && !importedModels.includes(aiModel) && (
                  <option value={aiModel}>{aiModel} (الحالي)</option>
                )}
                {importedModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="اكتب اسم الموديل يدوياً أو استورده بالزر..."
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            )}
            <p className="text-[11px] text-slate-400 mt-1.5">
              اضغط «استيراد الموديلات» لجلب كل الموديلات المتاحة من {aiProvider} — هتظهر في الصندوق فوق واختر بينهم.
            </p>
            <button
              onClick={handleImportModels}
              disabled={importingModels}
              className="mt-2 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              {importingModels ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              {importingModels ? "جاري الاستيراد..." : "استيراد الموديلات"}
            </button>

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

          {/* Fallback Assistants Chain */}
          <div className="pt-2 border-t border-slate-800">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  المساعدون الاحتياطيون (Fallback Chain)
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  لو كريديت المزود الأساسي خلص أو وقف، المساعد يجرب دول تلقائياً بالترتيب — عشان مساعدك ميفضلش شغال دايماً.
                </p>
              </div>

              {fallbacks.length > 0 && (
                <div className="space-y-2">
                  {fallbacks.map((fb, idx) => {
                    const p = AI_PROVIDERS.find((x) => x.id === fb.provider);
                    return (
                      <div
                        key={`${fb.provider}-${fb.model}-${idx}`}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white block">
                            {idx + 1}. {p?.label || fb.provider} — <span className="font-mono text-[10px] text-slate-400" dir="ltr">{fb.model}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono break-all" dir="ltr">
                            {fb.baseUrl} · مفتاح: ••••{fb.apiKey.slice(-4)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveFallback(idx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                          title="حذف المساعد الاحتياطي"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add fallback form */}
              <div className="pt-3 border-t border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-slate-300 block">إضافة مساعد احتياطي جديد</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <select
                    value={newFbProvider}
                    onChange={(e) => {
                      setNewFbProvider(e.target.value);
                      const p = AI_PROVIDERS.find((x) => x.id === e.target.value);
                      if (p) setNewFbModel(p.model);
                    }}
                    className="px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {AI_PROVIDERS.filter((p) => p.id !== aiProvider).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label} — {p.desc}
                      </option>
                    ))}
                  </select>
                  <input
                    type="password"
                    placeholder={`مفتاح ${AI_PROVIDERS.find((p) => p.id === newFbProvider)?.label || ""}...`}
                    value={newFbKey}
                    onChange={(e) => setNewFbKey(e.target.value)}
                    dir="ltr"
                    className="px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="اسم الموديل (اتركه فارغ للافتراضي)"
                  value={newFbModel}
                  onChange={(e) => setNewFbModel(e.target.value)}
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleAddFallback}
                  className="py-2 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-all cursor-pointer"
                >
                  + إضافة للمساعدين الاحتياطيين
                </button>
              </div>
            </div>
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

      {/* TAB 6: PERSONAL INFO */}
      {activeTab === "personal" && (
        <div className="glass-card p-6 rounded-3xl space-y-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-sky-400" />
            معلوماتك الشخصية
          </h2>

          {!personalInfo ? (
            <p className="text-xs text-slate-400">تعذر تحميل المعلومات الشخصية. حاول تحديث الصفحة.</p>
          ) : (
            <>
              {/* Read-only profile data */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">البريد الإلكتروني</span>
                  <span className="text-sm font-bold text-white break-all" dir="ltr">{personalInfo.email}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">الخطة الحالية</span>
                  <span className="text-sm font-bold text-white">{personalInfo.plan}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">حالة الحساب</span>
                  <span className="text-sm font-bold text-emerald-400">{personalInfo.status}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">تاريخ الانضمام</span>
                  <span className="text-sm font-bold text-white" dir="ltr">
                    {personalInfo.created_at
                      ? new Date(personalInfo.created_at).toLocaleDateString("ar-EG")
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Editable form — saved to Supabase */}
              <form
                key={`${personalInfo.name}-${personalInfo.phone}`}
                onSubmit={handleSavePersonal}
                className="pt-4 border-t border-slate-800 space-y-3"
              >
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-sky-400" />
                  تعديل بياناتك (تُحفظ في قواعد البيانات على Supabase)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="personal_name"
                    required
                    defaultValue={personalInfo.name}
                    placeholder="الاسم الكامل"
                    className="px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                  <input
                    type="tel"
                    name="personal_phone"
                    defaultValue={personalInfo.phone}
                    placeholder="رقم الهاتف (اختياري)"
                    dir="ltr"
                    className="px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={personalSaving}
                  className="py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all"
                >
                  {personalSaving ? "جارٍ الحفظ..." : "حفظ المعلومات الشخصية"}
                </button>
              </form>

              {/* Google linkage */}
              <div className="pt-4 border-t border-slate-800">
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <GoogleIcon className="w-4 h-4" />
                    ربط حسابي بجوجل
                  </h3>
                  <p className="text-xs text-slate-400">
                    {googleLinked
                      ? "حسابك مرتبط بجوجل — بياناتك محفوظة ومتزامنة في قواعد البيانات لدينا على Supabase."
                      : "اربط حسابك بجوجل لحفظ بياناتك المعلوماتية والاستفادة من الدخول السريع بنقرة واحدة."}
                  </p>
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold ${
                      googleLinked
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {googleLinked ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    {googleLinked ? "مرتبط بجوجل" : "غير مرتبط بعد"}
                  </div>
                  {!googleLinked && (
                    <div className="max-w-xs pt-1">
                      <GoogleAuthButton mode="login" returnTo="/settings" />
                    </div>
                  )}
                </div>
              </div>

              {/* Push notifications */}
              <div className="pt-4 border-t border-slate-800">
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-sky-400" />
                      إشعارات الفواتير والجمعيات
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      تنبيه يومي على موبايلك لو فيه فاتورة أو قسط جمعية مستحق — من غير فتح التطبيق.
                    </p>
                  </div>
                  <PushToggle />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      </div>
  );
}
