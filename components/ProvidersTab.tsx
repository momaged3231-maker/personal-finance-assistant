"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Server,
  Zap,
  Check,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { AI_PROVIDERS, AiProvider } from "@/lib/providers";

type TestResult = { ok: boolean; message: string; detail?: string };
type ChainEntry = { provider: string; baseUrl: string; apiKey: string; model: string };

export default function ProvidersTab({
  notify,
}: {
  notify: (text: string, type?: "success" | "error") => void;
}) {
  const [loading, setLoading] = useState(true);
  const [primary, setPrimary] = useState("openrouter");
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [models, setModels] = useState<Record<string, string>>({});
  const [fallbacks, setFallbacks] = useState<ChainEntry[]>([]);

  const [search, setSearch] = useState("");
  const [configuredOnly, setConfiguredOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [draftKey, setDraftKey] = useState("");
  const [draftModel, setDraftModel] = useState("");
  const [importedModels, setImportedModels] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testingAll, setTestingAll] = useState(false);
  const [testAllProgress, setTestAllProgress] = useState("");

  const isConnected = (p: AiProvider) => Boolean(keys[p.id]);
  const effectiveModel = (p: AiProvider) => models[p.id] || p.model;
  const inChain = (p: AiProvider) => fallbacks.some((f) => f.provider === p.id);

  async function updateSetting(key: string, value: string): Promise<boolean> {
    try {
      const res = await fetch("/api/finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_setting", key, value }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/finance");
        if (res.ok && active) {
          const data = await res.json();
          const s: Record<string, string> = data.settings || {};
          const p = s.ai_provider || "openrouter";
          const k: Record<string, string> = {};
          const m: Record<string, string> = {};
          for (const prov of AI_PROVIDERS) {
            k[prov.id] = s[`ai_key_${prov.id}`] || "";
            m[prov.id] = s[`ai_model_${prov.id}`] || "";
          }
          if (s.ai_api_key && !k[p]) k[p] = s.ai_api_key;
          if (s.ai_model && !m[p]) m[p] = s.ai_model;
          if (active) {
            setPrimary(p);
            setKeys(k);
            setModels(m);
            if (s.ai_fallbacks) {
              try {
                const parsed = JSON.parse(s.ai_fallbacks) as ChainEntry[];
                if (Array.isArray(parsed)) {
                  setFallbacks(parsed.filter((f) => f && f.provider && f.baseUrl));
                }
              } catch {
                // ignore malformed
              }
            }
          }
          if (s.ai_api_key && !s[`ai_key_${p}`]) {
            updateSetting(`ai_key_${p}`, s.ai_api_key);
          }
        }
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function toggleExpand(p: AiProvider) {
    if (expandedId === p.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(p.id);
    setDraftKey(keys[p.id] || "");
    setDraftModel(effectiveModel(p));
    setImportedModels([]);
  }

  async function persistProvider(p: AiProvider, asPrimary: boolean) {
    const key = draftKey.trim();
    const model = draftModel.trim() || p.model;
    setSaving(true);
    try {
      const pairs: Array<[string, string]> = [];
      if (key) pairs.push([`ai_key_${p.id}`, key]);
      if (model !== (models[p.id] || "")) pairs.push([`ai_model_${p.id}`, model]);
      if (asPrimary || p.id === primary) {
        pairs.push(["ai_provider", p.id], ["ai_base_url", p.baseUrl], ["ai_model", model]);
        if (key) pairs.push(["ai_api_key", key]);
      }
      if (pairs.length === 0) {
        notify("مفيش تغييرات لحفظها", "error");
        return;
      }
      for (const [k, v] of pairs) {
        const ok = await updateSetting(k, v);
        if (!ok) throw new Error("فشل حفظ إعدادات المزود");
      }
      setKeys((prev) => ({ ...prev, [p.id]: key || prev[p.id] || "" }));
      setModels((prev) => ({ ...prev, [p.id]: model }));
      if (asPrimary) setPrimary(p.id);
      if (key && inChain(p)) {
        const next = fallbacks.map((f) =>
          f.provider === p.id ? { ...f, apiKey: key, model } : f
        );
        setFallbacks(next);
        await updateSetting("ai_fallbacks", JSON.stringify(next));
      }
      notify(asPrimary ? `${p.label} بقى المزود الأساسي` : `تم حفظ إعدادات ${p.label}`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "فشل الحفظ", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleChain(p: AiProvider, enable: boolean) {
    const key = keys[p.id];
    if (enable && !key) {
      notify(`أدخل مفتاح ${p.label} أولاً (اضغط على البطاقة)`, "error");
      return;
    }
    const next = enable
      ? [
          ...fallbacks.filter((f) => f.provider !== p.id),
          { provider: p.id, baseUrl: p.baseUrl, apiKey: key, model: effectiveModel(p) },
        ]
      : fallbacks.filter((f) => f.provider !== p.id);
    setFallbacks(next);
    const ok = await updateSetting("ai_fallbacks", JSON.stringify(next));
    if (!ok) {
      notify("فشل حفظ السلسلة", "error");
      return;
    }
    notify(enable ? `${p.label} انضم لسلسلة الاحتياط` : `${p.label} خرج من السلسلة`);
  }

  async function importModels(p: AiProvider) {
    setImporting(true);
    try {
      const key = draftKey.trim() || keys[p.id] || "";
      const headers: Record<string, string> = {};
      if (key) headers["Authorization"] = `Bearer ${key}`;
      const res = await fetch(`${p.baseUrl.replace(/\/+$/, "")}/models`, { headers });
      if (!res.ok) throw new Error("فشل الاتصال بالمزود — تأكد من المفتاح");
      const json = await res.json();
      const ids = (json.data || [])
        .map((m: { id?: string }) => m.id)
        .filter((id: unknown): id is string => typeof id === "string" && id.length > 0);
      if (ids.length === 0) throw new Error("المزود لم يرجع أي موديلات");
      setImportedModels(ids);
      notify(`تم استيراد ${ids.length} موديل من ${p.label}! اختر من الصندوق.`);
    } catch (e) {
      notify(e instanceof Error ? e.message : "فشل استيراد الموديلات", "error");
    } finally {
      setImporting(false);
    }
  }

  async function testProvider(p: AiProvider): Promise<boolean> {
    const key = draftKey.trim() || keys[p.id] || "";
    const model = draftModel.trim() || effectiveModel(p);
    if (!key) {
      setTestResults((prev) => ({ ...prev, [p.id]: { ok: false, message: "أدخل المفتاح أولاً" } }));
      return false;
    }
    setTestingId(p.id);
    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: p.id, baseUrl: p.baseUrl, apiKey: key, model }),
      });
      const json = await res.json();
      const ok = Boolean(json.ok);
      setTestResults((prev) => ({
        ...prev,
        [p.id]: { ok, message: json.message || "انتهى الاختبار", detail: json.detail },
      }));
      return ok;
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [p.id]: { ok: false, message: "حصل خطأ أثناء محاولة الاختبار." },
      }));
      return false;
    } finally {
      setTestingId(null);
    }
  }

  async function testAll() {
    const targets = AI_PROVIDERS.filter(isConnected);
    if (!targets.length) {
      notify("مفيش مزودات متصلة للاختبار — افتح بطاقة مزود واحفظ مفتاحه الأول", "error");
      return;
    }
    setTestingAll(true);
    let pass = 0;
    let fail = 0;
    for (let i = 0; i < targets.length; i++) {
      const p = targets[i];
      setTestAllProgress(`جارٍ اختبار ${p.label} (${i + 1}/${targets.length})...`);
      const ok = await testProvider(p);
      if (ok) pass++;
      else fail++;
    }
    setTestingAll(false);
    setTestAllProgress("");
    notify(`اكتمل الاختبار: نجح ${pass} · فشل ${fail}`, fail > 0 ? "error" : "success");
  }

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-3xl flex items-center justify-center gap-3 text-slate-400 min-h-[240px]">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
        <span className="text-sm">جاري تحميل المزودين...</span>
      </div>
    );
  }

  const connectedCount = AI_PROVIDERS.filter(isConnected).length;
  const freeTotal = AI_PROVIDERS.filter((p) => p.group === "free").length;
  const creditTotal = AI_PROVIDERS.filter((p) => p.group === "credit").length;
  const paidTotal = AI_PROVIDERS.filter((p) => p.group === "paid").length;
  const q = search.trim().toLowerCase();
  const filtered = AI_PROVIDERS.filter((p) => {
    if (configuredOnly && !isConnected(p)) return false;
    if (q && !p.label.toLowerCase().includes(q) && !p.desc.toLowerCase().includes(q)) return false;
    return true;
  });
  const groups: Array<{ id: "free" | "credit" | "paid"; title: string; sub: string; list: AiProvider[] }> = [
    {
      id: "free",
      title: "مزودات مجانية (Free Tier)",
      sub: "حصص مجانية متجددة — بعضها يحتاج مفتاحاً مجانياً بدون بطاقة.",
      list: filtered.filter((p) => p.group === "free"),
    },
    {
      id: "credit",
      title: "كريدت ترحيبي (يتطلب بطاقة)",
      sub: "كريدت لمرة واحدة عند التسجيل — بعد نفاده دفع.",
      list: filtered.filter((p) => p.group === "credit"),
    },
    {
      id: "paid",
      title: "مدفوع (Paid)",
      sub: "يتطلب رصيداً في حسابك.",
      list: filtered.filter((p) => p.group === "paid"),
    },
  ];

  const chips = [
    { label: "الإجمالي", count: AI_PROVIDERS.length, cls: "bg-rose-500/15 text-rose-300 border-rose-500/30", dot: "bg-rose-400" },
    { label: "المتصل", count: connectedCount, cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", dot: "bg-emerald-400" },
    { label: "في السلسلة", count: fallbacks.length, cls: "bg-amber-500/15 text-amber-300 border-amber-500/30", dot: "bg-amber-400" },
    { label: "مجاني", count: freeTotal, cls: "bg-sky-500/15 text-sky-300 border-sky-500/30", dot: "bg-sky-400" },
    { label: "كريدت", count: creditTotal, cls: "bg-violet-500/15 text-violet-300 border-violet-500/30", dot: "bg-violet-400" },
    { label: "مدفوع", count: paidTotal, cls: "bg-orange-500/15 text-orange-300 border-orange-500/30", dot: "bg-orange-400" },
  ];

  function renderCard(p: AiProvider) {
    const connected = isConnected(p);
    const isPrimary = p.id === primary;
    const chain = inChain(p);
    const open = expandedId === p.id;
    const res = testResults[p.id];
    return (
      <div
        key={p.id}
        onClick={() => toggleExpand(p)}
        className={`rounded-2xl border p-3 cursor-pointer transition-all ${
          open
            ? "bg-slate-900 border-indigo-500/60"
            : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black text-white shrink-0"
            style={{ backgroundColor: p.color }}
          >
            {p.letter}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-white truncate">{p.label}</span>
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${connected ? "bg-emerald-400" : "bg-slate-600"}`}
              />
              {res &&
                (res.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                ))}
            </div>
            <span
              className={`block text-[11px] font-bold ${connected ? "text-emerald-300" : "text-slate-500"}`}
            >
              {connected ? "متصل ✅" : "بدون اتصال"}
            </span>
            <span className="block text-[10px] text-slate-500 truncate">{p.desc}</span>
            {p.tos && (
              <span
                title={p.tosNote}
                className={`mt-1 inline-block px-1.5 py-0.5 rounded-md text-[9px] font-bold ${
                  p.tos === "ok" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"
                }`}
              >
                {p.tos === "ok" ? "شروط: مسموحة" : "شروط: تحقق ⚠"}
              </span>
            )}
          </div>
          <div
            className="flex flex-col items-end gap-1.5 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {isPrimary ? (
              <span className="px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold border border-indigo-500/40">
                الأساسي
              </span>
            ) : (
              <button
                role="switch"
                aria-checked={chain}
                title={chain ? "في السلسلة — اضغط للإخراج" : "أضف لسلسلة الاحتياط"}
                onClick={() => toggleChain(p, !chain)}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${
                  chain ? "bg-emerald-500" : "bg-slate-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                    chain ? "left-[18px]" : "left-0.5"
                  }`}
                />
              </button>
            )}
          </div>
        </div>

        {open && (
          <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5" onClick={(e) => e.stopPropagation()}>
            <p className="text-[11px] text-slate-400">{p.keyHint}</p>
            <input
              type="password"
              dir="ltr"
              value={draftKey}
              onChange={(e) => setDraftKey(e.target.value)}
              placeholder={keys[p.id] ? `${p.placeholder} (محفوظ — اتركه كما هو للحفاظ عليه)` : p.placeholder}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
            />
            {importedModels.length > 0 ? (
              <select
                value={draftModel}
                onChange={(e) => setDraftModel(e.target.value)}
                dir="ltr"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {draftModel && !importedModels.includes(draftModel) && (
                  <option value={draftModel}>{draftModel} (الحالي)</option>
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
                dir="ltr"
                value={draftModel}
                onChange={(e) => setDraftModel(e.target.value)}
                placeholder={p.model}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            )}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => importModels(p)}
                disabled={importing}
                className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                {importing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {importing ? "جاري الاستيراد..." : "استيراد الموديلات"}
              </button>
              <button
                onClick={() => testProvider(p)}
                disabled={testingId === p.id}
                className="py-2 px-3.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 disabled:opacity-50 text-emerald-300 text-xs font-bold flex items-center gap-1.5 border border-emerald-500/30 transition cursor-pointer"
              >
                {testingId === p.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                {testingId === p.id ? "جاري الاختبار..." : "اختبار الاتصال"}
              </button>
              <button
                onClick={() => persistProvider(p, false)}
                disabled={saving}
                className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                حفظ
              </button>
              {!isPrimary && (
                <button
                  onClick={() => persistProvider(p, true)}
                  disabled={saving}
                  className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  اجعله الأساسي
                </button>
              )}
            </div>
            {res && (
              <div
                className={`px-3 py-2.5 rounded-xl border text-xs leading-relaxed ${
                  res.ok
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  {res.ok ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  )}
                  <div>
                    <p>{res.message}</p>
                    {res.detail && (
                      <p className="mt-1 font-mono text-[10px] opacity-70 break-all" dir="ltr">
                        {res.detail}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-rose-400" />
            المزودين
          </h2>
          <p className="text-xs text-slate-400 mt-1">إدارة اتصالات مزودات الذكاء الاصطناعي</p>
        </div>
        <button
          onClick={testAll}
          disabled={testingAll}
          className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer"
        >
          {testingAll ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          )}
          {testingAll ? testAllProgress || "جاري الاختبار..." : "اختبار الكل"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن مزود..."
            className="w-full pr-9 pl-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button
          onClick={() => setConfiguredOnly((v) => !v)}
          className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
            configuredOnly
              ? "bg-indigo-600/20 border-indigo-500 text-indigo-300"
              : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800"
          }`}
        >
          <span
            className={`relative w-8 h-4 rounded-full transition-colors ${configuredOnly ? "bg-indigo-500" : "bg-slate-700"}`}
          >
            <span
              className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                configuredOnly ? "left-[17px]" : "left-0.5"
              }`}
            />
          </span>
          المهيأ فقط
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <span
            key={c.label}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold ${c.cls}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {c.label} <span className="font-black">{c.count}</span>
          </span>
        ))}
      </div>

      {groups.map(
        (g) =>
          g.list.length > 0 && (
            <div key={g.id} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {g.title}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        g.id === "free"
                          ? "bg-sky-500/20 text-sky-300"
                          : g.id === "credit"
                            ? "bg-violet-500/20 text-violet-300"
                            : "bg-orange-500/20 text-orange-300"
                      }`}
                    >
                      {g.list.filter(isConnected).length}/{g.list.length} متصل
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{g.sub}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {g.list.map(renderCard)}
              </div>
            </div>
          )
      )}

      {filtered.length === 0 && (
        <div className="py-10 text-center text-slate-500 text-sm">
          لا يوجد مزود مطابق لبحثك {configuredOnly ? "بدون مفتاح محفوظ" : ""}.
        </div>
      )}
    </div>
  );
}
