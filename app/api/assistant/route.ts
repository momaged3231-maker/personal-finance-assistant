import { NextRequest, NextResponse } from "next/server";
import { getActiveUserId } from "@/lib/auth";
import {
  processAssistantMessage,
  getConversationHistory,
  saveAiMessage,
  updateHabitsWithAction,
  computeNextDueDate,
  ParsedAction,
} from "@/lib/ai";
import {
  createExpense,
  createIncome,
  createTransfer,
  getCategoryBudgets,
  setCategoryBudget,
  getDebts,
  createDebt,
  updateDebtPayment,
  deleteDebt,
  getSavingsGoals,
  createSavingsGoal,
  depositToSavingsGoal,
  deleteSavingsGoal,
  deleteTransaction,
  updateTransaction,
  getRecentTransactions,
  formatEgp,
} from "@/lib/finance";
import { createRecurringBill } from "@/lib/bills";

function resolveEntity(list: Array<Record<string, unknown>>, action: ParsedAction): Record<string, unknown> {
  if (action.entityId) {
    const byId = list.find((d) => Number(d.id) === action.entityId);
    if (byId) return byId;
  }
  return (
    list.find((d) =>
      String(d.title || d.description || "").includes(action.description)
    ) || list[0]
  );
}

// GET: Load the remembered conversation history for the active user
export async function GET() {
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "غير مصرح - يرجى تسجيل الدخول أولاً", unauthenticated: true },
        { status: 401 }
      );
    }
    const history = await getConversationHistory(userId, 50);
    return NextResponse.json({ history });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error loading history";
    return NextResponse.json({ error: msg }, { status: 500 });
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

    const body = await req.json();
    const { message, confirmAction } = body;

    // If user clicked confirm on a parsed action card
    if (confirmAction) {
      const action = confirmAction as ParsedAction;

      let result: unknown;
      let replyText = "";
      const warnings: string[] = [];

      switch (action.type) {
        case "expense":
          result = await createExpense({
            amount: action.amount,
            description: action.description,
            category: action.category,
            accountId: action.accountId,
            userId,
          });
          // Budget warning if this category is near / over its monthly limit
          {
            const budgets = await getCategoryBudgets(undefined, userId);
            const budget = budgets.find((b) => b.category === action.category);
            if (budget && (budget.is_warning || budget.is_exceeded)) {
              warnings.push(
                budget.is_exceeded
                  ? `🚨 تنبيه الميزانية: تصنيف «${budget.category}» خلص حدك الشهري (${formatEgp(budget.spent_amount)} من ${formatEgp(budget.monthly_limit)}).`
                  : `⚠️ تنبيه الميزانية: تصنيف «${budget.category}» قرب يعدّي حدك (${formatEgp(budget.spent_amount)} من ${formatEgp(budget.monthly_limit)} = ${budget.percentage}%).`
              );
            }
          }
          break;
        case "income":
          result = await createIncome({
            amount: action.amount,
            description: action.description,
            category: action.category,
            accountId: action.accountId,
            userId,
          });
          break;
        case "transfer":
          if (!action.toAccountId) {
            return NextResponse.json({ error: "حساب التحويل غير محدد" }, { status: 400 });
          }
          result = await createTransfer({
            amount: action.amount,
            description: action.description,
            fromAccountId: action.accountId,
            toAccountId: action.toAccountId,
            userId,
          });
          break;
        case "debt_create":
          await createDebt({
            type: action.debtKind || "i_owe",
            title: action.description,
            personName: action.personName,
            amount: action.amount,
            dueDate: action.dueDate,
            userId,
          });
          replyText = "تم تسجيل الدين بنجاح ✅";
          break;
        case "debt_payment": {
          const debts = await getDebts(userId);
          const target = resolveEntity(debts, action);
          if (!target) throw new Error("الدين غير موجود");
          const paid = (Number(target.paid_amount) || 0) + action.amount;
          await updateDebtPayment(Number(target.id), paid, undefined, userId);
          replyText = `تم تسجيل دفعة الدين ✅ — باقي ${formatEgp(Math.max((Number(target.amount) || 0) - paid, 0))}`;
          break;
        }
        case "debt_delete": {
          const debts = await getDebts(userId);
          const target = resolveEntity(debts, action);
          if (!target) throw new Error("الدين غير موجود");
          await deleteDebt(Number(target.id), userId);
          replyText = "تم حذف الدين بنجاح ✅";
          break;
        }
        case "savings_goal_create":
          await createSavingsGoal({
            title: action.description,
            targetAmount: action.targetAmount || action.amount,
            targetDate: action.dueDate,
            userId,
          });
          replyText = `تم إنشاء هدف الادخار «${action.description}» 🎯`;
          break;
        case "savings_deposit": {
          const goals = await getSavingsGoals(userId);
          const target = resolveEntity(goals, action);
          if (!target) throw new Error("الهدف غير موجود");
          await depositToSavingsGoal(Number(target.id), action.amount, userId);
          replyText = `تم الإيداع في هدف «${String(target.title)}» ✅`;
          break;
        }
        case "savings_goal_delete": {
          const goals = await getSavingsGoals(userId);
          const target = resolveEntity(goals, action);
          if (!target) throw new Error("الهدف غير موجود");
          await deleteSavingsGoal(Number(target.id), userId);
          replyText = "تم حذف هدف الادخار ✅";
          break;
        }
        case "bill_create":
          await createRecurringBill(
            {
              name: action.description,
              amount: action.amountEgp,
              category: action.category,
              account_id: action.accountId,
              frequency: action.frequency || "monthly",
              day_of_month: action.dayOfMonth || 1,
              next_due_date: action.dueDate || computeNextDueDate(action.dayOfMonth || 1),
            },
            userId
          );
          replyText = `تمت إضافة الفاتورة الدورية «${action.description}» 🧾`;
          break;
        case "budget_set":
          await setCategoryBudget(action.description, action.amount, userId);
          replyText = `تم تحديد الحد الشهري لتصنيف «${action.description}» بمبلغ ${formatEgp(action.amount)} 📊`;
          break;
        case "transaction_delete": {
          const recent = await getRecentTransactions(20, userId);
          const target = action.transactionId
            ? recent.find((t) => t.id === action.transactionId)
            : recent[0];
          if (!target) throw new Error("العملية غير موجودة");
          await deleteTransaction(target.id, userId);
          replyText = `تم حذف العملية «${target.description}» بنجاح 🗑️`;
          break;
        }
        case "transaction_update": {
          const recent = await getRecentTransactions(20, userId);
          const target = action.transactionId
            ? recent.find((t) => t.id === action.transactionId)
            : recent[0];
          if (!target) throw new Error("العملية غير موجودة");
          await updateTransaction(
            target.id,
            {
              amount: action.newAmount ?? target.amount,
              description: action.description,
              category: action.category,
              accountId: target.account_id,
              toAccountId: target.to_account_id,
              date: target.date,
              userId,
            }
          );
          replyText = `تم تصحيح العملية إلى «${action.description}» ✏️`;
          break;
        }
        default:
          return NextResponse.json({ error: "نوع العملية غير مدعوم" }, { status: 400 });
      }

      // Learn the user's spending habits after real transactions
      if (["expense", "income", "transfer"].includes(action.type)) {
        await updateHabitsWithAction(userId, action);
      }

      if (!replyText) {
        replyText = "تم حفظ العملية بنجاح! ✅\nتم تحديث الأرصدة وإحصائيات اليوم فوراً.";
      }
      if (warnings.length > 0) {
        replyText += "\n\n" + warnings.join("\n");
      }

      // Save into conversation memory so the assistant knows what was done
      await saveAiMessage(userId, "user", action.confirmationMessage || `تأكيد تسجيل ${action.type}`);
      await saveAiMessage(userId, "assistant", replyText);

      return NextResponse.json({
        text: replyText,
        executed: true,
        transaction: result,
      });
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const response = await processAssistantMessage(message, userId);
    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error("AI Route Error:", error);
    const msg = error instanceof Error ? error.message : "Error processing message";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}