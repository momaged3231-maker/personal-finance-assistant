"use client";

import Link from "next/link";
import { PlusCircle, MinusCircle, ArrowLeftRight, Bot, Sparkles } from "lucide-react";

interface QuickActionsProps {
  onOpenIncome: () => void;
  onOpenExpense: () => void;
  onOpenTransfer: () => void;
  onOpenSmartParser: () => void;
}

export default function QuickActions({
  onOpenIncome,
  onOpenExpense,
  onOpenTransfer,
  onOpenSmartParser,
}: QuickActionsProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* + دخل */}
        <button
          onClick={onOpenIncome}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold hover:bg-emerald-500/25 active:scale-[0.98] transition-all shadow-lg shadow-emerald-950/20"
        >
          <PlusCircle className="w-5 h-5" />
          <span>+ دخل</span>
        </button>

        {/* - مصروف */}
        <button
          onClick={onOpenExpense}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold hover:bg-rose-500/25 active:scale-[0.98] transition-all shadow-lg shadow-rose-950/20"
        >
          <MinusCircle className="w-5 h-5" />
          <span>- مصروف</span>
        </button>

        {/* ↔ تحويل */}
        <button
          onClick={onOpenTransfer}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-400 font-bold hover:bg-blue-500/25 active:scale-[0.98] transition-all shadow-lg shadow-blue-950/20"
        >
          <ArrowLeftRight className="w-5 h-5" />
          <span>↔ تحويل</span>
        </button>

        {/* 🤖 المساعد */}
        <Link
          href="/assistant"
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold hover:bg-indigo-500/25 active:scale-[0.98] transition-all shadow-lg shadow-indigo-950/20"
        >
          <Bot className="w-5 h-5 text-indigo-400" />
          <span>🤖 المساعد</span>
        </Link>
      </div>

      {/* Smart Parser Bar */}
      <button
        onClick={onOpenSmartParser}
        className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 border border-blue-500/30 text-blue-300 font-bold text-xs flex items-center justify-between transition-all group shadow-md"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 group-hover:rotate-12 transition-transform" />
          <span>القارئ الذكي لإشعارات InstaPay ورسائل البنوك وفودافون كاش</span>
        </span>
        <span className="text-[11px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-lg border border-blue-500/30">
          الصق الرسالة فوراً ⚡
        </span>
      </button>
    </div>
  );
}
