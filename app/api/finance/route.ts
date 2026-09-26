import { NextRequest, NextResponse } from "next/server";
import { getActiveUserId } from "@/lib/auth";
import { isRateLimited } from "@/lib/rate-limit";
import {
  getAccounts,
  getDailySummary,
  getMonthlySummary,
  getRecentTransactions,
  getTransactionsByDate,
  getExpenseCategoriesBreakdown,
  getCategories,
  createExpense,
  createIncome,
  createTransfer,
  deleteTransaction,
  updateTransaction,
  createAccount,
  updateAccount,
  deleteAccount,
  createCategory,
  deleteCategory,
  getFullBackup,
  resetTransactions,
  egpToPiastres,
  getSettings,
  updateSetting,
  calculateMaintenanceCommission,
  parseBankNotification,
  getDebts,
  createDebt,
  updateDebtPayment,
  updateDebt,
  createGamEya,
  updateGamEya,
  getAllGamEyaMeta,
  computeGamEyaInstallments,
  normalizeGamEyaFrequency,
  deleteDebt,
  getSavingsGoals,
  createSavingsGoal,
  depositToSavingsGoal,
  deleteSavingsGoal,
  getCategoryBudgets,
  setCategoryBudget,
  generateWhatsAppSummaryText,
} from "@/lib/finance";

/**
 * Accepts either EGP (default from UI modals) or piastres (from the smart SMS
 * parser / AI action cards) and normalizes to piastres. Values strictly above
 * 1000 are assumed to already be in piastres, mirroring the previous behavior.
 */
function toPiastres(amount: unknown, fallback = 0): number {
  const num = typeof amount === "number" ? amount : Number(amount);
  if (isNaN(num)) return fallback;
  if (num > 1000) return Math.round(num);
  return egpToPiastres(num);
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "غير مصرح - يرجى تسجيل الدخول أولاً", unauthenticated: true },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");
    const date = searchParams.get("date");
    const month = searchParams.get("month");

    if (view === "backup") {
      const backup = await getFullBackup(userId);
      return NextResponse.json(backup);
    }

    if (view === "debts") {
      const debts = await getDebts(userId);
      const gamEyaMeta = await getAllGamEyaMeta(userId);
      const gamEyaSchedules: Record<number, unknown> = {};
      for (const [debtId, meta] of Object.entries(gamEyaMeta)) {
        const nId = Number(debtId);
        const debt = (debts as Array<Record<string, unknown>>).find(
          (d) => Number(d.id) === nId
        ) as { paid_amount?: number } | undefined;
        gamEyaSchedules[nId] = computeGamEyaInstallments(
          { paid_amount: Number(debt?.paid_amount || 0) },
          meta
        );
      }
      return NextResponse.json({ debts, gamEyaMeta, gamEyaSchedules });
    }

    if (view === "goals") {
      const goals = await getSavingsGoals(userId);
      return NextResponse.json({ goals });
    }

    if (view === "budgets") {
      const budgets = await getCategoryBudgets(month || undefined, userId);
      return NextResponse.json({ budgets });
    }

    if (view === "whatsapp") {
      const text = await generateWhatsAppSummaryText(date || undefined, userId);
      return NextResponse.json({ text });
    }

    if (view === "day" && date) {
      const summary = await getDailySummary(date, userId);
      const transactions = await getTransactionsByDate(date, userId);
      const accounts = await getAccounts(userId);
      return NextResponse.json({ summary, transactions, accounts });
    }

    if (view === "analytics") {
      const todaySummary = await getDailySummary(undefined, userId);
      const monthSummary = await getMonthlySummary(month || undefined, userId);
      const categoryBreakdown = await getExpenseCategoriesBreakdown(month || undefined, userId);
      const budgets = await getCategoryBudgets(month || undefined, userId);
      return NextResponse.json({
        today: todaySummary,
        month: monthSummary,
        categories: categoryBreakdown,
        budgets,
      });
    }

    // Default: Dashboard data for active user
    const accounts = await getAccounts(userId);
    const todaySummary = await getDailySummary(undefined, userId);
    const recentTransactions = await getRecentTransactions(15, userId);
    const categories = await getCategories(undefined, userId);
    const settings = await getSettings(userId);
    const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

    return NextResponse.json({
      accounts,
      todaySummary,
      recentTransactions,
      categories,
      settings,
      totalBalance,
    });
  } catch (error: unknown) {
    console.error("API GET Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "غير مصرح - يرجى تسجيل الدخول أولاً", unauthenticated: true },
        { status: 401 }
      );
    }

    if (isRateLimited(`finance-write:${userId}`, 120, 60_000)) {
      return NextResponse.json({ error: "عدد عمليات كبير — انتظر دقيقة وحاول تاني" }, { status: 429 });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create_expense") {
      const { amount, description, category, accountId, date } = body;
      const piastres = toPiastres(amount);
      const transaction = await createExpense({
        amount: piastres,
        description: description || "مصروف",
        category,
        accountId: Number(accountId),
        date,
        userId,
      });
      return NextResponse.json({ success: true, transaction });
    }

    if (action === "create_income") {
      const { amount, description, category, accountId, date, grossLabor } = body;

      let finalAmount = amount;
      let finalDesc = description;

      // Automatic commission calculation if grossLabor/grossAmount is supplied
      if (grossLabor) {
        const comm = calculateMaintenanceCommission(Number(grossLabor));
        finalAmount = comm.userCommission;
        finalDesc = `${description || "إيراد عمولة"} (إجمالي: ${grossLabor} - عمولة: ${comm.userCommission})`;
      }

      const piastres = toPiastres(finalAmount);
      const transaction = await createIncome({
        amount: piastres,
        description: finalDesc || "دخل",
        category: category || "دخل إضافي",
        accountId: Number(accountId),
        date,
        userId,
      });
      return NextResponse.json({ success: true, transaction });
    }

    if (action === "create_transfer") {
      const { amount, description, fromAccountId, toAccountId, date } = body;
      const piastres = toPiastres(amount);
      const transaction = await createTransfer({
        amount: piastres,
        description: description || "تحويل مالي",
        fromAccountId: Number(fromAccountId),
        toAccountId: Number(toAccountId),
        date,
        userId,
      });
      return NextResponse.json({ success: true, transaction });
    }

    if (action === "delete_transaction") {
      const { id } = body;
      const success = await deleteTransaction(Number(id), userId);
      return NextResponse.json({ success });
    }

    if (action === "update_transaction") {
      const { id, amount, description, category, accountId, toAccountId, date } = body;
      const piastres = toPiastres(amount);
      const transaction = await updateTransaction(Number(id), {
        amount: piastres,
        description: description || "عملية مالية",
        category,
        accountId: Number(accountId),
        toAccountId: toAccountId ? Number(toAccountId) : null,
        date,
        userId,
      });
      return NextResponse.json({ success: true, transaction });
    }

    if (action === "update_setting") {
      const { key, value } = body;
      await updateSetting(key, String(value), userId);
      return NextResponse.json({ success: true });
    }

    if (action === "create_account") {
      const { name, openingBalance } = body;
      const piastres = toPiastres(openingBalance || 0);
      const acc = await createAccount({ name, openingBalance: piastres, userId });
      return NextResponse.json({ success: true, account: acc });
    }

    if (action === "update_account") {
      const { id, name, openingBalance } = body;
      const piastres = toPiastres(openingBalance || 0);
      await updateAccount(Number(id), { name, openingBalance: piastres, userId });
      return NextResponse.json({ success: true });
    }

    if (action === "delete_account") {
      const { id } = body;
      await deleteAccount(Number(id), userId);
      return NextResponse.json({ success: true });
    }

    if (action === "create_category") {
      const { name, type, icon } = body;
      const cat = await createCategory({ name, type, icon, userId });
      return NextResponse.json({ success: true, category: cat });
    }

    if (action === "delete_category") {
      const { id } = body;
      await deleteCategory(Number(id), userId);
      return NextResponse.json({ success: true });
    }

    if (action === "reset_data") {
      await resetTransactions(userId);
      return NextResponse.json({ success: true });
    }

    if (action === "parse_notification") {
      const { text } = body;
      const parsed = parseBankNotification(text || "");
      return NextResponse.json({ success: true, parsed });
    }

    if (action === "create_debt") {
      const { type, title, personName, amount, dueDate } = body;
      const piastres = toPiastres(amount);
      const id = await createDebt({
        type,
        title,
        personName,
        amount: piastres,
        dueDate,
        userId,
      });
      return NextResponse.json({ success: true, id });
    }

    if (action === "update_debt_payment") {
      const { id, paidAmount, status } = body;
      const piastres = toPiastres(paidAmount);
      await updateDebtPayment(Number(id), piastres, status, userId);
      return NextResponse.json({ success: true });
    }

    if (action === "update_debt") {
      const { id, type, title, personName, amount, dueDate } = body;
      const piastres = amount !== undefined && amount !== null ? toPiastres(amount) : undefined;
      await updateDebt(
        Number(id),
        {
          type,
          title,
          personName: personName === undefined ? undefined : (personName || null),
          amount: piastres,
          dueDate: dueDate === undefined ? undefined : (dueDate || null),
        },
        userId
      );
      return NextResponse.json({ success: true });
    }

    if (action === "delete_debt") {
      const { id } = body;
      await deleteDebt(Number(id), userId);
      return NextResponse.json({ success: true });
    }

    if (action === "create_gam_eya") {
      const { title, personName, monthlyInstallment, totalMonths, receiptMonth, installmentDay, dueDate, installmentsPaid, frequency } = body;
      const id = await createGamEya({
        title,
        personName,
        monthlyInstallment: egpToPiastres(monthlyInstallment),
        totalMonths: Number(totalMonths),
        receiptMonth: receiptMonth ? Number(receiptMonth) : undefined,
        installmentDay: installmentDay ? Number(installmentDay) : undefined,
        dueDate,
        installmentsPaid: installmentsPaid ? Number(installmentsPaid) : undefined,
        frequency: normalizeGamEyaFrequency(frequency),
        userId,
      });
      return NextResponse.json({ success: true, id });
    }

    if (action === "update_gam_eya") {
      const { id, title, personName, monthlyInstallment, totalMonths, receiptMonth, installmentDay, dueDate, installmentsPaid, frequency } = body;
      await updateGamEya(
        Number(id),
        {
          title,
          personName: personName === undefined ? undefined : (personName || null),
          monthlyInstallment: monthlyInstallment !== undefined && monthlyInstallment !== null ? egpToPiastres(monthlyInstallment) : undefined,
          totalMonths: totalMonths !== undefined && totalMonths !== null ? Number(totalMonths) : undefined,
          receiptMonth: receiptMonth !== undefined && receiptMonth !== null ? Number(receiptMonth) : undefined,
          installmentDay: installmentDay !== undefined && installmentDay !== null ? Number(installmentDay) : undefined,
          dueDate: dueDate === undefined ? undefined : (dueDate || null),
          installmentsPaid: installmentsPaid !== undefined && installmentsPaid !== null ? Number(installmentsPaid) : undefined,
          frequency: frequency === undefined || frequency === null ? undefined : normalizeGamEyaFrequency(frequency),
        },
        userId
      );
      return NextResponse.json({ success: true });
    }

    if (action === "create_goal") {
      const { title, targetAmount, currentAmount, targetDate, icon } = body;
      const targetPiastres = toPiastres(targetAmount);
      const currentPiastres = currentAmount ? toPiastres(currentAmount) : 0;
      const id = await createSavingsGoal({
        title,
        targetAmount: targetPiastres,
        currentAmount: currentPiastres,
        targetDate,
        icon,
        userId,
      });
      return NextResponse.json({ success: true, id });
    }

    if (action === "deposit_goal") {
      const { id, amount } = body;
      const piastres = toPiastres(amount);
      await depositToSavingsGoal(Number(id), piastres, userId);
      return NextResponse.json({ success: true });
    }

    if (action === "delete_goal") {
      const { id } = body;
      await deleteSavingsGoal(Number(id), userId);
      return NextResponse.json({ success: true });
    }

    if (action === "set_budget") {
      const { category, monthlyLimit } = body;
      const piastres = toPiastres(monthlyLimit);
      await setCategoryBudget(category, piastres, userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("API POST Error:", error);
    const message = error instanceof Error ? error.message : "Error performing operation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}