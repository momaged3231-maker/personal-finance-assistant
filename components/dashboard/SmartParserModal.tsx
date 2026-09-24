"use client";

import { useState } from "react";
import { Sparkles, MessageSquare, Check, X, ArrowDownRight, ArrowUpRight, Copy, AlertCircle } from "lucide-react";
import { formatEgp, piastresToEgp, Account } from "@/lib/types";

interface SmartParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onSuccess: () => void;
}

export default function SmartParserModal({
  isOpen,
  onClose,
  accounts,
  onSuccess,
}: SmartParserModalProps) {
  const [smsText, setSmsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedResult, setParsedResult] = useState<{
    type: "income" | "expense" | "transfer";
    amount: number;
    amountEgp: number;
    description: string;
    category: string;
    accountName: string;
  } | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number>(accounts[0]?.id || 1);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const samples = [
    {
      title: "رسالة انستاباي تحويل صادر",
      text: "تم تحويل مبلغ 750.00 EGP من حسابك عبر InstaPay إلى أحمد محمود بنجاح.",
    },
    {
      title: "رسالة مشتريات بطاقة بنك CIB",
      text: "شراء بمبلغ 450.00 ج.م لدى كارفور المعادي باستخدام بطاقة ميزة.",
    },
    {
      title: "رسالة فودافون كاش استلام",
      text: "تم استلام مبلغ 1200 جنيه مصري في محفظة فودافون كاش من رقم 01012345678.",
    },
  ];

  const handleParse = async (textToParse = smsText) => {
    if (!textToParse.trim()) {
      setErrorMsg("يرجى لصق نص الرسالة أولاً");
      return;
    }
    setErrorMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "parse_notification", text: textToParse }),
      });
      const data = await res.json();
      if (data.parsed) {
        setParsedResult(data.parsed);
        // Try auto matching account
        const matchedAcc = accounts.find((a) =>
          a.name.toLowerCase().includes(data.parsed.accountName.toLowerCase()) ||
          data.parsed.accountName.toLowerCase().includes(a.name.toLowerCase())
        );
        if (matchedAcc) {
          setSelectedAccountId(matchedAcc.id);
        }
      }
    } catch {
      setErrorMsg("حدث خطأ أثناء قراءة الرسالة");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTransaction = async () => {
    if (!parsedResult) return;
    setSaving(true);
    setErrorMsg("");

    try {
      const actionType =
        parsedResult.type === "income"
          ? "create_income"
          : parsedResult.type === "transfer"
          ? "create_transfer"
          : "create_expense";

      const payload: Record<string, unknown> = {
        action: actionType,
        amount: parsedResult.amount,
        description: parsedResult.description,
        category: parsedResult.category,
        accountId: selectedAccountId,
        date: new Date().toISOString().substring(0, 10),
      };

      if (parsedResult.type === "transfer") {
        payload.fromAccountId = selectedAccountId;
        payload.toAccountId = accounts.find((a) => a.id !== selectedAccountId)?.id || selectedAccountId;
      }

      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("فشل حفظ المعاملة");
      }

      onSuccess();
      onClose();
    } catch {
      setErrorMsg("تعذر تسجيل المعاملة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                القارئ الذكي لإشعارات البنوك و InstaPay
              </h3>
              <p className="text-xs text-slate-400">
                الصق نص أي رسالة بنكية أو تحويل كاش وسيتم استخراج البيانات فوراً
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
            <span>نص الرسالة أو الإشعار:</span>
            <span className="text-[11px] text-blue-400">يدعم InstaPay, Vodafone Cash, CIB, الأهلي وغيرهم</span>
          </label>
          <textarea
            value={smsText}
            onChange={(e) => setSmsText(e.target.value)}
            placeholder="مثال: تم خصم مبلغ 350.00 ج.م لدى كارفور المعادي عبر كارت فيزا..."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-800 focus:border-blue-500 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition"
          />

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              onClick={() => handleParse()}
              disabled={loading || !smsText.trim()}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/30"
            >
              {loading ? (
                <span className="animate-spin text-sm">⏳</span>
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              تحليل واستخراج البيانات
            </button>

            {/* Quick samples dropdown / chips */}
            <div className="flex gap-1.5 overflow-x-auto text-[11px]">
              {samples.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSmsText(s.text);
                    handleParse(s.text);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 whitespace-nowrap transition"
                >
                  تجربة: {s.title.split(" ")[1]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Parsed Result Preview */}
        {parsedResult && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-blue-500/30 space-y-3 animate-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                تم تحليل الرسالة بنجاح:
              </span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  parsedResult.type === "income"
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : parsedResult.type === "transfer"
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                    : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                }`}
              >
                {parsedResult.type === "income"
                  ? "دخل / إيداع"
                  : parsedResult.type === "transfer"
                  ? "تحويل مالي"
                  : "مصروف"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-500 block mb-0.5">المبلغ المستخرج</span>
                <span className="text-base font-bold text-white">
                  {formatEgp(parsedResult.amount)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-500 block mb-0.5">التصنيف المقترح</span>
                <span className="text-sm font-semibold text-slate-200">
                  {parsedResult.category}
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <span className="text-[11px] text-slate-500 block mb-0.5">البيان / التاجر</span>
              <span className="text-sm text-slate-200">{parsedResult.description}</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">حساب الخصم / الإيداع:</label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (رصيده الحالي: {formatEgp(acc.balance)})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSaveTransaction}
              disabled={saving}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
            >
              {saving ? "جاري الحفظ..." : "تسجيل هذه المعاملة فوراً في حسابي"}
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
