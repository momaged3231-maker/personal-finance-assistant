import { NextRequest, NextResponse } from "next/server";
import { getActiveUserId } from "@/lib/auth";
import {
  getRecurringBills,
  getRecurringBillById,
  createRecurringBill,
  updateRecurringBill,
  deleteRecurringBill,
  getUpcomingBills,
  getDueBills,
  processDailyBills,
} from "@/lib/bills";

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
    const id = searchParams.get("id");

    if (id) {
      const bill = await getRecurringBillById(Number(id), userId);
      if (!bill) {
        return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
      }
      return NextResponse.json({ bill });
    }

    if (view === "upcoming") {
      const days = Number(searchParams.get("days")) || 30;
      const bills = await getUpcomingBills(userId, days);
      return NextResponse.json({ bills });
    }

    if (view === "due") {
      const bills = await getDueBills(userId);
      return NextResponse.json({ bills });
    }

    // Default: all bills
    const bills = await getRecurringBills(userId);
    return NextResponse.json({ bills });
  } catch (error: unknown) {
    console.error("Bills GET Error:", error);
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

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { name, amount, category, account_id, frequency, day_of_month, next_due_date, end_date, reminder_days, auto_pay, notes } = body;
      
      if (!name || !amount || !next_due_date) {
        return NextResponse.json({ error: "الاسم والمبلغ وتاريخ الاستحقاق مطلوبة" }, { status: 400 });
      }

      const bill = await createRecurringBill({
        name,
        amount: Number(amount),
        category,
        account_id: account_id ? Number(account_id) : null,
        frequency,
        day_of_month: day_of_month ? Number(day_of_month) : undefined,
        next_due_date,
        end_date,
        reminder_days: reminder_days ? Number(reminder_days) : undefined,
        auto_pay,
        notes,
      }, userId);

      return NextResponse.json({ success: true, bill });
    }

    if (action === "update") {
      const { id, ...updates } = body;
      if (!id) {
        return NextResponse.json({ error: "معرف الفاتورة مطلوب" }, { status: 400 });
      }

      // Convert numeric fields
      if (updates.amount !== undefined) updates.amount = Number(updates.amount);
      if (updates.account_id !== undefined) updates.account_id = updates.account_id ? Number(updates.account_id) : null;
      if (updates.day_of_month !== undefined) updates.day_of_month = Number(updates.day_of_month);
      if (updates.reminder_days !== undefined) updates.reminder_days = Number(updates.reminder_days);

      const bill = await updateRecurringBill(Number(id), updates, userId);
      if (!bill) {
        return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
      }
      return NextResponse.json({ success: true, bill });
    }

    if (action === "delete") {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ error: "معرف الفاتورة مطلوب" }, { status: 400 });
      }

      await deleteRecurringBill(Number(id), userId);
      return NextResponse.json({ success: true });
    }

    if (action === "toggle_active") {
      const { id, is_active } = body;
      if (!id || is_active === undefined) {
        return NextResponse.json({ error: "معرف الفاتورة والحالة مطلوبان" }, { status: 400 });
      }

      const bill = await updateRecurringBill(Number(id), { is_active: Boolean(is_active) }, userId);
      if (!bill) {
        return NextResponse.json({ error: "الفاتورة غير موجودة" }, { status: 404 });
      }
      return NextResponse.json({ success: true, bill });
    }

    if (action === "process_daily") {
      // Cron endpoint - can be called by Vercel Cron or external scheduler
      const result = await processDailyBills(userId);
      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Bills POST Error:", error);
    const message = error instanceof Error ? error.message : "Error performing operation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}