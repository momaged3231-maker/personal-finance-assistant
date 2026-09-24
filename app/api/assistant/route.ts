import { NextRequest, NextResponse } from "next/server";
import { getActiveUserId } from "@/lib/auth";
import { processAssistantMessage, ParsedAction } from "@/lib/ai";
import { createExpense, createIncome, createTransfer } from "@/lib/finance";

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

      let result;
      if (action.type === "expense") {
        result = await createExpense({
          amount: action.amount,
          description: action.description,
          category: action.category,
          accountId: action.accountId,
          userId,
        });
      } else if (action.type === "income") {
        result = await createIncome({
          amount: action.amount,
          description: action.description,
          category: action.category,
          accountId: action.accountId,
          userId,
        });
      } else if (action.type === "transfer") {
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
      }

      return NextResponse.json({
        text: `تم حفظ العملية بنجاح! ✅\nتم تحديث الأرصدة وإحصائيات اليوم فوراً.`,
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