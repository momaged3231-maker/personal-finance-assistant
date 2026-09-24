"use client";

import { Wallet, Landmark, Smartphone, Coins } from "lucide-react";
import { formatEgp, Account } from "@/lib/types";

interface BalanceCardsProps {
  accounts: Account[];
  totalBalance: number;
}

export default function BalanceCards({ accounts, totalBalance }: BalanceCardsProps) {
  function getAccountIcon(name: string) {
    if (name.includes("كاش") && !name.includes("فودافون")) {
      return { icon: Wallet, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" };
    }
    if (name.includes("بنك")) {
      return { icon: Landmark, color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/20" };
    }
    if (name.includes("فودافون")) {
      return { icon: Smartphone, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/20" };
    }
    return { icon: Coins, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" };
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-300">أرصدة الحسابات</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">إجمالي الفلوس:</span>
          <span className="text-sm font-extrabold text-blue-400">
            {formatEgp(totalBalance)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {accounts.map((acc) => {
          const style = getAccountIcon(acc.name);
          const Icon = style.icon;
          return (
            <div
              key={acc.id}
              className="glass-card p-4 rounded-2xl flex items-center justify-between hover:border-slate-700 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl ${style.bg} ${style.border} border flex items-center justify-center ${style.color}`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">
                    {acc.name}
                  </span>
                  <span className="text-base font-black text-white">
                    {formatEgp(acc.balance)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
