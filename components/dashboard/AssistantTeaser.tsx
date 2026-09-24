"use client";

import Link from "next/link";
import { Bot, Sparkles, ArrowLeft } from "lucide-react";

export default function AssistantTeaser() {
  const samplePrompts = [
    "صرفت كام النهارده؟",
    "معايا كام في البنك؟",
    "سجل 75 جنيه سجائر",
    "أكتر حاجة بصرف عليها إيه؟",
  ];

  return (
    <div className="glass-panel p-5 rounded-3xl relative overflow-hidden border border-indigo-500/20 bg-gradient-to-br from-indigo-950/30 via-slate-900/60 to-blue-950/20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">المساعد المالي الذكي</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                باللهجة المصرية
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              اسأله عن فلوسك، أو قوله يسجل لك مصاريفك ودخلك بالكلام العادي
            </p>
          </div>
        </div>

        <Link
          href="/assistant"
          className="flex items-center gap-2 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 whitespace-nowrap self-stretch sm:self-auto justify-center"
        >
          <span>تحدث مع المساعد</span>
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>

      {/* Suggested prompts tags */}
      <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800/80">
        <span className="text-[11px] text-slate-500 flex items-center gap-1 self-center">
          جرب تسأله:
        </span>
        {samplePrompts.map((p, idx) => (
          <Link
            key={idx}
            href={`/assistant?q=${encodeURIComponent(p)}`}
            className="text-xs px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-slate-300 hover:text-white transition-colors"
          >
            "{p}"
          </Link>
        ))}
      </div>
    </div>
  );
}
