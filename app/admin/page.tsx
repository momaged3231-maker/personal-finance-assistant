"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  Users,
  CreditCard,
  Ban,
  Activity,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Laptop,
  ArrowRight,
  Eye,
  Edit2,
  RefreshCw,
  Search,
  Lock,
  Unlock,
  AlertTriangle,
  Loader2,
  KeyRound,
  Zap,
  DollarSign,
  Smartphone,
  Save,
  Megaphone,
  Radio,
  Sliders,
  Shield,
  Crown,
} from "lucide-react";
import { UserRecord, BlockedDeviceRecord, LiveVisitorRecord } from "@/lib/types";

interface AdminData {
  users: UserRecord[];
  blockedDevices: BlockedDeviceRecord[];
  liveVisitors: LiveVisitorRecord[];
  systemSettings?: Record<string, string>;
  stats: {
    totalUsers: number;
    activeSubscriptions: number;
    paidSubscriptions: number;
    blockedDevicesCount: number;
    liveGuestsCount: number;
  };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "monetization" | "platform" | "security" | "traffic">("users");
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Impersonation state
  const [impersonatedUser, setImpersonatedUser] = useState<UserRecord | null>(null);

  // Edit Subscription Modal state
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editPlan, setEditPlan] = useState<"free" | "monthly" | "semi-annual" | "annual" | "lifetime">("monthly");
  const [editStatus, setEditStatus] = useState<"active" | "expired" | "pending" | "suspended">("active");
  const [editExpiresAt, setEditExpiresAt] = useState("");

  // Reset Password Modal state
  const [passwordUser, setPasswordUser] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Block Device Modal state
  const [blockingDeviceId, setBlockingDeviceId] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  // System Settings state
  const [platformName, setPlatformName] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [globalAnnouncement, setGlobalAnnouncement] = useState("");
  const [proMonthlyPrice, setProMonthlyPrice] = useState("149");
  const [proAnnualPrice, setProAnnualPrice] = useState("89");
  const [instapayAccount, setInstapayAccount] = useState("fintech@instapay");
  const [vodafoneCashNumber, setVodafoneCashNumber] = useState("01000000000");
  const [freeAiLimit, setFreeAiLimit] = useState("15");
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchAdminData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin");
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.systemSettings) {
          const s = json.systemSettings;
          if (s.platform_name) setPlatformName(s.platform_name);
          if (s.maintenance_mode) setMaintenanceMode(s.maintenance_mode === "true");
          if (s.global_announcement) setGlobalAnnouncement(s.global_announcement);
          if (s.pro_monthly_price) setProMonthlyPrice(s.pro_monthly_price);
          if (s.pro_annual_price) setProAnnualPrice(s.pro_annual_price);
          if (s.instapay_account) setInstapayAccount(s.instapay_account);
          if (s.vodafone_cash_number) setVodafoneCashNumber(s.vodafone_cash_number);
          if (s.free_ai_daily_limit) setFreeAiLimit(s.free_ai_daily_limit);
        }
      }
    } catch (e) {
      console.error("Failed to load admin data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 8000);
    return () => clearInterval(interval);
  }, [fetchAdminData]);

  function notify(text: string, type: "success" | "error" = "success") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  }

  // Handle Impersonation
  async function handleImpersonate(user: UserRecord) {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "impersonate", targetUserId: user.id }),
      });
      if (res.ok) {
        setImpersonatedUser(user);
        notify(`تم التبديل لحساب "${user.name}" بنجاح! سيتم تحويلك للصفحة الرئيسية الآن.`);
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
      } else {
        notify("فشل التبديل للحساب", "error");
      }
    } catch {
      notify("حدث خطأ في الاتصال", "error");
    }
  }

  async function handleExitImpersonation() {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "exit_impersonate" }),
      });
      setImpersonatedUser(null);
      notify("تمت العودة لحساب الأدمن بنجاح");
      window.location.href = "/admin";
    } catch {
      notify("فشل الخروج من المعاينة", "error");
    }
  }

  // Quick Plan Activation (One-Click)
  async function handleQuickGrant(userId: number, plan: string, days: number, label: string) {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "quick_grant_plan", userId, plan, days }),
      });
      if (res.ok) {
        notify(`تم تفعيل ${label} للمستخدم بنجاح فوراً!`);
        fetchAdminData();
      } else {
        notify("فشل تفعيل الخطة", "error");
      }
    } catch {
      notify("حدث خطأ في الشبكة", "error");
    }
  }

  // Save Detailed Subscription Modal
  async function handleSaveSubscription(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_subscription",
          userId: editingUser.id,
          plan: editPlan,
          status: editStatus,
          expiresAt: editExpiresAt || null,
        }),
      });

      if (res.ok) {
        notify("تم تحديث بيانات اشتراك المستخدم بنجاح!");
        setEditingUser(null);
        fetchAdminData();
      } else {
        notify("فشل تحديث الاشتراك", "error");
      }
    } catch {
      notify("حدث خطأ أثناء الحفظ", "error");
    }
  }

  // Reset Password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordUser || !newPassword.trim()) return;

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reset_password",
          userId: passwordUser.id,
          newPassword: newPassword.trim(),
        }),
      });
      if (res.ok) {
        notify(`تم تعيين كلمة المرور الجديدة لحساب "${passwordUser.name}" بنجاح!`);
        setPasswordUser(null);
        setNewPassword("");
        fetchAdminData();
      } else {
        notify("فشل إعادة تعيين كلمة المرور", "error");
      }
    } catch {
      notify("حدث خطأ في الاتصال", "error");
    }
  }

  // Toggle Admin Status
  async function handleToggleAdmin(user: UserRecord) {
    const nextAdminState = !user.is_admin;
    const confirmMsg = nextAdminState
      ? `هل تريد ترقية "${user.name}" ليكون Super Admin؟`
      : `هل تريد إلغاء صلاحية الإدارة العليا عن "${user.name}"؟`;
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_admin",
          userId: user.id,
          isAdmin: nextAdminState,
        }),
      });
      if (res.ok) {
        notify(nextAdminState ? "تمت الترقية لأدمن بنجاح" : "تم إلغاء صلاحية الأدمن");
        fetchAdminData();
      }
    } catch {
      notify("حدث خطأ", "error");
    }
  }

  // Handle Toggle Block User
  async function handleToggleBlockUser(user: UserRecord) {
    const willBlock = user.is_blocked === 0;
    const confirmMsg = willBlock
      ? `هل تريد بالتأكيد حظر المستخدم "${user.name}" ومنع جهازه من دخول النظام؟`
      : `هل تريد فك الحظر عن "${user.name}"؟`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_block_user",
          userId: user.id,
          isBlocked: willBlock,
          reason: "حظر أمني من لوحة تحكم الأدمن",
        }),
      });

      if (res.ok) {
        notify(willBlock ? "تم حظر المستخدم وجهازه بنجاح" : "تم إلغاء الحظر بنجاح");
        fetchAdminData();
      }
    } catch {
      notify("حدث خطأ", "error");
    }
  }

  // Save System Settings
  async function handleSaveSystemSetting(key: string, value: string, desc: string) {
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_system_setting",
          key,
          value,
          description: desc,
        }),
      });
      if (res.ok) {
        notify(`تم حفظ ${desc} بنجاح ومزامنته سحابياً!`);
        fetchAdminData();
      } else {
        notify("فشل حفظ الإعدادات", "error");
      }
    } catch {
      notify("حدث خطأ أثناء الحفظ", "error");
    } finally {
      setSavingSettings(false);
    }
  }

  // Handle Unblock Device
  async function handleUnblockDevice(deviceId: string) {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unblock_device", deviceId }),
      });
      if (res.ok) {
        notify("تم فك حظر الجهاز بنجاح");
        fetchAdminData();
      }
    } catch {
      notify("حدث خطأ أثناء فك الحظر", "error");
    }
  }

  // Handle Custom Device Block
  async function handleCustomBlockDevice(e: React.FormEvent) {
    e.preventDefault();
    if (!blockingDeviceId.trim()) return;

    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "block_device",
          deviceId: blockingDeviceId.trim(),
          reason: blockReason.trim() || "حظر يدوي بواسطة الأدمن",
        }),
      });

      if (res.ok) {
        notify("تم حظر الجهاز من دخول النظام نهائياً!");
        setBlockingDeviceId("");
        setBlockReason("");
        setIsBlockModalOpen(false);
        fetchAdminData();
      }
    } catch {
      notify("فشل حظر الجهاز", "error");
    }
  }

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="text-sm">جاري تحميل لوحة تحكم السوبر أدمن...</span>
      </div>
    );
  }

  const filteredUsers = data.users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Impersonation Banner if active */}
      {impersonatedUser && (
        <div className="p-4 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-between text-amber-200 shadow-xl shadow-amber-950/20 animate-pulse">
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-amber-400" />
            <div>
              <span className="text-xs font-bold block">
                أنت الآن تتصفح النظام متقمصاً حساب: {impersonatedUser.name} ({impersonatedUser.email})
              </span>
              <span className="text-[11px] text-amber-300">
                الباقة: {impersonatedUser.plan} • الحالة: {impersonatedUser.status}
              </span>
            </div>
          </div>
          <button
            onClick={handleExitImpersonation}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer"
          >
            الخروج والعودة للأدمن
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-400" />
            <span>لوحة تحكم السوبر أدمن (Super Admin Command Center)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            التحكم الكامل في المستخدمين، تفعيل الاشتراكات بنقرة واحدة، استقبال أموال انستاباي، وإدارة المنظومة
          </p>
        </div>

        <div className="flex items-center gap-2">
          {message && (
            <div
              className={`px-3 py-1 rounded-xl text-xs font-bold ${
                message.type === "success"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            onClick={() => setIsBlockModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400 hover:bg-rose-600/30 text-xs font-bold transition-all cursor-pointer"
          >
            <Ban className="w-4 h-4" />
            <span>+ حظر جهاز</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="card-fintech p-4 border-t-2 border-t-sky-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">إجمالي المسجلين</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-2xl font-black text-white">{data.stats.totalUsers} مستخدم</span>
        </div>

        <div className="card-fintech p-4 border-t-2 border-t-emerald-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">المشتركين المؤكدين</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-black text-emerald-400">
            {data.stats.paidSubscriptions} مدفوع
          </span>
        </div>

        <div className="card-fintech p-4 border-t-2 border-t-amber-500 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">الزوار لايف الآن</span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              مباشر
            </span>
          </div>
          <span className="text-2xl font-black text-amber-400">
            {data.stats.liveGuestsCount} متصل
          </span>
        </div>

        <div className="card-fintech p-4 border-t-2 border-t-rose-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">الأجهزة المحظورة</span>
            <Ban className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-2xl font-black text-rose-400">
            {data.stats.blockedDevicesCount} جهاز
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#0F1424] border border-slate-800 rounded-2xl">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "users"
              ? "bg-emerald-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>إدارة المشتركين والعملاء ({data.users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("monetization")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "monetization"
              ? "bg-emerald-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>تحصيل الأموال وطرق الدفع والأسعار</span>
        </button>

        <button
          onClick={() => setActiveTab("platform")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "platform"
              ? "bg-emerald-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>التحكم في المنظومة والإعلانات</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "security"
              ? "bg-emerald-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>الأمان والأجهزة المحظورة ({data.blockedDevices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("traffic")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "traffic"
              ? "bg-emerald-500 text-slate-950 shadow-md"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>حركة الزوار المباشرة ({data.liveVisitors.length})</span>
        </button>
      </div>

      {/* TAB 1: USERS MANAGEMENT */}
      {activeTab === "users" && (
        <div className="card-fintech p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">
                المشتركون المسجلون وإدارة الحسابات
              </h2>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ابحث بالاسم، الإيميل أو الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 px-3">المستخدم</th>
                  <th className="py-2.5 px-3">الباقة</th>
                  <th className="py-2.5 px-3">الحالة</th>
                  <th className="py-2.5 px-3">انتهاء الاشتراك</th>
                  <th className="py-2.5 px-3 text-center">تفعيل سريع (كليك واحد)</th>
                  <th className="py-2.5 px-3 text-center">التحكم المباشر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {user.is_admin && (
                          <span title="مدير نظام">
                            <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                          </span>
                        )}
                        <div>
                          <span className="font-bold text-white block">{user.name}</span>
                          <span className="text-[11px] text-slate-400 block">{user.email}</span>
                          {user.phone && <span className="text-[10px] text-slate-500">{user.phone}</span>}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                          user.plan === "lifetime"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : user.plan === "annual"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : user.plan === "semi-annual"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : user.plan === "monthly"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {user.plan === "lifetime"
                          ? "مدى الحياة 👑"
                          : user.plan === "annual"
                          ? "سنوي VIP"
                          : user.plan === "semi-annual"
                          ? "نصف سنوي"
                          : user.plan === "monthly"
                          ? "شهري"
                          : "مجاني"}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 font-bold ${
                          user.is_blocked
                            ? "text-rose-400"
                            : user.status === "active"
                            ? "text-emerald-400"
                            : "text-amber-400"
                        }`}
                      >
                        {user.is_blocked ? (
                          <>
                            <Ban className="w-3.5 h-3.5" /> محظور
                          </>
                        ) : user.status === "active" ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> مفعل
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" /> منتهي
                          </>
                        )}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-300 font-mono text-[11px]">
                      {user.expires_at || "غير محدد"}
                    </td>

                    {/* Quick Grant Buttons (كليك واحد لتفعيل الاشتراك بعد استلام الفلوس) */}
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleQuickGrant(user.id, "monthly", 30, "اشتراك شهري (30 يوم)")}
                          title="تفعيل شهر فوري"
                          className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold cursor-pointer"
                        >
                          +30 يوم
                        </button>
                        <button
                          onClick={() => handleQuickGrant(user.id, "annual", 365, "اشتراك سنوي (365 يوم)")}
                          title="تفعيل سنة كاملة"
                          className="px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold cursor-pointer"
                        >
                          +سنة VIP
                        </button>
                        <button
                          onClick={() => handleQuickGrant(user.id, "lifetime", 3650, "اشتراك مدى الحياة")}
                          title="تفعيل مدى الحياة"
                          className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold cursor-pointer"
                        >
                          مدى الحياة 👑
                        </button>
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Impersonate */}
                        <button
                          onClick={() => handleImpersonate(user)}
                          title="معاينة وتصفح حسابه فوراً كأنه هو"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-bold text-[11px] border border-indigo-500/30 transition-all cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>معاينة</span>
                        </button>

                        {/* Reset Password */}
                        <button
                          onClick={() => {
                            setPasswordUser(user);
                            setNewPassword("123456");
                          }}
                          title="تغيير كلمة المرور"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Subscription */}
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setEditPlan(user.plan as any);
                            setEditStatus(user.status as any);
                            setEditExpiresAt(user.expires_at || "");
                          }}
                          title="تعديل تفاصيل الاشتراك"
                          className="p-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Block / Unblock */}
                        <button
                          onClick={() => handleToggleBlockUser(user)}
                          title={user.is_blocked ? "فك الحظر" : "حظر المستخدم وجهازه"}
                          className={`p-1.5 rounded-lg border cursor-pointer ${
                            user.is_blocked
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                          }`}
                        >
                          {user.is_blocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: MONETIZATION & EGYPTIAN PAYMENTS (تحصيل الأموال والاشتراكات) */}
      {activeTab === "monetization" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Payment Collection Channels */}
          <div className="card-fintech p-6 space-y-5 border-emerald-500/30">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-base font-bold text-white">طرق تحصيل الأموال داخل مصر</h3>
                <p className="text-xs text-slate-400">تظهر للعملاء في صفحة الترقية لتحويل قيمة الاشتراك مباشرة إليك</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  عنوان حساب InstaPay لاستقبال الاشتراكات
                </label>
                <input
                  type="text"
                  value={instapayAccount}
                  onChange={(e) => setInstapayAccount(e.target.value)}
                  placeholder="name@instapay"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  رقم محفظة فودافون كاش / المحافظ الإلكترونية
                </label>
                <input
                  type="text"
                  value={vodafoneCashNumber}
                  onChange={(e) => setVodafoneCashNumber(e.target.value)}
                  placeholder="010xxxxxxxx"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                disabled={savingSettings}
                onClick={async () => {
                  await handleSaveSystemSetting("instapay_account", instapayAccount, "حساب انستاباي");
                  await handleSaveSystemSetting("vodafone_cash_number", vodafoneCashNumber, "رقم فودافون كاش");
                }}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>حفظ بيانات استقبال وتحصيل الأموال</span>
              </button>
            </div>
          </div>

          {/* Pricing Plans Configuration */}
          <div className="card-fintech p-6 space-y-5 border-slate-800">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-sky-400" />
              <div>
                <h3 className="text-base font-bold text-white">تسعير باقات برو (Pricing Strategy)</h3>
                <p className="text-xs text-slate-400">تعديل أسعار الاشتراك التي تظهر في صفحة الهبوط وتطبيق النظام</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  سعر الاشتراك الشهري (بالجنيه المصري)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={proMonthlyPrice}
                    onChange={(e) => setProMonthlyPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">ج.م / شهر</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  سعر الاشتراك السنوي المحسوب شهرياً
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={proAnnualPrice}
                    onChange={(e) => setProAnnualPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">ج.م / شهر</span>
                </div>
              </div>

              <button
                disabled={savingSettings}
                onClick={async () => {
                  await handleSaveSystemSetting("pro_monthly_price", proMonthlyPrice, "سعر الاشتراك الشهري");
                  await handleSaveSystemSetting("pro_annual_price", proAnnualPrice, "سعر الاشتراك السنوي");
                }}
                className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>تحديث وتطبيق أسعار الباقات فوراً</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PLATFORM CONTROLS & ANNOUNCEMENTS */}
      {activeTab === "platform" && (
        <div className="card-fintech p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">التحكم العام في المنظومة وبث الإعلانات</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Global Announcement Banner */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Megaphone className="w-4 h-4" />
                <span>شريط الإعلانات العام (Global Announcement Banner)</span>
              </div>
              <p className="text-[11px] text-slate-400">
                رسالة عاجلة تظهر لجميع العملاء في أعلى الشاشة (للعروض، الخصومات، أو التحديثات)
              </p>
              <textarea
                rows={2}
                value={globalAnnouncement}
                onChange={(e) => setGlobalAnnouncement(e.target.value)}
                placeholder="مثال: خصم 40% بمناسبة إطلاق المنظومة.. اشترك الآن!"
                className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button
                onClick={() => handleSaveSystemSetting("global_announcement", globalAnnouncement, "شريط الإعلانات العام")}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs cursor-pointer"
              >
                تطبيق وبث الإعلان لجميع المستخدمين
              </button>
            </div>

            {/* Maintenance Mode & Free Limits */}
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  الحد الأقصى اليومي للمحادثات المجانية (Free AI Limit)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={freeAiLimit}
                    onChange={(e) => setFreeAiLimit(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">رسالة / يوم</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">وضع الصيانة (Maintenance Mode)</span>
                  <span className="text-[11px] text-slate-400">يقفل المنظومة مؤقتاً للترقيات</span>
                </div>
                <button
                  onClick={() => {
                    const nextMode = !maintenanceMode;
                    setMaintenanceMode(nextMode);
                    handleSaveSystemSetting("maintenance_mode", String(nextMode), "وضع الصيانة");
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer ${
                    maintenanceMode ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {maintenanceMode ? "وضع الصيانة مفعل ⚠️" : "المنظومة تعمل بشكل طبيعي ✅"}
                </button>
              </div>

              <button
                onClick={() => handleSaveSystemSetting("free_ai_daily_limit", freeAiLimit, "حد المحادثات المجانية")}
                className="w-full py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30 font-bold text-xs cursor-pointer"
              >
                حفظ حد الاستفسارات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SECURITY & BLOCKED DEVICES */}
      {activeTab === "security" && (
        <div className="card-fintech p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-400" />
              الأجهزة المحظورة من دخول النظام ({data.blockedDevices.length})
            </h3>
            <button
              onClick={() => setIsBlockModalOpen(true)}
              className="px-3 py-1 bg-rose-600/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold cursor-pointer"
            >
              + إضافة حظر يدوي
            </button>
          </div>

          <div className="space-y-2">
            {data.blockedDevices.map((dev) => (
              <div
                key={dev.id}
                className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 font-mono font-bold text-rose-300">
                    <Laptop className="w-3.5 h-3.5" />
                    <span>{dev.device_id}</span>
                    {dev.ip_address && (
                      <span className="text-[10px] text-slate-400">({dev.ip_address})</span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    السبب: {dev.reason || "غير محدد"}
                  </span>
                </div>

                <button
                  onClick={() => handleUnblockDevice(dev.device_id)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/30 font-bold text-xs cursor-pointer"
                >
                  فك الحظر
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: LIVE TRAFFIC */}
      {activeTab === "traffic" && (
        <div className="card-fintech p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              الضيوف المتصلين بالويب سايت لايف الآن ({data.liveVisitors.length})
            </h3>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
              تحديث تلقائي كل 8 ثواني
            </span>
          </div>

          <div className="space-y-2">
            {data.liveVisitors.map((visitor) => (
              <div
                key={visitor.session_id}
                className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-white font-mono">{visitor.ip_address}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      {visitor.page}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    {visitor.device_info}
                  </span>
                </div>

                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(visitor.last_active_at).toLocaleTimeString("ar-EG")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: Edit Subscription Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-fintech max-w-md w-full p-6 space-y-4 shadow-2xl border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">تعديل اشتراك: {editingUser.name}</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">نوع الباقة</label>
                <select
                  value={editPlan}
                  onChange={(e) => setEditPlan(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold"
                >
                  <option value="free">مجاني (Free)</option>
                  <option value="monthly">شهري (Monthly)</option>
                  <option value="semi-annual">نصف سنوي (Semi-Annual)</option>
                  <option value="annual">سنوي (Annual VIP)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">حالة الاشتراك</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-bold"
                >
                  <option value="active">مفعل (Active)</option>
                  <option value="expired">منتهي (Expired)</option>
                  <option value="pending">معلق (Pending)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">تاريخ انتهاء الاشتراك</label>
                <input
                  type="date"
                  value={editExpiresAt ? editExpiresAt.split("T")[0] : ""}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Reset Password Modal */}
      {passwordUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-fintech max-w-sm w-full p-6 space-y-4 shadow-2xl border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">تغيير كلمة مرور: {passwordUser.name}</h3>
              <button
                onClick={() => setPasswordUser(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">كلمة المرور الجديدة</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الجديدة"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                >
                  تأكيد الحفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Custom Device Block Modal */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card-fintech max-w-sm w-full p-6 space-y-4 shadow-2xl border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-1.5 text-rose-400">
                <Ban className="w-5 h-5" />
                <span>حظر جهاز جديد</span>
              </h3>
              <button
                onClick={() => setIsBlockModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCustomBlockDevice} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">معرف الجهاز (Device ID)</label>
                <input
                  type="text"
                  required
                  value={blockingDeviceId}
                  onChange={(e) => setBlockingDeviceId(e.target.value)}
                  placeholder="مثال: DEV-WIN-9821"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">سبب الحظر</label>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="مثال: مخالفة شروط الاستخدام"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
                >
                  حظر فوري
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
