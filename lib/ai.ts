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
  getTodayDateString,
  formatEgp,
  egpToPiastres,
  piastresToEgp,
} from "./finance";
import { getActiveRecurringBills } from "./bills";

export interface AiProviderConfig {
  provider: "openai" | "openrouter";
  apiKey: string;
  baseURL?: string;
  model: string;
}

// Read AI provider config from user settings (with env fallbacks)
export async function getAiProviderConfig(userId = 1): Promise<AiProviderConfig> {
  const settings = await getSettings(userId);
  const provider = (settings.ai_provider || "openai") as AiProviderConfig["provider"];
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

export interface ParsedAction {
  type: "expense" | "income" | "transfer";
  amount: number; // in piastres
  amountEgp: number;
  description: string;
  category: string;
  accountId: number;
  accountName: string;
  toAccountId?: number;
  toAccountName?: string;
  requiresConfirmation: boolean;
  confirmationMessage: string;
}

export interface AssistantResponse {
  text: string;
  action?: ParsedAction;
  data?: Record<string, unknown>;
}

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

// Local Egyptian Arabic Parser & Financial Query Engine
export async function handleLocalEgyptianQuery(userPrompt: string, userId = 1): Promise<AssistantResponse> {
  const rawQuery = userPrompt.trim();
  const query = normalizeArabic(rawQuery);
  const accounts = await getAccounts(userId);
  const cashAcc = accounts.find((a) => a.name.includes("كاش") && !a.name.includes("فودافون")) || accounts[0];
  const bankAcc = accounts.find((a) => a.name.includes("بنك")) || accounts[1];
  const vfAcc = accounts.find((a) => a.name.includes("فودافون")) || accounts[2];

  // 1. Check for Expense Recording Commands:
  // "سجل 75 جنيه سجائر", "صرفت ٢٠ جنيه لبن رايب", "دفعت ٥٠ بنزين", "اشتريت ب 30 شاي"
  const isExpenseCommand =
    /^(سجل|صرفت|دفعت|اشتريت|ادفع|خصم)($|\s|[0-9])/i.test(query) ||
    (/(جنيه|ج\.م)/.test(query) && /(سجائر|اكل|شرب|غدا|عشا|فطار|بنزين|مواصلات|تاكسي|اوبر|قهوة|شاي|سوبرماركت|لبن)/i.test(query));

  const isIncomeCommand =
    /^(دخلت|جالي|قبضت|كسبت|استلمت|دخل|ايراد)($|\s|[0-9])/i.test(query) ||
    (/(صيانة|مرتب|شغل|ارباح|عمولة)/i.test(query) && /(دخلت|قبضت|جالي)/i.test(query));

  const isTransferCommand =
    /^(حولت|حول|نقلت|انقل|ابعت|تحويل)($|\s|[0-9])/i.test(query);

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
  };
}

// Full AI Pipeline: Tries OpenAI first if configured, with rich functions; otherwise falls back smoothly to local Egyptian parser
export async function processAssistantMessage(userPrompt: string, userId = 1): Promise<AssistantResponse> {
  const config = await getAiProviderConfig(userId);
  const openai = await getOpenAIClient(userId);

  // Persist the user's message so we can keep a conversation memory
  await saveAiMessage(userId, "user", userPrompt);

  let result: AssistantResponse;

  if (!openai || !config.apiKey) {
    // Return fast, dependable local Egyptian parsing
    result = await handleLocalEgyptianQuery(userPrompt, userId);
  } else {
    try {
      const accounts = await getAccounts(userId);
      const today = await getDailySummary(undefined, userId);
      const month = await getMonthlySummary(undefined, userId);
      const topExpenses = await getExpenseCategoriesBreakdown(undefined, userId);
      const recent = await getRecentTransactions(5, userId);
      const obligations = await getObligationsOverview(userId);
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

القواعد الإلزامية:
1. لو المستخدم طلب تسجيل مصروف أو دخل أو تحويل:
   - استخرج نوع العملية (expense / income / transfer)
   - المبلغ بالجنيه
   - الوصف والتصنيف
   - الحساب (كاش / بنك / فودافون كاش)
   - رد بصيغة تأكيد واضحة تطلب موافقته قبل التنفيذ:
   "هسجل: [المبلغ] جنيه [الوصف] من [الحساب]. تأكيد؟"
   ورجع JSON في نهاية رسالتك بالشكل التالي:
   ACTION_JSON:{"type":"expense|income|transfer","amount":المبلغ_بالجنيه,"description":"...","category":"...","accountName":"الكاش|البنك|فودافون كاش"}
2. لو كان سؤال عادي عن الفلوس أو الصرف أو الإحصائيات: جاوب فوراً بالأرقام الحقيقية بدقة وبلهجة مصرية مهذبة ومشجعة.
3. افتكر سياق المحادثة السابقة (الأسئلة السابقة وردودك) وفيه ردودك والإجراءات اللي حصلت، وخلي ردودك متسقة مع المحادثة. لو سألك شيء زي "وأيه تاني / إزاي؟" اعرف إنه بيكمل على آخر سؤال.
4. لو سأل عن مبلغ أو شيء أنت مش متأكد منه اطلب منه التوضيح ببساطة بدل ما تخبط.
5. لو سأل «المتاح كام؟» أو «اقدر أصرف كام؟»: اعتمد رقم «المتاح بعد الالتزامات» واذكر الالتزامات المسجلة (أسماء المبالغ) اللي داخلة في الخصم.
6. لو سأل «لو صرفت [مبلغ]؟» أو «هقدر أدفع كام؟»: اعرض أثر القرار للأرقام بس (الرصيد الحالي، الالتزامات القادمة، المتاح بعدها، وبعد المصروف المذكور) من غير ما تحكم «اشتري/ماتشتريش»، واضيف دايماً إن النتيجة مبنية على البيانات المسجلة ولو فيه مصاريف غير مسجلة الرقم يختلف.`;

      const chatParams: Record<string, unknown> = {
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          ...mapHistoryToMessages(history),
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
      };
      // O-series reasoning models (o1/o3/o4) don't accept temperature
      if (!/\/?o[134](-|$)/i.test(config.model)) {
        chatParams.temperature = 0.3;
      }
      const completion = await openai.chat.completions.create(chatParams as never);

      const reply = completion.choices[0]?.message?.content || "";

      // Check if ACTION_JSON was returned
      if (reply.includes("ACTION_JSON:")) {
        const parts = reply.split("ACTION_JSON:");
        const messageText = parts[0].trim();
        try {
          const actionRaw = JSON.parse(parts[1].trim());
          const amountEgp = Number(actionRaw.amount);
          const piastres = egpToPiastres(amountEgp);

          const targetAcc = accounts.find((a) => a.name.includes(actionRaw.accountName)) || accounts[0];
          let toAcc: (typeof accounts)[number] | undefined = undefined;
          if (actionRaw.type === "transfer") {
            toAcc = accounts.find((a) => a.id !== targetAcc.id) || accounts[1];
          }

          const action: ParsedAction = {
            type: actionRaw.type,
            amount: piastres,
            amountEgp,
            description: actionRaw.description || (actionRaw.type === "expense" ? "مصروف" : "دخل"),
            category: actionRaw.category || "أخرى",
            accountId: targetAcc.id,
            accountName: targetAcc.name,
            toAccountId: toAcc?.id,
            toAccountName: toAcc?.name,
            requiresConfirmation: true,
            confirmationMessage: messageText,
          };

          result = {
            text: messageText,
            action,
          };
        } catch (e) {
          console.error("Failed to parse action json", e);
          result = { text: reply };
        }
      } else {
        result = { text: reply };
      }
    } catch (error) {
      console.error("OpenAI call failed, falling back to local Egyptian parser", error);
      const msg = error instanceof Error ? error.message : "";
      // Detect low-credit / quota errors so the user knows why the AI isn't reasoning
      if (/402|credits|quota|insufficient|payment/i.test(msg)) {
        const fallback = await handleLocalEgyptianQuery(userPrompt, userId);
        result = {
          text: `${fallback.text}\n\n⚠️ ملحوظة صغيرة: الموديل اللي راكب — ${config.model} — محتاج إضافة كريدت في حسابك على OpenRouter عشان يرد عليك بذكاء حقيقي. كل حاجة ماشية تمام على بالمساعد المحلي في أثناء كده. 💪`,
          action: fallback.action,
        };
      } else {
        result = await handleLocalEgyptianQuery(userPrompt, userId);
      }
    }
  }

  // Persist the assistant reply so memory keeps the full conversation
  if (result.text) {
    await saveAiMessage(userId, "assistant", result.text);
  }
  return result;
}