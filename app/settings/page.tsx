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
  Server,
  Bell,
} from "lucide-react";
import { formatEgp, Account } from "@/lib/types";
import { AI_PROVIDERS } from "@/lib/providers";
import FinancialGoalCard from "@/components/FinancialGoalCard";
import GoogleAuthButton, { GoogleIcon } from "@/components/GoogleAuthButton";
import PushToggle from "@/components/PushToggle";
import ProvidersTab from "@/components/ProvidersTab";

interface Category {
  id: number;
  name: string;
  type: "expense" | "income";
  icon?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "finance" | "accounts" | "categories" | "ai" | "providers" | "personal"
  >("finance");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Financial Settings
  const [salary, setSalary] = useState("12000");
  const [shopCut, setShopCut] = useState("10");
  const [userCut, setUserCut] = useState("50");
  const [currency, setCurrency] = useState("ج.م");

  // AI Settings (summary — provider editing lives in the Providers tab)
  const [aiTone, setAiTone] = useState("egyptian");
  const [aiProvider, setAiProvider] = useState<string>("openrouter");
  const [fallbacks, setFallbacks] = useState<
    Array<{ provider: string; baseUrl: string; apiKey: string; model: string }>
  >([]);

  // Assistant persona (admin-wide): name + custom instructions
  const [assistantName, setAssistantName] = useState("صحبي");
  const [assistantPersona, setAssistantPersona] = useState("");

  // Knowledge base (admin): docs list + upload form
  const [knowledgeDocs, setKnowledgeDocs] = useState<
    Array<{ id: number; title: string; source: string | null; chunks_count?: number; created_at: string }>
  >([]);
  const [newKbTitle, setNewKbTitle] = useState("");
  const [newKbContent, setNewKbContent] = useState("");
  const [kbSaving, setKbSaving] = useState(false);

  // Per-user memory notes (what the assistant knows about THIS user)
  const [memoryNotes, setMemoryNotes] = useState("");
  const [memorySaving, setMemorySaving] = useState(false);

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
    if (s.ai_tone) setAiTone(s.ai_tone);
    if (s.ai_provider) setAiProvider(s.ai_provider);
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
    if (s.assistant_name) setAssistantName(s.assistant_name);
    if (s.assistant_persona !== undefined) setAssistantPersona(s.assistant_persona);
    if (s.assistant_memory !== undefined) setMemoryNotes(s.assistant_memory);
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

  // Refresh the AI summary (primary + chain) whenever its tab opens
  useEffect(() => {
    if (activeTab !== "ai") return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/finance");
        if (res.ok && active) {
          const data = await res.json();
          const s: Record<string, string> = data.settings || {};
          if (s.ai_provider && active) setAiProvider(s.ai_provider);
          if (s.ai_fallbacks && active) {
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
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [activeTab]);

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

  // Load knowledge base docs (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/knowledge");
        if (res.ok && active) {
          const data = await res.json();
          if (active) setKnowledgeDocs(data.docs || []);
        }
      } catch {
        // ignore
      }
    })();
    return () => { active = false; };
  }, [isAdmin]);

  // Knowledge base (admin): save a doc + delete
  async function handleSaveKnowledgeDoc() {
    if (!newKbTitle.trim() || !newKbContent.trim()) {
      notify("العنوان والمحتوى مطلوبان", "error");
      return;
    }
    setKbSaving(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newKbTitle.trim(), content: newKbContent.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الحفظ");
      notify(`تم حفظ المستند في قاعدة المعرفة (${data.chunksCount} مقطع) — المساعد يستخدمه تلقائياً!`);
      setNewKbTitle("");
      setNewKbContent("");
      const refresh = await fetch("/api/knowledge");
      if (refresh.ok) {
        const fresh = await refresh.json();
        setKnowledgeDocs(fresh.docs || []);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "فشل الحفظ", "error");
    } finally {
      setKbSaving(false);
    }
  }

  async function handleDeleteKnowledgeDoc(id: number) {
    if (!confirm("هل تريد حذف هذا المستند من قاعدة المعرفة؟")) return;
    try {
      const res = await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل الحذف");
      notify("تم حذف المستند");
      setKnowledgeDocs((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      notify(err instanceof Error ? err.message : "فشل الحذف", "error");
    }
  }

  // Save the user's memory notes (per-user, assistant remembers forever)
  async function handleSaveMemoryNotes() {
    setMemorySaving(true);
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_setting",
          key: "assistant_memory",
          value: memoryNotes.trim(),
        }),
      });
      if (res.ok) {
        notify("تم حفظ ذاكرة المساعد — هيفتكر اللي كتبته دايماً!");
      } else {
        notify("حدث خطأ أثناء الحفظ", "error");
      }
    } catch {
      notify("حدث خطأ أثناء الحفظ", "error");
    } finally {
      setMemorySaving(false);
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
          ...(isAdmin
            ? [
                { id: "ai", label: "المساعد الذكي", icon: Bot },
                { id: "providers", label: "المزودين", icon: Server },
              ]
            : []),
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

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black text-white shrink-0"
                style={{ backgroundColor: AI_PROVIDERS.find((x) => x.id === aiProvider)?.color || "#6B7FE7" }}
              >
                {AI_PROVIDERS.find((x) => x.id === aiProvider)?.letter || "?"}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-white block">
                  المزود الأساسي: {AI_PROVIDERS.find((x) => x.id === aiProvider)?.label || aiProvider}
                </span>
                <span className="text-[11px] text-slate-400">
                  {fallbacks.length > 0
                    ? `في السلسلة: ${fallbacks.length} — ${fallbacks
                        .map((f) => AI_PROVIDERS.find((x) => x.id === f.provider)?.label || f.provider)
                        .join(" · ")}`
                    : "مفيش مزودات احتياطية في السلسلة"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("providers")}
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer shrink-0"
            >
              إدارة المزودين ↗
            </button>
          </div>

          {/* Assistant Persona */}
          <details className="pt-2 border-t border-slate-800">
            <summary className="cursor-pointer select-none py-2.5 px-1 text-sm font-bold text-white flex items-center gap-2">
              <Bot className="w-4 h-4 text-sky-400" />
              شخصية المساعد (Persona)
              <span className="text-[10px] text-slate-500 font-normal mr-auto">(اضغط للفتح)</span>
            </summary>
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 mt-2">
              <p className="text-[11px] text-slate-400">
                اسم المساعد وتعليماته المخصصة — تنطبق على كل العملاء (تُحقن في رسائل المساعد تلقائياً).
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">اسم المساعد</label>
                <input
                  type="text"
                  value={assistantName}
                  onChange={(e) => setAssistantName(e.target.value)}
                  placeholder="صحبي"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  تعليمات مخصصة (شخصية وأسلوب وتخصصات)
                </label>
                <textarea
                  value={assistantPersona}
                  onChange={(e) => setAssistantPersona(e.target.value)}
                  placeholder="مثال: المساعد اسمه «صحبي» ويتكلم مصري بجدية في الأرقام ودودة في الكلام. متخصص في إدارة المرتب والعمولات. دايماً يقترح توفير 20% من المرتب..."
                  rows={5}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-sky-500 resize-y"
                />
              </div>
              <button
                onClick={() => {
                  handleSaveSetting("assistant_name", assistantName.trim() || "صحبي");
                  handleSaveSetting("assistant_persona", assistantPersona.trim(), "تم حفظ شخصية المساعد — تنطبق على كل العملاء");
                }}
                disabled={saving}
                className="py-2 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer"
              >
                حفظ شخصية المساعد
              </button>
            </div>
          </details>

          {/* Knowledge Base (RAG) */}
          <details className="pt-2 border-t border-slate-800">
            <summary className="cursor-pointer select-none py-2.5 px-1 text-sm font-bold text-white flex items-center gap-2">
              <Tags className="w-4 h-4 text-purple-400" />
              قاعدة المعرفة (RAG)
              {knowledgeDocs.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px]">{knowledgeDocs.length}</span>
              )}
              <span className="text-[10px] text-slate-500 font-normal mr-auto">(اضغط للفتح)</span>
            </summary>
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 mt-2">
              <div>
                <p className="text-[11px] text-slate-400 mt-1">
                  ارفع قواعد ونصائح ومعلومات (قواعد مالية مصرية، شروط الخدمة، أسئلة شائعة...) — المساعد يسترجع المناسب تلقائياً مع كل سؤال.
                </p>
              </div>

              {knowledgeDocs.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 block">
                    المستندات ({knowledgeDocs.length})
                  </span>
                  {knowledgeDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block">{doc.title}</span>
                        <span className="text-[10px] text-slate-500">
                          {doc.chunks_count ?? 0} مقطع · {new Date(doc.created_at).toLocaleDateString("ar-EG")}
                          {doc.source ? ` · ${doc.source}` : ""}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteKnowledgeDoc(doc.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                        title="حذف المستند"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-slate-300 block">إضافة مستند جديد</span>
                <input
                  type="text"
                  placeholder="عنوان المستند (مثال: قواعد العمولة في الجمعيات)"
                  value={newKbTitle}
                  onChange={(e) => setNewKbTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500"
                />
                <textarea
                  placeholder="المحتوى — اكتب أو الصق النص هنا (تُقسم لمقاطع تلقائياً)..."
                  value={newKbContent}
                  onChange={(e) => setNewKbContent(e.target.value)}
                  rows={6}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-purple-500 resize-y"
                />
                <button
                  onClick={handleSaveKnowledgeDoc}
                  disabled={kbSaving}
                  className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                >
                  {kbSaving ? "جارٍ الحفظ..." : "+ حفظ في قاعدة المعرفة"}
                </button>
              </div>
            </div>
          </details>

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
        </div>
      )}

      {activeTab === "providers" && isAdmin && <ProvidersTab notify={notify} />}

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

              {/* Assistant memory notes (per-user) */}
              <div className="pt-4 border-t border-slate-800">
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Bot className="w-4 h-4 text-indigo-400" />
                    ذاكرة المساعد عني
                  </h3>
                  <p className="text-xs text-slate-400">
                    اكتب أي حاجة عاوز المساعد يفتكرها عنك دايماً (مرتبي أول الشهر، بشرب قهوة الصبح، أهدافي...) — تُحقن في رسائله تلقائياً مع كل سؤال.
                  </p>
                  <textarea
                    value={memoryNotes}
                    onChange={(e) => setMemoryNotes(e.target.value)}
                    rows={4}
                    placeholder="مثال: مرتبي بيوصل أول الشهر 15 ألف. بشرب قهوة يومياً بـ 30 جنيه. بهوول على توفير 50 ألف لجهاز..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 resize-y"
                  />
                  <button
                    onClick={handleSaveMemoryNotes}
                    disabled={memorySaving}
                    className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    {memorySaving ? "جارٍ الحفظ..." : "حفظ ذاكرة المساعد"}
                  </button>
                </div>
              </div>

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
