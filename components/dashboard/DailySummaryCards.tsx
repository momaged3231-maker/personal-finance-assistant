"use client";

import { ArrowUpLeft, ArrowDownRight, TrendingUp, TrendingDown } from "lucide-react";
import { formatEgp } from "@/lib/types";

interface DailySummaryProps {
  summary: {
    income: number;
    expense: number;
    net: number;
  };
}

export default function DailySummaryCards({ summary }: DailySummaryProps) {
  const isNetPositive = summary.net >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
      {/* Today Income */}
      <div className="glass-card p-5 rounded-3xl relative overflow-hidden group hover:border-emerald-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-emerald-500/40 to-teal-400/80" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400">دخل النهارده</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <ArrowUpLeft className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
            {formatEgp(summary.income, false)}
          </span>
          <span className="text-xs font-semibold text-slate-400">ج.م</span>
        </div>
      </div>

      {/* Today Expense */}
      <div className="glass-card p-5 rounded-3xl relative overflow-hidden group hover:border-rose-500/30 transition-all duration-300">
        <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-rose-500/40 to-red-500/80" />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400">مصروف النهارده</span>
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-rose-400 tracking-tight">
            {formatEgp(summary.expense, false)}
          </span>
          <span className="text-xs font-semibold text-slate-400">ج.م</span>
        </div>
      </div>

      {/* Today Net */}
      <div className="glass-card p-5 rounded-3xl relative overflow-hidden group hover:border-blue-500/30 transition-all duration-300">
        <div
          className={`absolute top-0 right-0 left-0 h-1 ${
            isNetPositive
              ? "bg-gradient-to-r from-blue-500/40 to-indigo-500/80"
              : "bg-gradient-to-r from-amber-500/40 to-rose-500/80"
          }`}
        />
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-400">صافي النهارده</span>
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isNetPositive
                ? "bg-blue-500/10 text-blue-400"
                : "bg-amber-500/10 text-amber-400"
            }`}
          >
            {isNetPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isNetPositive ? "text-blue-400" : "text-amber-400"
            }`}
          >
            {isNetPositive ? "+" : ""}
            {formatEgp(summary.net, false)}
          </span>
          <span className="text-xs font-semibold text-slate-400">ج.م</span>
        </div>
      </div>
    </div>
  );
}
