"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  Bot,
  Sparkles,
  Settings,
  Users,
  Target,
  LogOut,
  LogIn,
  UserPlus,
  ShieldAlert,
  ArrowLeft,
  Crown,
  Zap,
} from "lucide-react";
import { UserRecord } from "@/lib/types";

interface SessionData {
  authenticated: boolean;
  user: UserRecord | null;
  isImpersonating: boolean;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setSession(json);
      }
    } catch (e) {
      console.error("Failed to fetch session", e);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession, pathname]);

  async function handleLogout() {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
      window.location.href = "/landing";
    } catch (e) {
      console.error("Logout failed", e);
      window.location.href = "/landing";
    }
  }

  async function handleExitImpersonation() {
    try {
      await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "exit_impersonate" }),
      });
      window.location.href = "/admin";
    } catch (e) {
      console.error("Exit impersonation failed", e);
    }
  }

  const links = [
    { href: "/", label: "الرئيسية", icon: LayoutDashboard },
    { href: "/day", label: "اليوم", icon: CalendarDays },
    { href: "/debts", label: "الجمعيات والديون", icon: Users },
    { href: "/goals", label: "الأهداف", icon: Target },
    { href: "/analytics", label: "الميزانيات", icon: BarChart3 },
    { href: "/assistant", label: "المساعد", icon: Bot, highlight: true },
    { href: "/settings", label: "الإعدادات", icon: Settings },
  ];

  const planBadge = (plan?: string) => {
    switch (plan) {
      case "annual":
        return { text: "VIP سنوي", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" };
      case "semi-annual":
        return { text: "نصف سنوي", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30" };
      case "monthly":
        return { text: "شهري", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" };
      default:
        return { text: "مجاني", color: "bg-slate-700/50 text-slate-300 border-slate-600/30" };
    }
  };

  const badgeInfo = planBadge(session?.user?.plan);

  return (
    <>
      {/* 1. IMPERSONATION BANNER (SaaS Super Admin Live View) */}
      {session?.isImpersonating && (
        <div className="bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-lg sticky top-0 z-50 rounded-b-xl mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
            <span>
              أنت تتصفح النظام حالياً كعميل:{" "}
              <strong className="underline">{session.user?.name || "مستخدم"}</strong> ({session.user?.email}) — جميع العمليات تخص هذا الحساب فقط.
            </span>
          </div>
          <button
            onClick={handleExitImpersonation}
            className="px-3 py-1 bg-white text-rose-700 hover:bg-slate-100 rounded-lg text-xs font-black transition-all shadow cursor-pointer flex items-center gap-1.5"
          >
            <span>إنهاء المعاينة والعودة للأدمن</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. MAIN HEADER */}
      <header className="flex items-center justify-between py-3 border-b border-slate-800/80 mb-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform duration-200">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-sm font-black text-slate-100">
              مساعدك المالي
            </span>
            <span className="block text-[9px] text-emerald-400 font-bold -mt-0.5 tracking-wider">
              FINANCE AI
            </span>
          </div>
        </Link>

        {/* If on /landing and not logged in, show dedicated clean landing links */}
        {pathname === "/landing" && !session?.authenticated ? (
          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="px-4 py-2 rounded-full border border-slate-800 hover:border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-all"
            >
              تسجيل الدخول
            </Link>
            <Link
              href="/signup"
              className="btn-pill-primary text-xs py-2 px-4 font-bold"
            >
              ابدأ مجاناً
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-2">
              <nav className="flex items-center gap-1 bg-[#0F1424]/90 p-1.5 rounded-2xl border border-slate-800/80 backdrop-blur-md">
                {links.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all duration-200 ${
                        isActive
                          ? "bg-emerald-500 text-slate-950 font-black shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 font-medium"
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? "text-slate-950" : item.highlight ? "text-emerald-400" : ""}`} />
                      <span>{item.label}</span>
                      {item.highlight && !isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              <Link
                href="/landing"
                className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold transition-all"
                title="صفحة التعريف والاشتراكات"
              >
                الموقع
              </Link>

              {(session?.user?.is_admin || session?.user?.id === 1) && (
                <Link
                  href="/admin"
                  className="px-2.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1"
                  title="لوحة تحكم الإدارة العليا"
                >
                  <span>الأدمن</span>
                </Link>
              )}

              {/* User Session Pill */}
              {session?.authenticated ? (
                <div className="flex items-center gap-2 pl-1 border-r border-slate-800 pr-2 mr-1">
                  <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-xl text-xs">
                    <span className="text-slate-200 font-bold max-w-[100px] truncate">
                      {session.user?.name || "المستخدم"}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md border font-semibold ${badgeInfo.color}`}>
                      {badgeInfo.text}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/30 transition-all cursor-pointer"
                    title="تسجيل الخروج"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 pr-2 mr-1 border-r border-slate-800">
                  <Link
                    href="/login"
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>دخول</span>
                  </Link>
                  <Link
                    href="/signup"
                    className="btn-pill-primary text-xs py-1.5 px-3 flex items-center gap-1 font-bold"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>اشتراك</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Tablet Navigation fallback */}
            <div className="hidden md:flex lg:hidden items-center gap-1.5">
              <Link
                href="/debts"
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-slate-300 text-xs font-medium border border-slate-800"
              >
                الجمعيات
              </Link>
              <Link
                href="/goals"
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-slate-300 text-xs font-medium border border-slate-800"
              >
                الأهداف
              </Link>
              <Link
                href="/landing"
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 text-slate-300 text-xs font-medium border border-slate-800"
              >
                الموقع
              </Link>
              {session?.authenticated ? (
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-800"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              ) : (
                <Link
                  href="/login"
                  className="px-2 py-1 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold"
                >
                  دخول
                </Link>
              )}
            </div>
          </>
        )}
      </header>

      {/* Mobile Floating Bottom Bar (Hidden on landing for unauthenticated users) */}
      {!(pathname === "/landing" && !session?.authenticated) && (
        <div className="md:hidden fixed bottom-3 left-3 right-3 z-50">
          <nav className="card-fintech bg-slate-950/95 border border-slate-800/80 rounded-2xl p-1.5 flex items-center justify-around shadow-2xl shadow-black/80 backdrop-blur-xl">
          {links.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "text-blue-400 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <div
                  className={`p-1 rounded-lg transition-all ${
                    isActive ? "bg-blue-600/20 text-blue-400" : ""
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px]">{item.label}</span>
              </Link>
            );
          })}
          <Link
            href="/assistant"
            className="flex flex-col items-center gap-0.5 py-1 px-2 text-indigo-400 font-bold"
          >
            <div className="p-1 rounded-lg bg-indigo-600/20 text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <span className="text-[10px]">المساعد</span>
          </Link>
          <Link
            href={session?.authenticated ? "/settings" : "/login"}
            className="flex flex-col items-center gap-0.5 py-1 px-2 text-slate-400"
          >
            <div className="p-1 rounded-lg">
              {session?.authenticated ? <Settings className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            </div>
            <span className="text-[10px]">{session?.authenticated ? "إعدادات" : "دخول"}</span>
          </Link>
        </nav>
      </div>
      )}
    </>
  );
}
