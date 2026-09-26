import OpenAI from "openai";
import { requireSupabase } from "./supabase";
import {
  getAccounts,
  getDailySummary,
  getMonthlySummary,
  getRecentTransactions,
  getExpenseCategoriesBreakdown,
  getSettings,
  getDebts,
  getSavingsGoals,
  getCategoryBudgets,
  parseBankNotification,
  updateSetting,
  getTodayDateString,
  formatEgp,
  egpToPiastres,
  piastresToEgp,
  gamEyaFreqLabel,
  gamEyaFreqAdvLabel,
  gamEyaInstallmentFreqLabel,
  gamEyaPeriodUnit,
  gamEyaPeriodUnitPlural,
} from "./finance";
import { getActiveRecurringBills, getUpcomingBills } from "./bills";
import {
  ParsedAction,
  ParsedActionType,
  AssistantResponse,
  Account,
} from "./types";

export type { ParsedAction, ParsedActionType, AssistantResponse, Account };

export interface AiProviderConfig {
  provider: string;
  apiKey: string;
  baseURL?: string;
  model: string;
}

// AI provider settings are admin-only: the config is resolved from the admin
// user's settings so every client's assistant uses the system-wide provider.
// Falls back to the requesting user's own settings, then env keys, then defaults.
export async function getAiProviderConfig(userId = 1): Promise<AiProviderConfig> {
  const client = requireSupabase();
  const { data: adminRow } = await client
    .from("users")
    .select("id")
    .eq("is_admin", true)
    .limit(1)
    .maybeSingle();
  const configOwnerId = ((adminRow?.id as number | undefined) ?? userId) as number;
  const settings = await getSettings(configOwnerId);
  const provider = settings.ai_provider || "openai";
  const apiKey =
    settings.ai_api_key ||
    settings.openai_key ||
    (provider === "openrouter" ? process.env.OPENROUTER_API_KEY : "") ||
    process.env.OPENAI_API_KEY ||
    "";
  const baseURL =
    settings.ai_base_url ||
    (provider === "openrouter" ? "https://openrouter.ai/api/v1" : undefined);
  const model =
    settings.ai_model ||
    (provider === "openrouter" ? "openrouter/auto" : "gpt-4o-mini");
  return { provider, apiKey, baseURL, model };
}

// Initialize OpenAI-compatible client (works with OpenAI or OpenRouter) if key is set
async function getOpenAIClient(userId = 1): Promise<OpenAI | null> {
  const { apiKey, baseURL } = await getAiProviderConfig(userId);
  if (!apiKey) return null;
  return new OpenAI({ apiKey, baseURL });
}

export interface AiMessageRow {
  id: number;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

// Load the last N conversation messages for a user (oldest → newest)
export async function getConversationHistory(userId = 1, limit = 20): Promise<AiMessageRow[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("ai_messages")
    .select("id, role, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data || []) as AiMessageRow[]).reverse();
}

// Persist a conversation turn into ai_messages (silently ignore failures)
export async function saveAiMessage(userId: number, role: "user" | "assistant" | "system", content: string): Promise<void> {
  try {
    const client = requireSupabase();
    await client.from("ai_messages").insert({ user_id: userId, role, content });
  } catch (e) {
    console.error("Failed to save ai message:", e instanceof Error ? e.message : e);
  }
}

// Map stored history rows into chat completions messages
function mapHistoryToMessages(history: AiMessageRow[]): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  return history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role, content: m.content }));
}

// Normalize Arabic letters (hamza variants, taa marbuta, alef maqsura) for robust pattern matching
export function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u0652]/g, "") // tashkeel
    .replace(/[أإآ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ى/g, "ي");
}

// Convert Eastern Arabic numerals (٠-٩) and common Arabic number words to standard number
export function parseArabicNumber(text: string): number | null {
  if (!text) return null;

  // Replace eastern arabic numerals
  const easternDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  let cleaned = text;
  easternDigits.forEach((digit, index) => {
    cleaned = cleaned.replaceAll(digit, index.toString());
  });

  // Check for common Arabic words
  const wordMap: Record<string, number> = {
    "ألفين": 2000,
    "الفين": 2000,
    "ألف": 1000,
    "الف": 1000,
    "خمسمية": 500,
    "خمسمائة": 500,
    "أربعمية": 400,
    "اربعمية": 400,
    "تلتمية": 300,
    "ثلاثمائة": 300,
    "ميتين": 200,
    "مائتين": 200,
    "مية": 100,
    "مائة": 100,
    "تسعين": 90,
    "تمانين": 80,
    "ثمانين": 80,
    "سبعين": 70,
    "ستين": 60,
    "خمسين": 50,
    "أربعين": 40,
    "اربعين": 40,
    "تلاتين": 30,
    "ثلاثين": 30,
    "عشرين": 20,
    "عشرة": 10,
    "خمسة": 5,
  };

  for (const [word, val] of Object.entries(wordMap)) {
    if (cleaned.includes(word)) {
      // If there's no digit matched, use this
      const digitMatch = cleaned.match(/\d+(\.\d+)?/);
      if (!digitMatch) return val;
    }
  }

  const match = cleaned.match(/\d+(\.\d+)?/);
  if (match) {
    return parseFloat(match[0]);
  }

  return null;
}

// ParsedAction & AssistantResponse come from ./types (re-exported above)

// ------------------------------------------------------------------
// Financial Intelligence: "المتاح بعد الالتزامات" + "أثر أي قرار"
// ------------------------------------------------------------------
export interface ObligationsOverview {
  totalBalance: number; // piastres
  totalObligations: number; // piastres
  available: number; // piastres
  billsUpcoming: Array<{ name: string; amount: number; due: string }>;
  debtsPending: Array<{ title: string; amount: number; due?: string | null }>;
}

function firstOfMonth(dateStr: string): string {
  return dateStr.substring(0, 7) + "-01";
}

function firstOfNextMonth(dateStr: string): string {
  const [y, m] = dateStr.split("-").slice(0, 2).map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

// Sum of known financial commitments (recurring bills due this month + unpaid debts you owe)
export async function getObligationsOverview(userId = 1): Promise<ObligationsOverview> {
  const accounts = await getAccounts(userId);
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  const today = getTodayDateString();
  const monthStart = firstOfMonth(today);
  const nextMonthStart = firstOfNextMonth(today);

  const bills = await getActiveRecurringBills(userId);
  const billsUpcoming = bills
    .filter((b) => b.next_due_date >= monthStart && b.next_due_date < nextMonthStart)
    .map((b) => ({ name: b.name, amount: b.amount, due: b.next_due_date }));

  const debts = await getDebts(userId);
  const debtsPending = (debts as Array<Record<string, unknown>>)
    .filter((d) => d.type === "i_owe" && d.status === "pending")
    .map((d) => {
      const amount = Number(d.amount) || 0;
      const paid = Number(d.paid_amount) || 0;
      return {
        title: String(d.title || "دين مستحق"),
        amount: Math.max(amount - paid, 0),
        due: (d.due_date as string | null) || null,
      };
    });

  const billsTotal = billsUpcoming.reduce((s, b) => s + b.amount, 0);
  const debtsTotal = debtsPending.reduce((s, d) => s + d.amount, 0);
  const totalObligations = billsTotal + debtsTotal;

  return {
    totalBalance,
    totalObligations,
    available: totalBalance - totalObligations,
    billsUpcoming,
    debtsPending,
  };
}

// ------------------------------------------------------------------
// Day / month helpers
// ------------------------------------------------------------------
function daysInCurrentMonth(): { day: number; total: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return { day: now.getDate(), total: new Date(year, month + 1, 0).getDate() };
}

// Next practical due date for a bill with day_of_month (handles months already passed)
export function computeNextDueDate(dayOfMonth: number, base = new Date()): string {
  const safeDay = Math.min(Math.max(dayOfMonth || 1, 1), 28);
  const candidate = new Date(base.getFullYear(), base.getMonth(), safeDay);
  if (candidate < new Date(base.getFullYear(), base.getMonth(), base.getDate())) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  const y = candidate.getFullYear();
  const m = String(candidate.getMonth() + 1).padStart(2, "0");
  const d = String(candidate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Extract a person's name from an Arabic command like «ضيف دين 300 لمحمد» / «من دين محمد»
function extractPersonName(raw: string): string | undefined {
  const prefixed = raw.match(/(?:ل|لم|من|عند|عن|مع)\s*([\u0600-\u06FF]{3,})/i);
  if (prefixed) {
    const name = prefixed[1];
    if (!/^(دين|قرض|جديدة|جديد|البنك|الكاش|فودافون|مصروف|عملية|سجائر|اكل|مدة|لمدة|شهور|اشهر|شهر|الشهر|قسط|كل|عليك|عليا)/i.test(name)) {
      return name;
    }
  }
  const afterDebt = raw.match(/دين\s+([\u0600-\u06FF]{3,})/i);
  if (afterDebt) {
    const name = afterDebt[1];
    if (!/^(من|و|عن|ل)/i.test(name)) return name;
  }
  return undefined;
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

// Extract (person → amount) pairs from a multi-debt command like
// «سجل لي 3 ديون: لمحمد 500 ولأحمد 300» or single «عندي دين 500 لمحمد»
function extractDebtPairs(raw: string): Array<{ person: string; amount: number }> {
  const s = (raw || "").replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
  const segs = s
    .split(/[،,؛;]|:\s*|(?:\s*و(?:ل|لم)\s*)/)
    .map((t) => t.trim())
    .filter(Boolean);
  const pairs: Array<{ person: string; amount: number }> = [];
  for (const seg of segs) {
    const digitsSeg = seg.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));
    const m =
      digitsSeg.match(/(?:ل|لم|عند|من|سجل)\s*([\u0600-\u06FF]{3,})\s*(\d+(?:\.\d+)?)/i) ||
      digitsSeg.match(/(\d+(?:\.\d+)?)\s*(?:جنيه|ج\.م|ججم|ج)?\s*(?:ل|لم)\s*([\u0600-\u06FF]{3,})/i) ||
      digitsSeg.match(/^([\u0600-\u06FF]{3,})\s*(\d+(?:\.\d+)?)$/i);
    if (!m) continue;
    const a = m[1];
    const b = m[2];
    const person = /^[\u0600-\u06FF]/.test(a) ? a : b;
    const amount = parseFloat(/^[\u0600-\u06FF]/.test(a) ? b : a);
    if (
      person &&
      !/^(دين|ديون|سجل|اضيف|ضيف|لي|عندي|معايا|قرض|كل|ال|مدة|لمدة|شهور|اشهر|شهر|الشهر|قسط|استحقاق)/i.test(person) &&
      isFinite(amount) &&
      amount > 0
    ) {
      pairs.push({ person, amount });
    }
  }
  return pairs;
}

// ------------------------------------------------------------------
// Gam'eya (جمعية) structure parsing — cyclic savings club
// "جمعية قسطها 1000 شهريا لمدة 10 شهور وقبضي في الشهر الخامس"
// ------------------------------------------------------------------
function gamEyaReceiptDateFromNow(
  receiptPeriod: number,
  installmentDay = 1,
  frequency: "daily" | "weekly" | "monthly" = "monthly"
): string {
  const now = new Date();
  if (frequency === "monthly") {
    const target = new Date(now.getFullYear(), now.getMonth() + (receiptPeriod - 1), 1);
    return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(Math.max(1, Math.min(installmentDay, 28))).padStart(2, "0")}`;
  }
  const target = new Date(now);
  target.setDate(now.getDate() + (frequency === "weekly" ? (receiptPeriod - 1) * 7 : receiptPeriod - 1));
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(Math.max(1, target.getDate())).padStart(2, "0")}`;
}

const AR_ORDINALS: Array<[RegExp, number]> = [
  [/الاول|الأول|اول\b|\bواحد\b/, 1],
  [/التاني|الثاني|ثاني\b|\bاتنين\b/, 2],
  [/التالت|الثالث|ثالث\b|\bتلاته\b|\bتلاتة\b/, 3],
  [/الرابع|\bأربعه\b|\bأربعة\b|\bاربع\b/, 4],
  [/الخامس|\bخمسه\b|\bخمسة\b/, 5],
  [/السادس|\bسته\b|\bستة\b/, 6],
  [/السابع|\bسبع(?:ة|ه)\b/, 7],
  [/التامن|الثامن|\bثمانيه\b|\bثمانية\b/, 8],
  [/التاسع|\bتسعه\b|\bتسعة\b/, 9],
  [/العاشر|\bعشره\b|\bعشرة\b/, 10],
];

/** Tries to extract a strict gam'eya structure (installment + cycle periods, optionally receipt period/day/date). Returns null if not strict. */
function parseGamEyaStructure(
  raw: string
): null | {
  installment: number;
  months: number;
  receiptMonth?: number;
  installmentDay?: number;
  receiptDate?: string;
  frequency?: "daily" | "weekly" | "monthly";
} {
  const q = raw.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));

  let installment: number | undefined;
  const installMatch =
    q.match(/قسط(ها|ي| الشهري| الشهريه|ه)?\s*(?:بـ?|هو|يساوي| بتاعتها)?\s*(\d+(?:\.\d+)?)/i) ||
    q.match(/(\d+(?:\.\d+)?)\s*(?:جنيه|جنية|ج\.م)?\s*(?:شهريا|شهري\b|شهريه|كل\s*شهر|في\s*ال?شهر\b|اسبوع(?:ي|ى|ية)?\b|كل\s*اسبوع|يومي|يومى|كل\s*يوم)/i) ||
    q.match(/(\d+(?:\.\d+)?)\s*(?:جنيه|جنية|ج\.م)\s*.*?(?:ال?قسط|على\s*ال?شهر)/i);
  if (installMatch) installment = Number(installMatch[installMatch.length - 1]);
  if (!installment) {
    const bare = q.match(/(?:جمعية|جامعية|جمعيه)\s*(?:بالمبلغ|بـ?|بقيمة|)\s*(\d+(?:\.\d+)?)/i);
    if (bare) installment = Number(bare[1]);
  }
  if (!installment || !isFinite(installment) || installment <= 0) return null;

  let months: number | undefined;
  const monthsMatch =
    q.match(/(?:على|لمدة|لـ?|مدتها|عدد)\s*(\d{1,3})\s*(?:شهور|اشهر|شهر\b|أسابيع|اسابيع|اسبوع(?:ات)?\b|أيام|ايام|يوم\b|دورات|مرات)/i) ||
    q.match(/(\d{1,3})\s*(?:شهور|اشهر\b|أسابيع|اسابيع|اسبوع(?:ات)?\b|أيام|ايام\b|دورات)/i);
  if (monthsMatch) months = Number(monthsMatch[1]);
  if (!months || !isFinite(months) || months <= 0) return null;

  let frequency: "daily" | "weekly" | "monthly" = "monthly";
  if (/اسبوع|اسبوعي|اسبوعى|اسبوعية|اسبوعياً|كل\s*اسبوع|على\s*ال?اسبوع|بالاسبوع|اسبوعين/i.test(q)) {
    frequency = "weekly";
  } else if (/يومي|يومى|يومية|يومياً|يوميا|كل\s*يوم|على\s*ال?يوم|بالنهار|بالروتين\s*اليومي/i.test(q)) {
    frequency = "daily";
  }

  let receiptMonth: number | undefined;
  const receiptAnchor = q.match(/(قبضي|اقبض|هقبض|بستلم|باخد\s*ال?قبض|القبض|ميعاد\s*ال?قبض|شهر\s*ال?قبض)/i);
  if (receiptAnchor && receiptAnchor.index !== undefined) {
    const tail = q.slice(receiptAnchor.index, receiptAnchor.index + 40);
    for (const [re, n] of AR_ORDINALS) {
      if (re.test(tail)) {
        receiptMonth = n;
        break;
      }
    }
    if (!receiptMonth) {
      const digit = tail.match(/(\d{1,2})/);
      if (digit) receiptMonth = Number(digit[1]);
    }
  }

  let installmentDay: number | undefined;
  const dayMatch = q.match(/(?:يوم|بيوم|كل\s*شهر\s*يوم)\s*(\d{1,2})/i);
  if (dayMatch) installmentDay = Number(dayMatch[1]);

  let receiptDate: string | undefined;
  const dateMatch = q.match(/بتاريخ\s*(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})(?:\s*[\/\-\.]\s*(\d{2,4}))?/i);
  if (dateMatch) {
    const dd = Number(dateMatch[1] || "1");
    const mm = Number(dateMatch[2] || "1");
    let yyyy = dateMatch[3] ? Number(dateMatch[3]) : new Date().getFullYear();
    if (yyyy < 100) yyyy = 2000 + yyyy;
    receiptDate = `${yyyy}-${String(mm).padStart(2, "0")}-${String(Math.min(28, dd)).padStart(2, "0")}`;
  }

  return { installment, months, receiptMonth, installmentDay, receiptDate, frequency };
}

// ------------------------------------------------------------------
// FEATURE: Budget alerts (category limits crossed / near limit)
// ------------------------------------------------------------------
export async function getBudgetAlertsText(userId = 1): Promise<{ text: string; warnings: Array<{ category: string; spent: number; limit: number; percent: number; exceeded: boolean }> }> {
  const budgets = await getCategoryBudgets(undefined, userId);
  const warnings = budgets.filter((b) => b.is_warning || b.is_exceeded).map((b) => ({
    category: b.category,
    spent: b.spent_amount,
    limit: b.monthly_limit,
    percent: b.percentage,
    exceeded: b.is_exceeded,
  }));
  if (warnings.length === 0) {
    return { text: "مفيش تصنيف عدّى أو قرب من حده الشهر ده ✅", warnings };
  }
  const lines = warnings.map((w) =>
    w.exceeded
      ? `⚠️ **${w.category}** خلصت حدك الشهري: صرفت ${formatEgp(w.spent)} من ${formatEgp(w.limit)} (${w.percent}%)`
      : `⚠️ **${w.category}** قربت تعدّي الحد: صرفت ${formatEgp(w.spent)} من ${formatEgp(w.limit)} (${w.percent}%)`
  );
  return { text: lines.join("\n"), warnings };
}

// ------------------------------------------------------------------
// FEATURE: Spending pace forecast ("وتيرة الصرف")
// ------------------------------------------------------------------
export async function getSpendingPaceInfo(userId = 1): Promise<string> {
  const { day, total } = daysInCurrentMonth();
  const month = await getMonthlySummary(undefined, userId);
  const ov = await getObligationsOverview(userId);
  const avg = day > 0 ? month.expense / day : 0;
  const remaining = total - day;
  const projected = Math.round(month.expense + avg * remaining * 100) / 100;
  const daysFunded = avg > 0 ? Math.floor(ov.available / avg) : remaining;

  let text =
    `وتيرة صرفك الشهر ده 🏃\n` +
    `• صرفت حتى الآن (اليوم ${day} من ${total}): ${formatEgp(month.expense)}\n` +
    `• متوسط صرفك اليومي: ${formatEgp(avg)}\n` +
    `• لو كمّلت بنفس الوتيرة، مصاريفك هتوصل آخر الشهر ≈ ${formatEgp(projected)}\n`;
  if (ov.available > 0) {
    text += `• المتاح بعد الالتزامات (${formatEgp(ov.available)}) هيكفّي تقريباً **${daysFunded} يوم** بالوتيرة دي\n`;
  }
  text += `\n(أرقام تقديرية على أساس المصروفات المسجلة بس)`;
  return text;
}

// ------------------------------------------------------------------
// FEATURE: Daily smart brief (لمحة ذكية)
// ------------------------------------------------------------------
export async function getSmartBrief(userId = 1): Promise<string> {
  const today = await getDailySummary(undefined, userId);
  const month = await getMonthlySummary(undefined, userId);
  const accounts = await getAccounts(userId);
  const ov = await getObligationsOverview(userId);
  const upcoming = await getUpcomingBills(userId, 14);
  const debts = await getDebts(userId);
  const goals = await getSavingsGoals(userId);
  const budgetAlerts = await getBudgetAlertsText(userId);
  const pace = await getSpendingPaceInfo(userId);
  const total = accounts.reduce((s, a) => s + a.balance, 0);

  const lines: string[] = [];
  lines.push(`🧠 **لمحتك المالية الذكية** (${getTodayDateString()})`);
  lines.push(``);
  lines.push(`💵 إجمالي فلوسك: ${formatEgp(total)}`);
  lines.push(
    `   • الكاش: ${formatEgp(accounts.find((a) => a.name.includes("كاش") && !a.name.includes("فودافون"))?.balance || 0)}`
  );
  lines.push(
    `   • البنك: ${formatEgp(accounts.find((a) => a.name.includes("بنك"))?.balance || 0)}`
  );
  lines.push(
    `   • فودافون كاش: ${formatEgp(accounts.find((a) => a.name.includes("فودافون"))?.balance || 0)}`
  );
  lines.push(``);
  lines.push(`📆 النهارده: دخل ${formatEgp(today.income)} / مصروف ${formatEgp(today.expense)}`);
  lines.push(
    `📊 الشهر: دخل ${formatEgp(month.income)} / مصروف ${formatEgp(month.expense)} / الصافي ${month.net >= 0 ? "+" : ""}${formatEgp(month.net)}`
  );
  lines.push(``);
  if (upcoming.length > 0) {
    lines.push(`🔔 فواتير قدامك (خلال 14 يوم):`);
    for (const b of upcoming.slice(0, 5)) {
      lines.push(`   • ${b.name}: ${formatEgp(b.amount)} (فاضل ${b.days_until_due} يوم)`);
    }
  } else {
    lines.push(`🔔 مفيش فواتير مستحقة قريب ✅`);
  }
  const pendingDebts = (debts as Array<Record<string, unknown>>).filter(
    (d) => d.status === "pending" && d.type === "i_owe"
  );
  if (pendingDebts.length > 0) {
    lines.push(`💳 ديون مستحقة عليك: ${pendingDebts.slice(0, 3).map((d) => `${d.title} (${formatEgp(Math.max((Number(d.amount) || 0) - (Number(d.paid_amount) || 0), 0))})`).join("، ")}`);
  }
  lines.push(``);
  lines.push(budgetAlerts.text);
  lines.push(``);
  lines.push(pace);
  if ((goals as Array<Record<string, unknown>>).length > 0) {
    lines.push(``);
    lines.push(`🎯 أهدافك الحالية:`);
    for (const g of (goals as Array<Record<string, unknown>>).slice(0, 3)) {
      const current = Number(g.current_amount) || 0;
      const target = Number(g.target_amount) || 0;
      const pct = target > 0 ? Math.round((current / target) * 100) : 0;
      lines.push(`   • ${g.title}: ${formatEgp(current)} من ${formatEgp(target)} (${pct}%)`);
    }
  }
  lines.push(``);
  lines.push(`أنا معاك في أي حاجة ❤️ — قولي «لمحتك» في أي وقت.`);
  return lines.join("\n");
}

// ------------------------------------------------------------------
// FEATURE: Persistent habits memory (settings key "ai_habits")
// ------------------------------------------------------------------
interface HabitStore {
  categories: Record<string, number>;
  accounts: Record<string, number>;
}

async function readHabitStore(userId: number): Promise<HabitStore> {
  const settings = await getSettings(userId);
  try {
    const parsed = JSON.parse(settings.ai_habits || "{}");
    return {
      categories: parsed.categories || {},
      accounts: parsed.accounts || {},
    };
  } catch {
    return { categories: {}, accounts: {} };
  }
}

export async function updateHabitsWithAction(userId: number, action: ParsedAction): Promise<void> {
  try {
    const store = await readHabitStore(userId);
    let kind = action.category || "أخرى";
    if (action.type === "budget_set") kind = action.description || "أخرى";

    if (kind && kind !== "أخرى") {
      store.categories[kind] = (store.categories[kind] || 0) + 1;
    }
    if (action.accountName && !action.accountName.includes("تحويل")) {
      store.accounts[action.accountName] = (store.accounts[action.accountName] || 0) + 1;
    }

    for (const key of ["categories", "accounts"] as const) {
      const sorted = Object.entries(store[key]).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 8) {
        const trimmed: Record<string, number> = {};
        for (const [k, v] of sorted.slice(0, 8)) trimmed[k] = v;
        store[key] = trimmed;
      }
    }

    await updateSetting("ai_habits", JSON.stringify(store), userId);
  } catch (e) {
    console.error("Failed to update habits:", e instanceof Error ? e.message : e);
  }
}

export async function getHabitsText(userId = 1): Promise<string> {
  const store = await readHabitStore(userId);
  const cats = Object.entries(store.categories).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const accs = Object.entries(store.accounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const parts: string[] = [];
  if (cats.length) parts.push(`أكتر تصنيفاتك تكراراً: ${cats.map(([n, c]) => `${n} (${c} مرة)`).join("، ")}`);
  if (accs.length) parts.push(`حساباتك المفضلة: ${accs.map(([n, c]) => `${n} (${c} مرة)`).join("، ")}`);
  return parts.length ? parts.join(" — ") : "لسه بجمع عاداتك، سجّل عمليات وهافهمك أكتر";
}

// ------------------------------------------------------------------
// ACTION_JSON helpers (shared between chat pipeline & receipt scan)
// ------------------------------------------------------------------
function toEgpNum(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return isFinite(n) ? n : 0;
}

function buildActionFromRaw(raw: Record<string, unknown>, accounts: Account[]): ParsedAction {
  const type = (String(raw.type || "") || "expense") as ParsedActionType;
  const amountEgp = toEgpNum(raw.amountEgp ?? raw.amount);
  const amount = egpToPiastres(amountEgp);
  const description = String(raw.description || "").trim() || "عملية";
  let category = String(raw.category || "").trim();
  if (/سوبر|هايبر|ماركت|كارفور|متجر|تسوق|هدوم|ملابس|مشتريات/i.test(category) && !/طعام/.test(category)) {
    category = /هدوم|ملابس|تسوق|مشتريات/i.test(category) ? "تسوق ومشتريات" : "طعام ومشروبات";
  }
  if (!category) category = "أخرى";
  const accountNameRaw = String(raw.accountName || "").trim();

  const cashAcc = accounts.find((a) => a.name.includes("كاش") && !a.name.includes("فودافون"));
  const targetAcc =
    accounts.find((a) => accountNameRaw && a.name.includes(accountNameRaw)) ||
    cashAcc ||
    accounts[0] ||
    null;

  let toAcc: Account | undefined;
  if (type === "transfer") {
    toAcc = accounts.find((a) => targetAcc && a.id !== targetAcc.id) || accounts[1];
  }

  const freq = String(raw.frequency || "");
  const validFreq: Array<"weekly" | "monthly" | "quarterly" | "yearly"> = ["weekly", "monthly", "quarterly", "yearly"];
  const dayOfMonthRaw = Number(raw.dayOfMonth);

  return {
    type,
    amount,
    amountEgp,
    description,
    category,
    accountId: targetAcc?.id || 1,
    accountName: targetAcc?.name || "الكاش",
    toAccountId: toAcc?.id,
    toAccountName: toAcc?.name,
    personName: raw.personName ? String(raw.personName) : undefined,
    dueDate: raw.dueDate ? String(raw.dueDate) : undefined,
    debtKind: (["gam_eya", "i_owe", "owed_to_me"].includes(String(raw.debtKind)) ? (String(raw.debtKind) as ParsedAction["debtKind"]) : undefined),
    frequency: validFreq.includes(freq as never) ? (freq as ParsedAction["frequency"]) : undefined,
    dayOfMonth: isFinite(dayOfMonthRaw) && dayOfMonthRaw > 0 ? dayOfMonthRaw : undefined,
    targetAmount: raw.targetAmountEgp !== undefined ? egpToPiastres(toEgpNum(raw.targetAmountEgp)) : undefined,
    newAmount: type === "transaction_update" ? amount : undefined,
    newCategory: type === "transaction_update" ? category : undefined,
    transactionId: raw.transactionId ? Number(raw.transactionId) : undefined,
    requiresConfirmation: true,
    confirmationMessage: "",
  };
}

// Extract ACTION_JSON from a model reply and build the ParsedAction (if any)
export function parseActionReply(reply: string, accounts: Account[], fallbackText = ""): AssistantResponse {
  if (!reply.includes("ACTION_JSON:")) return { text: reply };
  const parts = reply.split("ACTION_JSON:");
  const messageText = parts[0].trim() || fallbackText;
  try {
    const raw = JSON.parse(parts[1].trim());
    if (raw && raw.error) {
      return { text: (messageText && messageText !== fallbackText ? messageText + "\n" : "") + String(raw.error) };
    }
    const action = buildActionFromRaw(raw || {}, accounts);
    action.confirmationMessage = messageText;
    return { text: messageText, action };
  } catch (e) {
    console.error("Failed to parse action json", e);
    return { text: reply };
  }
}

// ------------------------------------------------------------------
// FEATURE: Receipt / notification scanning (vision)
// ------------------------------------------------------------------
export async function analyzeReceiptImage(imageDataUrl: string, userId = 1): Promise<AssistantResponse> {
  const config = await getAiProviderConfig(userId);
  const openai = await getOpenAIClient(userId);
  if (!openai || !config.apiKey) {
    throw new Error("الموديل غير مهيأ — حط API key من الإعدادات الأول");
  }

  const accounts = await getAccounts(userId);
  const prompt =
    `أنت محلل فواتير مصري. اقرأ الفاتورة/الإيصال في الصورة واستخرج عملية الشراء الرئيسية الواحدة.\n` +
    `رجع JSON بس بالشكل ده:\n` +
    `ACTION_JSON:{"type":"expense","amountEgp":رقم,"description":"وصف قصير بالعربي","category":"التصنيف"}\n` +
    `التصنيف من: طعام ومشروبات / مواصلات وبنزين / فواتير والتزامات / صحة وعلاج / سجائر / تسوق ومشتريات / أخرى.\n` +
    `لو مش قادر تقرا الصورة رجع: ACTION_JSON:{"error":"..."}`;

  const buildChat = () => {
    const params: Record<string, unknown> = {
      model: config.model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      max_tokens: 800,
    };
    if (!/\/?o[134](-|$)/i.test(config.model)) {
      params.temperature = 0.1;
    }
    return params;
  };

  // Free routers can be flaky — retry once if the model didn't return an ACTION_JSON
  for (let attempt = 0; attempt < 2; attempt++) {
    const completion = await openai.chat.completions.create(buildChat() as never);
    const reply = completion.choices[0]?.message?.content || "";
    const parsed = parseActionReply(reply, accounts, "قريت الفاتورة، جاهز أسجلها:");
    if (parsed.action || attempt === 1) return parsed;
  }
  return { text: "قرأت الفاتورة لكن الموديل رجع شكل تاني — جرب تاني أو ارفع صورة أوضح." };
}

// ------------------------------------------------------------------
// FEATURE: Bank / InstaPay / Vodafone notification → ParsedAction
// ------------------------------------------------------------------
export function notificationToAction(text: string, accounts: Account[]): ParsedAction | null {
  const parsed = parseBankNotification(text);
  if (!parsed || parsed.amountEgp <= 0) return null;

  let acc = accounts.find((a) => a.name.includes(parsed.accountName));
  if (!acc) {
    acc =
      parsed.accountName.includes("فودافون") || /فودافون|vodafone/i.test(parsed.sourceText)
        ? accounts.find((a) => a.name.includes("فودافون")) || accounts[0]
        : accounts.find((a) => a.name.includes("بنك")) || accounts[0];
  }
  if (!acc) return null;

  const type: ParsedActionType = parsed.type === "income" ? "income" : parsed.type === "transfer" ? "transfer" : "expense";
  return {
    type,
    amount: parsed.amount,
    amountEgp: parsed.amountEgp,
    description: parsed.description,
    category: parsed.category,
    accountId: acc.id,
    accountName: acc.name,
    requiresConfirmation: true,
    confirmationMessage:
      `قريت الإشعار البنكي ده 📲\n` +
      `${type === "expense" ? "💸" : "💰"} ${parsed.amountEgp} جنيه\n` +
      `📝 ${parsed.description} (${parsed.category})\n` +
      `🏦 الحساب: ${acc.name}\n\nتأكيد التسجيل؟`,
  };
}

// Local Egyptian Arabic Parser & Financial Query Engine
export async function handleLocalEgyptianQuery(userPrompt: string, userId = 1): Promise<AssistantResponse> {
  const rawQuery = userPrompt.trim();
  const query = normalizeArabic(rawQuery);
  const accounts = await getAccounts(userId);
  const cashAcc = accounts.find((a) => a.name.includes("كاش") && !a.name.includes("فودافون")) || accounts[0];
  const bankAcc = accounts.find((a) => a.name.includes("بنك")) || accounts[1];
  const vfAcc = accounts.find((a) => a.name.includes("فودافون")) || accounts[2];

  const hasRecurrenceHint = /كل\s*شهر|شهري|شهرية|دورية|يوم\s*[0-9٠-٩]{1,2}/i.test(query);

  // 0a. Structured gam'eya (جمعية): قسط شهري + عدد شهور + موعد القبض
  // "دخلت جمعية قسطها 1000 شهريا لمدة 10 شهور وقبضي في الشهر الخامس"
  const gamEyaQuery = /جامعية|جمعية|جامعيه|جمعيه/i.test(query);
  const gamStructure = gamEyaQuery ? parseGamEyaStructure(rawQuery) : null;
  if (gamEyaQuery && gamStructure) {
    const gamPersonName =
      extractPersonName(rawQuery) ||
      (rawQuery.match(/جمعية(?:\s+ال)?ه\s+([\u0600-\u06FF]{3,})/i) || [])[1] ||
      (rawQuery.match(/امين(?:ها|ه)?\s+([\u0600-\u06FF]{3,})/i) || [])[1];
    const effectiveName = gamPersonName;
    const pot = gamStructure.installment * gamStructure.months;
    const gamFreq = gamStructure.frequency || "monthly";
    const dueDate =
      gamStructure.receiptDate ||
      (gamStructure.receiptMonth
        ? gamEyaReceiptDateFromNow(gamStructure.receiptMonth, gamStructure.installmentDay || 1, gamFreq)
        : undefined);
    const lines = [
      `جمعية (نظام القبض ${gamEyaFreqLabel(gamFreq)}) 💳`,
      `قسط ${gamEyaFreqAdvLabel(gamFreq)}: ${gamStructure.installment} جنيه × ${gamStructure.months} ${gamEyaPeriodUnitPlural(gamFreq)}`,
      `إجمالي القبض: ${pot} جنيه`,
    ];
    if (gamStructure.receiptMonth) {
      lines.push(`📅 دور القبض (${gamEyaPeriodUnit(gamFreq)}): ${gamStructure.receiptMonth}${dueDate ? ` — بتاريخ ${dueDate}` : ""}`);
    }
    if (gamStructure.installmentDay) {
      lines.push(
        `📆 ميعاد السداد ${
          gamFreq === "weekly" ? "أسبوعياً" : gamFreq === "daily" ? "يومياً" : "كل شهر"
        }${gamFreq === "daily" ? "" : `: يوم ${gamStructure.installmentDay}`}`
      );
    }
    lines.push(`📝 ${effectiveName ? `جمعية: ${effectiveName}` : "جمعية جديدة"}`);
    lines.push(`تأكيد الحفظ؟`);
    return {
      text: "وصلني، جاهز أسجل الجمعية بالتفاصيل دي:",
      action: {
        type: "gam_eya_create",
        amount: egpToPiastres(pot),
        amountEgp: pot,
        description: `جمعية${effectiveName ? `: ${effectiveName}` : ""}`,
        category: "ديون وقروض",
        accountId: cashAcc.id,
        accountName: cashAcc.name,
        personName: effectiveName,
        monthlyInstallment: egpToPiastres(gamStructure.installment),
        totalMonths: gamStructure.months,
        receiptMonth: gamStructure.receiptMonth,
        dayOfMonth: gamStructure.installmentDay,
        dueDate,
        frequency: gamFreq,
        requiresConfirmation: true,
        confirmationMessage: lines.join("\n"),
      },
    };
  }

  // 0. Bank / InstaPay / Vodafone Cash notification pasting:
  // "قرأت إشعار البنك: تم خصم 200 ج.م من حسابك لدى المتجر..."
  const isBankNotification =
    /انستاباي|instapay|فودافون كاش|vodafone cash|vodafone|عزيزي العميل|تم خصم مبلغ|تم استلام مبلغ|خصم من حساب|حسابك الجاري|دفع فوري|حوالة فورية|عملية شراء|معاملة بنكية|اعتمادات|الأهلي|البنك الأهلي|cip|wallet|دفع إلكتروني|الكتروني/i.test(query);

  if (isBankNotification) {
    const action = notificationToAction(rawQuery, accounts);
    if (action) {
      return {
        text: "وصلني الإشعار، جاهز أسجله كعملية:",
        action,
      };
    }
  }

  // 1. Check for Expense Recording Commands:
  // "سجل 75 جنيه سجائر", "صرفت ٢٠ جنيه لبن رايب", "دفعت ٥٠ بنزين", "اشتريت ب 30 شاي"
  const isExpenseCommand =
    (/^(سجل|صرفت|دفعت|اشتريت|ادفع|خصم)($|\s|[0-9])/i.test(query) ||
      (/(جنيه|ج\.م)/.test(query) && /(سجائر|اكل|شرب|غدا|عشا|فطار|بنزين|مواصلات|تاكسي|اوبر|قهوة|شاي|سوبرماركت|لبن)/i.test(query))) &&
    !/دين|ديون|قرض|سداد|مستحقات|هدف|ادخار|توفير/i.test(query) &&
    !(hasRecurrenceHint && /فاتورة|اشتراك/i.test(query)) &&
    !/جامعية|جمعية|جامعيه|جمعيه/i.test(query);

  const isIncomeCommand =
    (/^(دخلت|جالي|قبضت|كسبت|استلمت|دخل|ايراد)($|\s|[0-9])/i.test(query) ||
      (/(صيانة|مرتب|شغل|ارباح|عمولة)/i.test(query) && /(دخلت|قبضت|جالي)/i.test(query))) &&
    !/جامعية|جمعية|جامعيه|جمعيه/i.test(query);

  const isTransferCommand =
    /^(حولت|حول|نقلت|انقل|ابعت|تحويل)($|\s|[0-9])/i.test(query) &&
    !/هدف|ادخار|توفير|دين|ديون/i.test(query);

  if (isExpenseCommand && !isIncomeCommand && !isTransferCommand) {
    const amountNum = parseArabicNumber(query);
    if (amountNum && amountNum > 0) {
      // Extract description
      let desc = query
        .replace(/^(سجل|صرفت|دفعت|اشتريت|ادفع|خصم)\s*/i, "")
        .replace(/(\d+(\.\d+)?|٠|١|٢|٣|٤|٥|٦|٧|٨|٩)+\s*(جنيه|ج\.م|ج)?\s*/gi, "")
        .replace(/(من\s+الكاش|من\s+البنك|من\s+فودافون|كاش|بنك)/gi, "")
        .trim();

      if (!desc) desc = "مصروف";

      // Detect category
      let category = "أخرى";
      if (/سجائر|دخان|شيشة/i.test(query)) category = "سجائر";
      else if (/اكل|طعام|شرب|غدا|عشا|فطار|ساندوتش|قهوة|شاي|كافيه|سوبرماركت|لبن/i.test(query)) category = "طعام ومشروبات";
      else if (/بنزين|مواصلات|تاكسي|اوبر|ميكروباص|مترو/i.test(query)) category = "مواصلات وبنزين";
      else if (/فاتورة|نت|كهربا|غاز|مياه|ايجار/i.test(query)) category = "فواتير والتزامات";
      else if (/دوا|صيدلية|دكتور|علاج/i.test(query)) category = "صحة وعلاج";
      else if (/شراء|تسوق|هدوم|ملابس/i.test(query)) category = "تسوق ومشتريات";

      // Account detection
      let selectedAcc = cashAcc;
      if (/بنك|فيزا|البنك/i.test(query)) selectedAcc = bankAcc;
      else if (/فودافون|محفظة/i.test(query)) selectedAcc = vfAcc;

      const piastres = egpToPiastres(amountNum);

      return {
        text: `تمام، جاهز أسجل لك المصروف ده:`,
        action: {
          type: "expense",
          amount: piastres,
          amountEgp: amountNum,
          description: desc,
          category,
          accountId: selectedAcc.id,
          accountName: selectedAcc.name,
          requiresConfirmation: true,
          confirmationMessage: `هسجل:\n💰 ${amountNum} جنيه\n📝 ${desc} (${category})\n🏦 من حساب: ${selectedAcc.name}\n\nتأكيد الحفظ؟`,
        },
      };
    }
  }

  // 2. Check for Income Recording Commands:
  // "دخلت 600 صيانة", "جالي 12000 مرتب", "قبضت 500 شغل اضافي"
  if (isIncomeCommand) {
    const amountNum = parseArabicNumber(query);
    if (amountNum && amountNum > 0) {
      let category = "دخل إضافي";
      let desc = "دخل إضافي";

      if (/عمولة|عموله|نسبة|نسبه|مصنعية|صيانة|صيانه/i.test(query)) {
        category = "عمولة";
        desc = "إيراد عمولة";
      } else if (/مرتب|راتب/i.test(query)) {
        category = "مرتب";
        desc = "مرتب شهري";
      }

      // Check account
      let selectedAcc = cashAcc;
      if (/بنك|فيزا/i.test(query)) selectedAcc = bankAcc;
      else if (/فودافون/i.test(query)) selectedAcc = vfAcc;

      const piastres = egpToPiastres(amountNum);

      return {
        text: `تمام، هسجل الإيراد الجديد:`,
        action: {
          type: "income",
          amount: piastres,
          amountEgp: amountNum,
          description: desc,
          category,
          accountId: selectedAcc.id,
          accountName: selectedAcc.name,
          requiresConfirmation: true,
          confirmationMessage: `هسجل إيراد:\n💰 ${amountNum} جنيه\n📝 ${desc} (${category})\n📥 لحساب: ${selectedAcc.name}\n\nتأكيد الحفظ؟`,
        },
      };
    }
  }

  // 3. Check for Transfer Commands:
  // "حولت 500 للبنك", "حول 200 من الكاش لفودافون كاش"
  if (isTransferCommand) {
    const amountNum = parseArabicNumber(query);
    if (amountNum && amountNum > 0) {
      let fromAcc = cashAcc;
      let toAcc = bankAcc;

      if (/فودافون/i.test(query) && (/كاش/i.test(query) || /من الكاش/i.test(query))) {
        fromAcc = cashAcc;
        toAcc = vfAcc;
      } else if (/من البنك/i.test(query) && /للكاش|كاش/i.test(query)) {
        fromAcc = bankAcc;
        toAcc = cashAcc;
      } else if (/فودافون/i.test(query)) {
        toAcc = vfAcc;
      }

      const piastres = egpToPiastres(amountNum);

      return {
        text: `تمام، جاهز أنفذ التحويل المالي:`,
        action: {
          type: "transfer",
          amount: piastres,
          amountEgp: amountNum,
          description: `تحويل من ${fromAcc.name} إلى ${toAcc.name}`,
          category: "تحويل",
          accountId: fromAcc.id,
          accountName: fromAcc.name,
          toAccountId: toAcc.id,
          toAccountName: toAcc.name,
          requiresConfirmation: true,
          confirmationMessage: `تحويل مالي:\n💸 ${amountNum} جنيه\nمن: ${fromAcc.name}\nإلى: ${toAcc.name}\n\nتأكيد العملية؟`,
        },
      };
    }
  }

  // 3(b). "امسح آخر مصروف" / "ارجع آخر عملية" / "امسح عملية بنزين"
  const isDeleteCommand =
    /(امسح|احذف|حذف|اشيل|الغي|ارجع|رجع|رجّع|انسي)/i.test(query) &&
    /(آخر|اخر|عملية|مصروف|دخل|معاملة|العمليات)/i.test(query);

  if (isDeleteCommand) {
    const recent = await getRecentTransactions(20, userId);
    if (recent.length === 0) {
      return { text: "مفيش عمليات مسجلة أقدر أمسحها خالص ✅" };
    }
    let target = recent[0];
    const ctx = rawQuery.replace(/امسح|احذف|حذف|اشيل|الغي|ارجع|رجع|رجّع|انسي|آخر|اخر|العمليات|عملية|مصروف|معاملة|دخل/g, "");
    const kw = ctx.trim().replace(/[\.،:؛]/g, "");
    if (kw.length >= 2) {
      const found = recent.find(
        (t) => t.description.includes(kw) || t.category.includes(kw) || t.description.includes(kw.replace(/شهر|يوم|النهارده/g, ""))
      );
      if (found) target = found;
    }
    return {
      text: "جاهز أمسح العملية دي:",
      action: {
        type: "transaction_delete",
        amount: 0,
        amountEgp: 0,
        description: `${target.description} (${target.category})`,
        category: target.category,
        accountId: target.account_id,
        accountName: target.account_name || "",
        transactionId: target.id,
        requiresConfirmation: true,
        confirmationMessage: `هحذف العملية 🗑️\n📝 ${target.description} (${target.category})\n💰 ${formatEgp(target.amount)}\n📅 ${target.date}\n\nمتأكد من الحذف؟`,
      },
    };
  }

  // 3(c). "مش بنزين ده سوبر" → تصحيح آخر عملية
  const correctionMatch = rawQuery.match(/مش\s+(\S+)\s+(?:ده|دي)\s+(.+)/i);
  if (correctionMatch) {
    const recent = await getRecentTransactions(10, userId);
    if (recent.length === 0) {
      return { text: "مفيش عمليات أقدر أعدلها ✅" };
    }
    const target = recent[0];
    const newDesc = correctionMatch[2].trim();
    let newCategory = "أخرى";
    if (/سجائر|دخان|شيشة/i.test(newDesc)) newCategory = "سجائر";
    else if (/اكل|طعام|شرب|غدا|عشا|فطار|قهوة|شاي|سوبرماركت|سوبر|لبن|مطعم|كافيه/i.test(newDesc)) newCategory = "طعام ومشروبات";
    else if (/بنزين|مواصلات|تاكسي|اوبر|مترو|ميكروباص/i.test(newDesc)) newCategory = "مواصلات وبنزين";
    else if (/فاتورة|نت|كهربا|غاز|مياه|ايجار/i.test(newDesc)) newCategory = "فواتير والتزامات";
    else if (/دوا|صيدلية|دكتور|علاج|مستشفى/i.test(newDesc)) newCategory = "صحة وعلاج";
    else if (/هدوم|ملابس|تسوق|شراء|مول/i.test(newDesc)) newCategory = "تسوق ومشتريات";

    return {
      text: "تمام، هعدّل العملية دي:",
      action: {
        type: "transaction_update",
        amount: 0,
        amountEgp: 0,
        description: newDesc,
        category: newCategory,
        accountId: target.account_id,
        accountName: target.account_name || "",
        transactionId: target.id,
        requiresConfirmation: true,
        confirmationMessage:
          `تصحيح آخر عملية ✏️\n` +
          `القديم: ${target.description} (${target.category}) — ${formatEgp(target.amount)}\n` +
          `الجديد: ${newDesc} (${newCategory})\n\n` +
          `(المبلغ والأصل هيفضلوا زي ما هما)\nتأكيد التعديل؟`,
      },
    };
  }

  // 3(d). Debts: إنشاء / سداد / حذف
  const isDebtPaymentPattern =
    /(سددت|سدد|بسدد|دفعت|اديت|ودعت|سداد|دفعة|دفعات)/i.test(query) &&
    /(دين|مستحقات|اللي\s*عليا|قرض)/i.test(query) &&
    /[0-9٠-٩]/.test(query);
  const personName = extractPersonName(rawQuery);
  const debtCreatePattern =
    /(ضيف\s*دين|اضيف\s*دين|سجل\s*(?:لي\s+)?(?:كل\s+)?(?:ال)?(?:دين|ديون)|دين\s+جديد|استلفت|سلفت\s*من|اقترضت|اقرَضتُ|عليا\s+دين|بقيت\s+مديون|سلفني|اقرضني|عندي\s*(?:دين|ديون)|لي\s*(?:دين|ديون)|سجلها|سجله|سجلهم|مديون|استدانت|مطلوب\s*مني)/i;
  const debtPairs = extractDebtPairs(rawQuery);

  if (debtCreatePattern.test(query) || ((/دين|ديون|قرض/i.test(query)) && !isDebtPaymentPattern && !/امسح|احذف|اشيل|الغي/i.test(query))) {
    const amountNum = parseArabicNumber(query);
    if (amountNum && amountNum > 0) {
      let debtKind: ParsedAction["debtKind"] = "i_owe";
      if (/جامعية|جمعية|جامعيه|جمعيه/i.test(query)) debtKind = "gam_eya";
      else if (/مديني|عنده\s+عندي|مستحق\s+لي|دين\s+لي|بستلفني|تسدلي|مداين/i.test(query)) debtKind = "owed_to_me";

      const pair = debtPairs[0];
      const effectiveName = pair ? pair.person : personName;
      const effectiveAmount = pair ? pair.amount : amountNum;

      let dueDate: string | undefined;
      const dueMatch = query.match(/بعد\s+(\d{1,3})\s*يوم/i);
      if (dueMatch) {
        const d = new Date();
        d.setDate(d.getDate() + Number(dueMatch[1]));
        dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      }
      const desc = `دين${effectiveName ? `: ${effectiveName}` : ""}`;
      const kindLabel = debtKind === "gam_eya" ? "جامعية (جمعية)" : debtKind === "owed_to_me" ? "دين مستحق لك" : "دين عليك";
      const extraPairs = debtPairs.length > 1 ? `\nℹ️ في كمان ${debtPairs.length - 1} دين في رسالتك — هسجلهم واحد واحد، قولي «هيا» واكتب التالي.` : "";
      return {
        text: "وصلني، جاهز أسجل الدين:",
        action: {
          type: "debt_create",
          amount: egpToPiastres(effectiveAmount),
          amountEgp: effectiveAmount,
          description: desc,
          category: "ديون وقروض",
          accountId: cashAcc.id,
          accountName: cashAcc.name,
          personName: effectiveName,
          debtKind,
          dueDate,
          requiresConfirmation: true,
          confirmationMessage:
            `${kindLabel} 💳\n` +
            `💵 ${effectiveAmount} جنيه\n` +
            `📝 ${desc}\n` +
            `${dueDate ? `📅 مستحق: ${dueDate}\n` : ""}` +
            (extraPairs ? extraPairs.trim() + "\n" : "") +
            `تأكيد الحفظ؟`,
        },
      };
    } else {
      return {
        text: `تمام، هسجّل الدين ده ليك 📝\nقولي بس التفاصيل بالشكل ده مثلاً:\n• «عندي دين 500 لمحمد»\n• «سجل دين 700 لأحمد استلفته منه»\nوأنا هثبته لك فوراً.`,
      };
    }
  }

  if (isDebtPaymentPattern) {
    const amountNum = parseArabicNumber(query);
    const debts = await getDebts(userId);
    const pending = (debts as Array<Record<string, unknown>>).filter(
      (d) => d.status === "pending" && d.type === "i_owe"
    );
    if (pending.length === 0) return { text: "مفيش ديون مستحقة عليك عشان تسددها ✅" };
    let target = pending[0];
    if (personName) {
      const found = pending.find(
        (d) =>
          String(d.person_name || "").includes(personName) ||
          String(d.title).includes(personName)
      );
      if (found) target = found;
    }
    const remaining = Math.max((Number(target.amount) || 0) - (Number(target.paid_amount) || 0), 0);
    if (!amountNum || amountNum <= 0) {
      return {
        text: `تمام، الدين ده باقي منه ${formatEgp(remaining)} — قولي المبلغ اللي هتدفعه.`,
      };
    }
    const paidAfter = (Number(target.paid_amount) || 0) + egpToPiastres(amountNum);
    return {
      text: "تمام، هسجل الدفعة دي:",
      action: {
        type: "debt_payment",
        amount: egpToPiastres(amountNum),
        amountEgp: amountNum,
        description: String(target.title),
        category: "ديون وقروض",
        accountId: cashAcc.id,
        accountName: cashAcc.name,
        personName,
        entityId: Number(target.id),
        requiresConfirmation: true,
        confirmationMessage:
          `سداد دين 💳\n` +
          `📝 ${target.title}\n` +
          `💵 ${amountNum} جنيه (هيتبقى ${formatEgp(Math.max(remaining - egpToPiastres(amountNum), 0))})\n` +
          `تأكيد السداد؟`,
      },
    };
  }

  const isDebtDeleteCommand = /(امسح|احذف|اشيل|الغي)\s*(الدين|دين)/i.test(query);
  if (isDebtDeleteCommand) {
    const debts = await getDebts(userId);
    const pending = (debts as Array<Record<string, unknown>>).filter(
      (d) => d.type === "i_owe" || d.type === "owed_to_me"
    );
    if (pending.length === 0) return { text: "مفيش ديون تحذفها ✅" };
    let target = pending[0];
    if (personName) {
      const found = pending.find(
        (d) =>
          String(d.person_name || "").includes(personName) ||
          String(d.title).includes(personName)
      );
      if (found) target = found;
    }
    return {
      text: "جاهز أمسح الدين:",
      action: {
        type: "debt_delete",
        amount: 0,
        amountEgp: 0,
        description: String(target.title),
        category: "ديون وقروض",
        accountId: cashAcc.id,
        accountName: cashAcc.name,
        personName,
        entityId: Number(target.id),
        requiresConfirmation: true,
        confirmationMessage: `هحذف الدين 🗑️\n📝 ${target.title} (${formatEgp(Math.max((Number(target.amount) || 0) - (Number(target.paid_amount) || 0), 0))})\n\nمتأكد؟`,
      },
    };
  }

  // 3(e). Savings goals: إنشاء / إيداع / حذف
  const goalCreatePattern =
    /(اعمل|انشئ|انشا|ضيف|ابدأ|نشئ|اسعى)\s*(هدف|ادخار|توفير)|عايز\s*اوفر\s+\d|هدف\s*(توفير|ادخار)\s*\d|استهدف\s+\d|نفسي\s*اوفر\s+\d/i;

  if (goalCreatePattern.test(query)) {
    const amountNum = parseArabicNumber(query);
    if (amountNum && amountNum > 0) {
      let title = "هدف ادخار";
      const titleMatch = rawQuery.match(/(?:لل|لـ|ل)([\u0600-\u06FF]{2,})/i);
      if (titleMatch) title = `ادخار: ${titleMatch[1]}`;
      const forTarget = rawQuery.match(/هدف\s+توفير\s+[\d\.]+\s*([\u0600-\u06FF]{1,})/i);
      if (forTarget) title = `ادخار: ${forTarget[1]}`;
      return {
        text: "هدف جميل! جاهز أعمل الهدف:",
        action: {
          type: "savings_goal_create",
          amount: 0,
          amountEgp: 0,
          description: title,
          category: "ادخار",
          accountId: cashAcc.id,
          accountName: cashAcc.name,
          targetAmount: egpToPiastres(amountNum),
          requiresConfirmation: true,
          confirmationMessage: `هدف ادخار جديد 🎯\n📝 ${title}\n💵 الهدف: ${amountNum} جنيه\n\nتأكيد إنشاء الهدف؟`,
        },
      };
    }
  }

  const isDepositToGoal =
    /(ودعت|حطيت|حولت|ضيف|اديت|بقي)\s*(في|لل|على|ل)?\s*(الهدف|هدف)/i.test(query) ||
    (/(هدف|ادخار)/i.test(query) && /(ودعت|حولت|ضيف|حطيت)/i.test(query));

  if (isDepositToGoal) {
    const amountNum = parseArabicNumber(query);
    const goals = await getSavingsGoals(userId);
    if (goals.length === 0) return { text: "مفيش أهداف ادخار لسه — قولي «اعمل هدف توفير 5000» وهاعملهولك 🎯" };
    let target = (goals as Array<Record<string, unknown>>)[0];
    const kwMatch = rawQuery.match(/هدف\s*([\u0600-\u06FF]{1,})/i);
    if (kwMatch) {
      const found = (goals as Array<Record<string, unknown>>).find((g) =>
        String(g.title).includes(kwMatch[1])
      );
      if (found) target = found;
    }
    if (!amountNum || amountNum <= 0) {
      return { text: `قولي المبلغ اللي هتحوله لهدف «${target.title}» 🎯` };
    }
    return {
      text: "تمام، هودّع للهدف:",
      action: {
        type: "savings_deposit",
        amount: egpToPiastres(amountNum),
        amountEgp: amountNum,
        description: String(target.title),
        category: "ادخار",
        accountId: cashAcc.id,
        accountName: cashAcc.name,
        entityId: Number(target.id),
        requiresConfirmation: true,
        confirmationMessage:
          `إيداع في هدف الادخار 🎯\n📝 ${target.title}\n💵 ${amountNum} جنيه\n(المبلغ من ${cashAcc.name})\n\nتأكيد الإيداع؟`,
      },
    };
  }

  const isGoalDeleteCommand = /(امسح|احذف|اشيل)\s*(الهدف|هدف)/i.test(query);
  if (isGoalDeleteCommand) {
    const goals = await getSavingsGoals(userId);
    if (goals.length === 0) return { text: "مفيش أهداف تحذفها ✅" };
    const target = (goals as Array<Record<string, unknown>>)[0];
    return {
      text: "جاهز أمسح الهدف:",
      action: {
        type: "savings_goal_delete",
        amount: 0,
        amountEgp: 0,
        description: String(target.title),
        category: "ادخار",
        accountId: cashAcc.id,
        accountName: cashAcc.name,
        entityId: Number(target.id),
        requiresConfirmation: true,
        confirmationMessage: `هحذف هدف «${target.title}» 🗑️\n(المبلغ المحفوظ فيه: ${formatEgp(Number(target.current_amount) || 0)})\nمتأكد؟`,
      },
    };
  }

  // 3(f). فواتير دورية
  const billPattern =
    /(ضيف|اضيف|حط|احط|اضف|أضف|سجل|انشئ|اسجل|خطط)\s*(فاتورة|اشتراك)|فاتورة\s*(جديدة|دورية|شهرية|سنوية|اسبوعية|دي)|اشتراك\s*شهري|عندي\s*فاتورة/i;

  if (billPattern.test(query) || (hasRecurrenceHint && /فاتورة|اشتراك/i.test(query))) {
    const amountNum = parseArabicNumber(query);
    if (amountNum && amountNum > 0) {
      let billName = "فاتورة دورية";
      const nameMatch = rawQuery.match(/فاتورة\s+([\u0600-\u06FF]{2,})/i) || rawQuery.match(/([\u0600-\u06FF]{2,})\s*فاتورة/i);
      if (nameMatch) billName = nameMatch[1];
      const freq = /اسبوع/i.test(query) ? ("weekly" as const) : /سنوي|كل\s*سنة/i.test(query) ? ("yearly" as const) : /ربع\s*سنوي/i.test(query) ? ("quarterly" as const) : ("monthly" as const);
      const dayMatch = query.match(/يوم\s*(\d{1,2})/i);
      const dayOfMonth = dayMatch ? Number(dayMatch[1]) : 1;
      const dueDate = computeNextDueDate(dayOfMonth);
      const freqLabel = freq === "weekly" ? "أسبوعي" : freq === "yearly" ? "سنوي" : freq === "quarterly" ? "كل 3 شهور" : "شهري";
      return {
        text: "تمام، هضيف الفاتورة الدورية:",
        action: {
          type: "bill_create",
          amount: egpToPiastres(amountNum),
          amountEgp: amountNum,
          description: billName,
          category: "فواتير والتزامات",
          accountId: cashAcc.id,
          accountName: cashAcc.name,
          frequency: freq,
          dayOfMonth,
          dueDate,
          requiresConfirmation: true,
          confirmationMessage:
            `فاتورة دورية 🧾\n📝 ${billName}\n💵 ${amountNum} جنيه\n🔄 ${freqLabel} (يوم ${dayOfMonth})\n📅 أول استحقاق: ${dueDate}\n\nتأكيد الإضافة؟`,
        },
      };
    }
  }

  // 3(g). حدود الميزانية
  const budgetSetPattern = /(حد\s*مصروف|حد\s*شهري|حد\s*ل|بجيت|ميزانية\s*ل|حدد\s*حد|ضع\s*حد|حط\s*حد)/i;

  if (budgetSetPattern.test(query)) {
    const amountNum = parseArabicNumber(query);
    if (amountNum && amountNum > 0) {
      let cat = "أخرى";
      if (/سجائر|دخان/i.test(query)) cat = "سجائر";
      else if (/اكل|طعام|شرب|مطعم|غدا|عشا|فطار|قهوة|شاي|سوبر/i.test(query)) cat = "طعام ومشروبات";
      else if (/بنزين|مواصلات|تاكسي|اوبر/i.test(query)) cat = "مواصلات وبنزين";
      else if (/فواتير|نت|كهربا|غاز|مياه|ايجار|اشتراكات/i.test(query)) cat = "فواتير والتزامات";
      else if (/دوا|صيدلية|صحة|علاج/i.test(query)) cat = "صحة وعلاج";
      else if (/تسوق|هدوم|ملابس|شراء|مول/i.test(query)) cat = "تسوق ومشتريات";
      return {
        text: "تمام، هحدد الميزانية:",
        action: {
          type: "budget_set",
          amount: egpToPiastres(amountNum),
          amountEgp: amountNum,
          description: cat,
          category: cat,
          accountId: cashAcc.id,
          accountName: cashAcc.name,
          requiresConfirmation: true,
          confirmationMessage: `حد مصاريف شهرية 📊\n📝 التصنيف: ${cat}\n💵 الحد الشهري: ${amountNum} جنيه\n\nتأكيد؟`,
        },
      };
    }
  }

  // 4. Financial Query Answering:
  // "معايا كام؟", "رصيدي كام؟", "إجمالي فلوسي"
  if (/معايا كام|رصيدي كام|اجمالي فلوسي|فلوسي كام|كل الفلوس/i.test(query)) {
    const totalPiastres = accounts.reduce((acc, a) => acc + a.balance, 0);
    const details = accounts.map((a) => `• ${a.name}: ${formatEgp(a.balance)}`).join("\n");
    return {
      text: `إجمالي فلوسك حالياً:\n✨ ${formatEgp(totalPiastres)}\n\nتفاصيل الحسابات:\n${details}`,
    };
  }

  // "رصيدي في البنك كام؟"
  if (/رصيد.*البنك|البنك فيه كام|معايا كام في البنك/i.test(query)) {
    return {
      text: `رصيدك الحالي في البنك:\n🏦 ${formatEgp(bankAcc.balance)}`,
    };
  }

  // "رصيد الكاش كام؟"
  if (/رصيد.*الكاش|الكاش فيه كام|معايا كام كاش/i.test(query)) {
    return {
      text: `الكاش اللي معاك في جيبك حالياً:\n💵 ${formatEgp(cashAcc.balance)}`,
    };
  }

  // "رصيد فودافون كاش؟"
  if (/فودافون|محفظة/i.test(query) && /كام|رصيد/i.test(query)) {
    return {
      text: `رصيد محفظة فودافون كاش:\n📱 ${formatEgp(vfAcc.balance)}`,
    };
  }

  // "صرفت كام النهارده؟"
  if (/صرفت كام النهارده|مصاريف النهارده|صرفت كام اليوم|مصروف النهارده/i.test(query)) {
    const today = await getDailySummary(undefined, userId);
    if (today.expense === 0) {
      return {
        text: `ما صرفتش أي حاجة النهارده خالص! 🎉\nصافي اليوم: +${formatEgp(today.income)}`,
      };
    }
    return {
      text: `مصروفاتك النهارده:\n💸 ${formatEgp(today.expense)}\nودخلك النهارده: ${formatEgp(today.income)}\nصافي اليوم: ${today.net >= 0 ? "+" : ""}${formatEgp(today.net)}`,
    };
  }

  // "دخلت كام النهارده؟"
  if (/دخلت كام النهارده|دخل النهارده|ايراد النهارده|عملت كام النهارده/i.test(query)) {
    const today = await getDailySummary(undefined, userId);
    return {
      text: `إجمالي دخلك النهارده:\n💰 ${formatEgp(today.income)}\n(ومصروفك النهارده: ${formatEgp(today.expense)})`,
    };
  }

  // "أكتر حاجة بصرف عليها إيه؟"
  if (/اكتر حاجة.*بصرف|اكتر مصروف|بصرف فلوسي في ايه/i.test(query)) {
    const breakdown = await getExpenseCategoriesBreakdown(undefined, userId);
    if (breakdown.length === 0) {
      return {
        text: `لسه مفيش مصروفات مسجلة للشهر ده عشان أحللها لك!`,
      };
    }
    const top = breakdown[0];
    const summary = breakdown
      .slice(0, 3)
      .map((b, i) => `${i + 1}. ${b.category}: ${formatEgp(b.total)} (${b.count} عملية)`)
      .join("\n");

    return {
      text: `أكتر حاجة بتصرف عليها الشهر ده هي:\n🔥 **${top.category}** بإجمالي ${formatEgp(top.total)}\n\nأعلى 3 تصنيفات:\n${summary}`,
    };
  }

  // "دخلت كام من العمولات الشهر ده؟"
  if (/عمولة|عموله|صيانة|صيانه/i.test(query) && /الشهر|كام|دخل/i.test(query)) {
    const month = await getMonthlySummary(undefined, userId);
    return {
      text: `إجمالي إيراد العمولات الشهر ده:\n💼 ${formatEgp(month.maintenanceIncome)}\nمن إجمالي دخل شهري قدره: ${formatEgp(month.income)}`,
    };
  }

  // "لمحة ذكية" / "وتيرة الصرف" / "تنبيهات الميزانية"
  if (/لمحة|لمحه|لمحتي|لمحتى|برايف|بروفايل|تقرير\s+شامل|موقفي\s+الكامل|صورة\s+كاملة|صوره\s+كامله/i.test(query)) {
    return { text: await getSmartBrief(userId) };
  }

  if (/تنبيهات|الميزانية\s+كام|الحدود\s+كام|عدى\s+الحد|عديت\s+الحد|تعدي؟ت\s*الحد|فين\s*باقي\s*الحد|باقي\s*من\s*الحد|خلصت\s*الحد|قرب\s*تعدي/i.test(query)) {
    const alerts = await getBudgetAlertsText(userId);
    return { text: `تنبيهات الميزانية الشهرية 🚨\n\n${alerts.text}` };
  }

  if (/وتيرة|معدل\s+الصرف|هخلص\s+الشهر|هكمل\s+الشهر|ادام\s+كام\s+يوم|على\s+وتيرة|تكفيني\s+كام\s+يوم|بكفي|هوصل\s+اخر\s+الشهر|امتى\s+هخلص/i.test(query)) {
    return { text: await getSpendingPaceInfo(userId) };
  }

  // "ملخص الأسبوع" / "ملخص الشهر"
  if (/ملخص|تقرير/i.test(query)) {
    const month = await getMonthlySummary(undefined, userId);
    const today = await getDailySummary(undefined, userId);
    return {
      text: `📊 **ملخصك المالي الحالي:**\n\n• دخل الشهر: ${formatEgp(month.income)}\n  - العمولات والنسب: ${formatEgp(month.maintenanceIncome)}\n  - المرتب: ${formatEgp(month.salaryIncome)}\n• مصروفات الشهر: ${formatEgp(month.expense)}\n• الصافي الشهري: ${month.net >= 0 ? "فائض +" : "عجز "}${formatEgp(month.net)}\n\n• مصروف النهارده: ${formatEgp(today.expense)}`,
    };
  }

  // Saving advice / guidance questions (built from real spending data + quick wins)
  if (/إزاي\s+أقلل|ازاي\s+اقلل|إزاي\s+أوفر|ازاي\s+اوفر|قلل\s+المصاريف|خفض|نصيحة|نصيحني|انصحني|اوفر\s+فلوس|أوفّر/i.test(query)) {
    const breakdown = await getExpenseCategoriesBreakdown(undefined, userId);
    const month = await getMonthlySummary(undefined, userId);
    const topLine =
      breakdown.length > 0
        ? breakdown.slice(0, 3).map((b) => `• ${b.category}: ${formatEgp(b.total)} إجمالي الشهر (${b.count} عملية)`).join("\n")
        : "";
    const advice =
      breakdown.length > 0
        ? `أول خطوة: بص على تلات تصنيفات أكبرهم:\n${topLine}\n\nوبدء بأنشئ حد شهري لكل تصنيف من صفحة الإعدادات (Budgets)، وأي مصروف يعدّي 80% هيجي لك تنبيه وهمّمك متأخرش. `
        : `لسه مفيش مصروفات مسجلة الشهر ده، فأي مصروف بتسجله هيساعدني أديك تحليل أحسن. `;
    return {
      text: `فكرة كويسة نخلي مصروفاتك تتنظم! 💡\n\n${advice}${
        month.expense > 0
          ? `\nصافي الشهر عندك: ${month.net >= 0 ? "فائض +" : "عجز "}${formatEgp(month.net)}`
          : ""
      }\n\nجرب كمان تسجل مصاريفك الصغيرة اليومية (القهوة، المواصلات) وكل ما تسجل أشوفلك نقاط توفير أوتوماتيك.`,
    };
  }

  // ------------------------------------------------------------------
  // 5. & 6. "المتاح بعد الالتزامات" + "قبل ما تدفع… اعرض أثر القرار"
  // ------------------------------------------------------------------
  const isAvailableQuery =
    /متاح|اتفضل|فاضل\s+بعد|بعد الالتزامات|من\s+الالتزامات|اقدر اصرف كام|مش محجوز|محتجز/.test(query);

  const isImpactQueryAttempt =
    /لو\s*(صرفت|دفعت|اشتريت|شريت|خدت|دافعت|صرف|خصمت)\w*\s*\d|هيصلي ايه لو|هقدر اصرف لو|هقدر ادفع|اقدر ادفع|اقدر اشتري/.test(query);

  if (isImpactQueryAttempt && !isAvailableQuery) {
    const amountNum = parseArabicNumber(query);
    if (amountNum && amountNum > 0) {
      const ov = await getObligationsOverview(userId);
      const amountPiastres = egpToPiastres(amountNum);
      const availableAfterPurchase = ov.available - amountPiastres;

      let text =
        `أثر القرار حسب البيانات المسجلة:\n\n` +
        `• رصيدك الحالي: ${formatEgp(ov.totalBalance)}\n` +
        `• الالتزامات القادمة: ${formatEgp(ov.totalObligations)}\n` +
        `• المتاح بعدها: ${formatEgp(Math.max(ov.available, 0))}\n` +
        `• وبعد مصروف ${formatEgp(amountPiastres)}: ${formatEgp(Math.max(availableAfterPurchase, 0))}\n\n`;

      if (availableAfterPurchase >= 0) {
        text += `الموضوع ممكن وفقًا للبيانات المسجلة، لكن هيقلل هامش الأمان عندك.`;
      } else {
        text += `الرقم ده بيعدّي اللي متاح ليك — نسجل مصاريفك الأول ونراجع الصورة مع بعض.`;
      }
      text += `\n(لو عندك مصاريف غير مسجلة، الرقم ممكن يختلف.)`;

      return { text };
    }

    // Impact question without a clear amount → ask for it
    const ov = await getObligationsOverview(userId);
    return {
      text: `يا فندم عايز أجاوبك بدقة، قولي المبلغ:\n💵 المتاح الحالي بعد الالتزامات: ${formatEgp(Math.max(ov.available, 0))}\n\nجرب مثلًا: «لو صرفت 1500 النهارده هيحصلي إيه؟»`,
    };
  }

  if (isAvailableQuery) {
    const ov = await getObligationsOverview(userId);
    const detailLines: string[] = [];
    if (ov.billsUpcoming.length > 0) {
      detailLines.push(ov.billsUpcoming.map((b) => `${b.name}: ${formatEgp(b.amount)}`).join("، "));
    }
    if (ov.debtsPending.length > 0) {
      detailLines.push(ov.debtsPending.map((d) => `${d.title}: ${formatEgp(d.amount)}`).join("، "));
    }

    let text = `المتاح لك بعد الالتزامات المسجلة:\n💵 ${formatEgp(Math.max(ov.available, 0))}`;
    if (ov.totalObligations > 0) {
      text += `\n\nالتزامات الشهر ده (${formatEgp(ov.totalObligations)}):\n• ${detailLines.join("\n• ")}`;
    } else {
      text += `\n\nمفيش التزامات مسجلة عندك الشهر ده — كله ليك. 🎉`;
    }
    text += `\n\n(لو صرفت حاجة زيادة مكتتبهاش، الرقم هيختلف.)`;

    return { text };
  }

  // ------------------------------------------------------------------
  // 7. Financial goals and planning questions
  // ------------------------------------------------------------------
  if (/خطط|هدف|عايز\s+أدخر|ادخار|ادخر|حلم|استثمر|مستقبل/i.test(query)) {
    const accounts = await getAccounts(userId);
    const total = accounts.reduce((acc, a) => acc + a.balance, 0);
    return {
      text: `وصلني! 👌\n\nإجمالي فلوسك الحالي: ${formatEgp(total)}\n\nدي خطة عملية بسيطة:\n• حدد هدف بسيط شهري (مثلاً وفر 10% من دخلك)\n• سجّل هدف في صفحة «الأهداف» وعيّن مبلغ واستمارة\n• كل ما تحوّل أو تودّع فلوس للهدف، سجّلها وهو يبقى يتحدث قدامك\n\nاقدر أساعدك كمان تضع ميزانية شهرية للحاجات الأساسية بدل ما تتسلف.`,
    };
  }

  // Default Egyptian friendly assistant reply
  const accountsShort = accounts.slice(0, 3).map((a) => `${a.name}: ${formatEgp(a.balance)}`).join(" | ");
  return {
    text: `فهمتك يا فندم، ومش فاتني أي حاجة من حسابك الحالي:\n📌 ${accountsShort}\n\nتقدر تسألني بأي طريقة على سبيل المثال:\n• «صرفت كام النهارده؟»\n• «معايا كام في البنك؟»\n• «المتاح بعد الالتزامات كام؟»\n• «لو صرفت 1500 هيحصلي إيه؟»\n• «سجل 75 جنيه سجائر»\n• «دخلت 600 عمولة»\n\nولو قصدك حاجة معينة تاني، قوليها بكلماتك وأنا أرد عليك فوراً.`,
    unhandledByLocal: true,
  };
}

// Full AI Pipeline: Tries OpenAI first if configured, with rich functions; otherwise falls back smoothly to local Egyptian parser
export async function processAssistantMessage(userPrompt: string, userId = 1): Promise<AssistantResponse> {
  const config = await getAiProviderConfig(userId);
  const openai = await getOpenAIClient(userId);

  // Persist the user's message so we can keep a conversation memory
  await saveAiMessage(userId, "user", userPrompt);

  // FAST PATH: RUN THE LOCAL PARSER FIRST — instant & deterministic for the
  // ~20 known intents (expense/income/transfer, debts, goals, bills, budgets,
  // delete/correct, notifications, briefs, pace, alerts). Only free-form
  // questions fall through to the LLM.
  const localResult = await handleLocalEgyptianQuery(userPrompt, userId);
  if (!localResult.unhandledByLocal) {
    if (localResult.text) await saveAiMessage(userId, "assistant", localResult.text);
    return localResult;
  }

  let result: AssistantResponse = localResult;

  if (!openai || !config.apiKey) {
    // No LLM configured → keep the friendly local reply
  } else {
    try {
      const accounts = await getAccounts(userId);
      const today = await getDailySummary(undefined, userId);
      const month = await getMonthlySummary(undefined, userId);
      const topExpenses = await getExpenseCategoriesBreakdown(undefined, userId);
      const recent = await getRecentTransactions(5, userId);
      const obligations = await getObligationsOverview(userId);
      const budgetAlerts = await getBudgetAlertsText(userId);
      const paceInfo = await getSpendingPaceInfo(userId);
      const habitsText = await getHabitsText(userId);
      const upcomingBills = await getUpcomingBills(userId, 30);
      const debtsList = await getDebts(userId);
      const goalsList = await getSavingsGoals(userId);
      // Load previous conversation turns for memory
      const history = await getConversationHistory(userId, 20);

      const systemPrompt = `أنت "صحبي" — المساعد المالي الشخصي الذكي لواحد مصري ("صحبي" بدل ما ينادى "مساعدك المالي اليومي").
اللغة: مصري ودي وسريع وفاهم طبيعة المصاريف في مصر (القهوة، السجائر، البنزين، السوبرماركت، فودافون كاش، العمولات، المرتب).
البيانات المالية الحالية للمستخدم مباشرة من قاعدة البيانات (PostgreSQL):
- تاريخ اليوم: ${today.date}
- إجمالي الكاش في الجيب: ${piastresToEgp(accounts.find(a => a.name.includes("كاش") && !a.name.includes("فودافون"))?.balance || 0)} جنيه
- رصيد البنك: ${piastresToEgp(accounts.find(a => a.name.includes("بنك"))?.balance || 0)} جنيه
- رصيد فودافون كاش: ${piastresToEgp(accounts.find(a => a.name.includes("فودافون"))?.balance || 0)} جنيه
- إجمالي الرصيد بكل الحسابات: ${piastresToEgp(accounts.reduce((sum, a) => sum + a.balance, 0))} جنيه
- دخل النهارده: ${piastresToEgp(today.income)} جنيه
- مصروف النهارده: ${piastresToEgp(today.expense)} جنيه
- صافي النهارده: ${piastresToEgp(today.net)} جنيه
- دخل الشهر حتى الآن: ${piastresToEgp(month.income)} جنيه (منها عمولات: ${piastresToEgp(month.maintenanceIncome)} جنيه، مرتب: ${piastresToEgp(month.salaryIncome)} جنيه)
- مصروف الشهر: ${piastresToEgp(month.expense)} جنيه
- أعلى تصنيفات المصاريف: ${JSON.stringify(topExpenses.slice(0, 3))}
- آخر العمليات: ${JSON.stringify(recent.map(r => ({ type: r.type, amount: piastresToEgp(r.amount), desc: r.description, date: r.date })))}
- إجمالي الالتزامات المسجلة الشهر ده (فواتير دورية + ديون مستحقة): ${piastresToEgp(obligations.totalObligations)} جنيه (${obligations.billsUpcoming.map(b => b.name + ": " + piastresToEgp(b.amount)).join("، ")}${obligations.debtsPending.length > 0 ? " و" + obligations.debtsPending.map(d => d.title + ": " + piastresToEgp(d.amount)).join("، ") : ""})
- المتاح بعد الالتزامات: ${piastresToEgp(Math.max(obligations.available, 0))} جنيه
- تنبيهات الميزانية: ${budgetAlerts.text.replace(/\n/g, " | ")}
- وتيرة الصرف: ${paceInfo.replace(/\n/g, " | ")}
- عادات المستخدم المتكررة: ${habitsText}
- فواتير قادمة (30 يوم): ${upcomingBills.length ? upcomingBills.map((b) => `${b.name} ${piastresToEgp(b.amount)} (فاضل ${b.days_until_due} يوم)`).join("، ") : "لا يوجد"}
- ديون معلقة: ${debtsList && debtsList.length ? debtsList.filter((d) => d.status === "pending").map((d) => `${d.title}: ${piastresToEgp(Math.max((Number(d.amount) || 0) - (Number(d.paid_amount) || 0), 0))}`).join("، ") : "لا يوجد"}
- أهداف الادخار: ${goalsList && goalsList.length ? goalsList.map((g) => `${g.title} (${piastresToEgp(Number(g.current_amount) || 0)} من ${piastresToEgp(Number(g.target_amount) || 0)})`).join("، ") : "لا يوجد"}

القواعد الإلزامية:
1. لو المستخدم طلب تسجيل عملية مالية (مصروف / دخل / تحويل) أو إدارة مالية (دين / هدف ادخار / فاتورة دورية / حد ميزانية / حذف أو تصحيح عملية):
   - استخرج نوع العملية من القايمة اللي تحت
   - رد بصيغة تأكيد واضحة باللهجة المصرية تطلب موافقته قبل التنفيذ
   - ورجع ACTION_JSON واحد بس في نهاية رسالتك بالشكل التالي:
   ACTION_JSON:{"type":"...","amountEgp":المبلغ_بالجنيه,"description":"...","category":"...","accountName":"الكاش|البنك|فودافون كاش",بقية_الحقول}
   الأنواع الممكنة:
   - expense / income / transfer: عملية عادية (amountEgp مطلوب)
   - debt_create: إضافة دين — amountEgp + description (عنوان الدين) + personName (اسم الشخص اختياري) + debtKind من ("i_owe" دين عليك | "owed_to_me" دين مستحق لك | "gam_eya" جامعية/جمعية) + dueDate اختياري بصيغة YYYY-MM-DD
   - gam_eya_create: تسجيل جمعية بنظام القبض — monthlyInstallment (القسط بالجنيه) + totalMonths (عدد الدوارات) + receiptMonth (دور القبض ترتيباً من 1) + dayOfMonth (يوم السداد) + frequency من ("daily" يومي | "weekly" أسبوعي | "monthly" شهري) + dueDate (تاريخ القبض YYYY-MM-DD اختياري) — amount = إجمالي القبض (القسط × الدوارات)
   - debt_payment: سداد دفعة من دين — amountEgp + description (عنوان الدين أو اسم الشخص)
   - debt_delete: حذف دين — description (عنوان الدين)
   - savings_goal_create: هدف ادخار جديد — targetAmountEgp (الهدف الكلي بالجنيه) + description (اسم الهدف)
   - savings_deposit: إيداع في هدف — amountEgp + description (اسم الهدف)
   - savings_goal_delete: حذف هدف — description (اسم الهدف)
   - bill_create: فاتورة دورية — amountEgp + description (اسمها) + frequency من ("weekly"|"monthly"|"quarterly"|"yearly") + dayOfMonth (رقم اليوم 1-28 يعني آخر الشهر) + accountName اختياري
   - budget_set: حد مصروف شهري لتصنيف — amountEgp (الحد الشهري) + description (اسم التصنيف)
   - transaction_delete: حذف آخر عملية أو عملية معينة — description (وصفها أو كلمة «آخر») + transactionId لو عارف رقمها
   - transaction_update: تصحيح عملية — description (الوصف الجديد) + category (التصنيف الجديد) + amountEgp (المبلغ الجديد اختياري) + transactionId لو معروف
2. لو أرسل لك نص إشعار بنكي / انستاباي / فودافون كاش (زي «عزيزي العميل» أو «تم خصم مبلغ»): حلل المبلغ والجهة والحساب وارجع ACTION_JSON expense/income/transfer ببيانات الإشعار مباشرة بدل ما تعتبره كلام عادي.
3. لو كان سؤال عادي عن الفلوس أو الصرف أو الإحصائيات: جاوب فوراً وبتقصير وبالأرقام الحقيقية بدقة وبلهجة مصرية مهذبة ومشجعة (سطرين لثلاثة سطور كحد أقصى)، من غير مقدمات ولا تفكير مطوّل.
4. افتكر سياق المحادثة السابقة (الأسئلة السابقة وردودك) وفيه ردودك والإجراءات اللي حصلت، وخلي ردودك متسقة مع المحادثة. لو سألك شيء زي "وأيه تاني / إزاي؟" اعرف إنه بيكمل على آخر سؤال.
5. لو سأل عن مبلغ أو شيء أنت مش متأكد منه اطلب منه التوضيح ببساطة بدل ما تخبط.
6. لو سأل «المتاح كام؟» أو «اقدر أصرف كام؟»: اعتمد رقم «المتاح بعد الالتزامات» واذكر الالتزامات المسجلة (أسماء المبالغ) اللي داخلة في الخصم.
7. لو سأل «لو صرفت [مبلغ]؟» أو «هقدر أدفع كام؟»: اعرض أثر القرار للأرقام بس (الرصيد الحالي، الالتزامات القادمة، المتاح بعدها، وبعد المصروف المذكور) من غير ما تحكم «اشتري/ماتشتريش»، واضيف دايماً إن النتيجة مبنية على البيانات المسجلة ولو فيه مصاريف غير مسجلة الرقم يختلف.
8. لو سأل «لمحة» أو «برايف» أو «وتيرة الصرف» أو «تنبيهات الميزانية»: استخدم البيانات الموجودة أعلاه (تنبيهات الميزانية / وتيرة الصرف / الفواتير القادمة / الأهداف) ورد بشكل كامل منظم ومفيد.
9. العادات المتكررة موجودة في سطر «عادات المستخدم المتكررة» — اعتمدها لو اتسألت عن نمط صرفك.`;

      const chatParams: Record<string, unknown> = {
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          ...mapHistoryToMessages(history),
          { role: "user", content: userPrompt },
        ],
        max_tokens: 800,
      };
      // O-series reasoning models (o1/o3/o4) don't accept temperature
      if (!/\/?o[134](-|$)/i.test(config.model)) {
        chatParams.temperature = 0.3;
      }
      const completion = await openai.chat.completions.create(chatParams as never);

      const reply = completion.choices[0]?.message?.content || "";

      // Check for ACTION_JSON (parses both old & new action types)
      result = parseActionReply(reply, accounts);
    } catch (error) {
      console.error("OpenAI call failed, falling back to local Egyptian parser", error);
      const msg = error instanceof Error ? error.message : "";
      // Detect low-credit / quota errors so the user knows why the AI isn't reasoning
      if (/402|credits|quota|insufficient|payment/i.test(msg)) {
        result = {
          text: `${localResult.text}\n\n⚠️ ملحوظة صغيرة: الموديل اللي راكب — ${config.model} — محتاج إضافة كريدت في حسابك على OpenRouter عشان يرد عليك بذكاء حقيقي. كل حاجة ماشية تمام على بالمساعد المحلي في أثناء كده. 💪`,
        };
      } else {
        result = localResult;
      }
    }
  }

  // Persist the assistant reply so memory keeps the full conversation
  if (result.text) {
    await saveAiMessage(userId, "assistant", result.text);
  }
  return result;
}