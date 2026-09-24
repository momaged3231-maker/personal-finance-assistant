"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import DailySummaryCards from "@/components/dashboard/DailySummaryCards";
import BalanceCards from "@/components/dashboard/BalanceCards";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import AssistantTeaser from "@/components/dashboard/AssistantTeaser";
import QuickActions from "@/components/dashboard/QuickActions";
import ExpenseModal from "@/components/transactions/ExpenseModal";
import IncomeModal from "@/components/transactions/IncomeModal";
import TransferModal from "@/components/transactions/TransferModal";
import SmartParserModal from "@/components/dashboard/SmartParserModal";
import {
  Loader2,
  Share2,
  Printer,
  Users,
  Target,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { Account, Transaction, formatEgp } from "@/lib/types";

interface DashboardData {
  accounts: Account[];
  todaySummary: {
    income: number;
    expense: number;
    net: number;
  };
  recentTransactions: Transaction[];
  totalBalance: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isIncomeOpen, setIsIncomeOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isSmartParserOpen, setIsSmartParserOpen] = useState(false);

  // Sharing state
  const [sharing, setSharing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/finance", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/landing";
        return;
      }
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to load dashboard data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Dynamic greeting
  const [greeting, setGreeting] = useState("مساء الخير 👋");
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 13) {
      setGreeting("صباح الخير 👋");
    } else {
      setGreeting("مساء الخير 👋");
    }
  }, []);

  const handleShareWhatsApp = async () => {
    try {
      setSharing(true);
      const res = await fetch("/api/finance?view=whatsapp");
      const json = await res.json();
      if (json.text) {
        const url = `https://api.whatsapp.com/send?text=${json.text}`;
        window.open(url, "_blank");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSharing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-sm">جاري تحميل بياناتك المالية...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Greeting & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {greeting}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            إليك ملخص وضعك المالي وحساباتك اليوم
          </p>
        </div>

        {/* Export / WhatsApp Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleShareWhatsApp}
            disabled={sharing}
            className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition flex items-center gap-2 shadow-sm"
            title="مشاركة ملخص اليوم عبر واتساب"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{sharing ? "جاري التجهيز..." : "تقرير واتساب"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition flex items-center gap-2"
            title="طباعة وتصدير التقرير PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة PDF</span>
          </button>
        </div>
      </div>

      {/* Large Cards: دخل النهارده - مصروف النهارده - صافي النهارده */}
      <section>
        <DailySummaryCards summary={data.todaySummary} />
      </section>

      {/* Quick Navigation to New Features (الجمعيات والديون والأهداف) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/debts"
          className="glass-panel p-4 rounded-3xl border border-indigo-500/30 bg-indigo-950/20 hover:border-indigo-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                الجمعيات الشهرية والديون
              </h4>
              <p className="text-[11px] text-slate-400">
                متابعة مواعيد السداد والقبض وما لك وما عليك
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-[-2px] transition-transform" />
        </Link>

        <Link
          href="/goals"
          className="glass-panel p-4 rounded-3xl border border-amber-500/30 bg-amber-950/20 hover:border-amber-500/50 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 group-hover:scale-105 transition-transform">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                أهداف التوفير وصندوق الطوارئ
              </h4>
              <p className="text-[11px] text-slate-400">
                خطط لأهدافك المستقبلية ومعدل الادخار
              </p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-amber-400 group-hover:translate-x-[-2px] transition-transform" />
        </Link>
      </section>

      {/* Account Balances: الكاش - البنك - Vodafone Cash */}
      <section>
        <BalanceCards
          accounts={data.accounts}
          totalBalance={data.totalBalance}
        />
      </section>

      {/* Quick Actions Bar */}
      <section className="sticky top-2 z-20 backdrop-blur-md py-1">
        <QuickActions
          onOpenIncome={() => setIsIncomeOpen(true)}
          onOpenExpense={() => setIsExpenseOpen(true)}
          onOpenTransfer={() => setIsTransferOpen(true)}
          onOpenSmartParser={() => setIsSmartParserOpen(true)}
        />
      </section>

      {/* AI Assistant Preview Card */}
      <section>
        <AssistantTeaser />
      </section>

      {/* Recent Transactions */}
      <section>
        <RecentTransactions
          transactions={data.recentTransactions}
          accounts={data.accounts}
          onTransactionDeleted={fetchDashboard}
          onTransactionUpdated={fetchDashboard}
        />
      </section>

      {/* Modals */}
      <ExpenseModal
        isOpen={isExpenseOpen}
        onClose={() => setIsExpenseOpen(false)}
        accounts={data.accounts}
        onSuccess={fetchDashboard}
      />

      <IncomeModal
        isOpen={isIncomeOpen}
        onClose={() => setIsIncomeOpen(false)}
        accounts={data.accounts}
        onSuccess={fetchDashboard}
      />

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        accounts={data.accounts}
        onSuccess={fetchDashboard}
      />

      <SmartParserModal
        isOpen={isSmartParserOpen}
        onClose={() => setIsSmartParserOpen(false)}
        accounts={data.accounts}
        onSuccess={fetchDashboard}
      />
    </div>
  );
}
