import OpenAI from "openai";
import {
  getAccounts,
  getDailySummary,
  getMonthlySummary,
  getRecentTransactions,
  getExpenseCategoriesBreakdown,
  formatEgp,
  egpToPiastres,
  piastresToEgp,
} from "./finance";

// Initialize OpenAI client if key is set
function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
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

// Local Egyptian Arabic Parser & Financial Query Engine
export async function handleLocalEgyptianQuery(userPrompt: string, userId = 1): Promise<AssistantResponse> {
  const query = userPrompt.trim();
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

  // Default Egyptian friendly assistant reply
  return {
    text: `أهلاً بيك يا باشا! أنا مساعدك المالي الشخصي. 🤖\n\nتقدر تسألني أي سؤال عن فلوسك، أو تطلب مني أسجل لك العمليات مباشرة، زي:\n• "صرفت كام النهارده؟"\n• "معايا كام في البنك؟"\n• "سجل 75 جنيه سجائر"\n• "دخلت 600 عمولة"\n• "حولت 500 للبنك"\n• "أكتر حاجة بصرف عليها إيه؟"`,
  };
}

// Full AI Pipeline: Tries OpenAI first if configured, with rich functions; otherwise falls back smoothly to local Egyptian parser
export async function processAssistantMessage(userPrompt: string, userId = 1): Promise<AssistantResponse> {
  const openai = getOpenAIClient();

  if (!openai) {
    // Return fast, dependable local Egyptian parsing
    return handleLocalEgyptianQuery(userPrompt, userId);
  }

  try {
    const accounts = await getAccounts(userId);
    const today = await getDailySummary(undefined, userId);
    const month = await getMonthlySummary(undefined, userId);
    const topExpenses = await getExpenseCategoriesBreakdown(undefined, userId);
    const recent = await getRecentTransactions(5, userId);

    const systemPrompt = `أنت المساعد المالي الشخصي الذكي لواحد مصري ("مساعدك المالي اليومي").
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
2. لو كان سؤال عادي عن الفلوس أو الصرف أو الإحصائيات: جاوب فوراً بالأرقام الحقيقية بدقة وبلهجة مصرية مهذبة ومشجعة.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
    });

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

        return {
          text: messageText,
          action,
        };
      } catch (e) {
        console.error("Failed to parse action json", e);
      }
    }

    return {
      text: reply,
    };
  } catch (error) {
    console.error("OpenAI call failed, falling back to local Egyptian parser", error);
    return handleLocalEgyptianQuery(userPrompt, userId);
  }
}