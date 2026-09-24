import { requireSupabase } from "./supabase";
import { egpToPiastres, formatEgp } from "./finance";

export interface RecurringBill {
  id: number;
  user_id: number;
  name: string;
  amount: number; // piastres
  category: string;
  account_id: number | null;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  day_of_month: number; // 1-28, 31 = last day of month
  next_due_date: string; // ISO date
  end_date: string | null;
  reminder_days: number;
  auto_pay: boolean;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBillInput {
  name: string;
  amount: number; // EGP from UI
  category?: string;
  account_id?: number | null;
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  day_of_month?: number;
  next_due_date: string; // ISO date
  end_date?: string | null;
  reminder_days?: number;
  auto_pay?: boolean;
  notes?: string | null;
}

export interface UpdateBillInput extends Partial<CreateBillInput> {
  is_active?: boolean;
}

export interface UpcomingBill extends RecurringBill {
  days_until_due: number;
  is_overdue: boolean;
  is_due_soon: boolean;
}

/**
 * Get all recurring bills for a user
 */
export async function getRecurringBills(userId: number): Promise<RecurringBill[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("recurring_bills")
    .select("*")
    .eq("user_id", userId)
    .order("next_due_date", { ascending: true });

  if (error) throw error;
  return (data as RecurringBill[]) || [];
}

/**
 * Get only active recurring bills
 */
export async function getActiveRecurringBills(userId: number): Promise<RecurringBill[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("recurring_bills")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("next_due_date", { ascending: true });

  if (error) throw error;
  return (data as RecurringBill[]) || [];
}

/**
 * Get a single bill by ID (with ownership check)
 */
export async function getRecurringBillById(id: number, userId: number): Promise<RecurringBill | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("recurring_bills")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as RecurringBill) || null;
}

/**
 * Create a new recurring bill
 */
export async function createRecurringBill(input: CreateBillInput, userId: number): Promise<RecurringBill> {
  const client = requireSupabase();
  const now = new Date().toISOString();

  const { data, error } = await client
    .from("recurring_bills")
    .insert({
      user_id: userId,
      name: input.name,
      amount: egpToPiastres(input.amount),
      category: input.category || "فواتير والتزامات",
      account_id: input.account_id || null,
      frequency: input.frequency || "monthly",
      day_of_month: input.day_of_month || 1,
      next_due_date: input.next_due_date,
      end_date: input.end_date || null,
      reminder_days: input.reminder_days ?? 3,
      auto_pay: input.auto_pay ?? false,
      notes: input.notes || null,
      is_active: true,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) throw error;
  return data as RecurringBill;
}

/**
 * Update a recurring bill
 */
export async function updateRecurringBill(id: number, input: UpdateBillInput, userId: number): Promise<RecurringBill | null> {
  const client = requireSupabase();
  const now = new Date().toISOString();

  const updates: Record<string, unknown> = { updated_at: now };

  if (input.name !== undefined) updates.name = input.name;
  if (input.amount !== undefined) updates.amount = egpToPiastres(input.amount);
  if (input.category !== undefined) updates.category = input.category;
  if (input.account_id !== undefined) updates.account_id = input.account_id;
  if (input.frequency !== undefined) updates.frequency = input.frequency;
  if (input.day_of_month !== undefined) updates.day_of_month = input.day_of_month;
  if (input.next_due_date !== undefined) updates.next_due_date = input.next_due_date;
  if (input.end_date !== undefined) updates.end_date = input.end_date;
  if (input.reminder_days !== undefined) updates.reminder_days = input.reminder_days;
  if (input.auto_pay !== undefined) updates.auto_pay = input.auto_pay;
  if (input.notes !== undefined) updates.notes = input.notes;
  if (input.is_active !== undefined) updates.is_active = input.is_active;

  const { data, error } = await client
    .from("recurring_bills")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  return (data as RecurringBill) || null;
}

/**
 * Delete a recurring bill
 */
export async function deleteRecurringBill(id: number, userId: number): Promise<boolean> {
  const client = requireSupabase();
  const { error } = await client
    .from("recurring_bills")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw error;
  return true;
}

/**
 * Calculate the next due date based on frequency
 */
function calculateNextDueDate(currentDue: string, frequency: RecurringBill['frequency']): string {
  const date = new Date(currentDue);
  switch (frequency) {
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1);
      break;
  }
  return date.toISOString().split('T')[0];
}

/**
 * Get the last day of a month
 */
function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Normalize day_of_month for months with fewer days (e.g., 31 -> 30 for April)
 */
function normalizeDayOfMonth(day: number, dateStr: string): number {
  if (day !== 31) return day;
  const date = new Date(dateStr);
  const lastDay = getLastDayOfMonth(date.getFullYear(), date.getMonth());
  return Math.min(day, lastDay);
}

/**
 * Advance a bill to its next due date (called after payment or cron)
 * Returns the updated bill or null if it should be deactivated (past end_date)
 */
export async function advanceRecurringBill(bill: RecurringBill): Promise<RecurringBill | null> {
  const client = requireSupabase();

  // Check if past end_date
  if (bill.end_date && new Date(bill.next_due_date) > new Date(bill.end_date)) {
    // Deactivate
    await client
      .from("recurring_bills")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", bill.id);
    return null;
  }

  const nextDue = calculateNextDueDate(bill.next_due_date, bill.frequency);
  const normalizedDay = normalizeDayOfMonth(bill.day_of_month, nextDue);
  
  // Adjust day if needed (e.g., 31st -> 30th for April)
  let finalDue = nextDue;
  if (normalizedDay !== bill.day_of_month) {
    const date = new Date(nextDue);
    date.setDate(normalizedDay);
    finalDue = date.toISOString().split('T')[0];
  }

  const { data, error } = await client
    .from("recurring_bills")
    .update({ next_due_date: finalDue, updated_at: new Date().toISOString() })
    .eq("id", bill.id)
    .select()
    .single();

  if (error) throw error;
  return data as RecurringBill;
}

/**
 * Process auto-pay for a bill (creates expense transaction)
 * Returns the created transaction or null if failed
 */
export async function processAutoPay(bill: RecurringBill, userId: number): Promise<{ success: boolean; transactionId?: number; error?: string }> {
  if (!bill.auto_pay || !bill.account_id) {
    return { success: false, error: "Auto-pay not enabled or no account selected" };
  }

  try {
    const { createExpense } = await import("./finance");
    const transaction = await createExpense({
      amount: bill.amount,
      description: bill.name,
      category: bill.category,
      accountId: bill.account_id,
      date: bill.next_due_date,
      userId,
    });
    return { success: true, transactionId: transaction.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "فشل الدفع التلقائي";
    return { success: false, error: msg };
  }
}

/**
 * Get upcoming bills with computed fields (days until due, overdue, etc.)
 */
export async function getUpcomingBills(userId: number, daysAhead = 30): Promise<UpcomingBill[]> {
  const bills = await getActiveRecurringBills(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + daysAhead);

  return bills
    .filter(b => new Date(b.next_due_date) <= cutoff)
    .map(b => {
      const dueDate = new Date(b.next_due_date);
      dueDate.setHours(0, 0, 0, 0);
      const diffMs = dueDate.getTime() - today.getTime();
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      return {
        ...b,
        days_until_due: daysUntil,
        is_overdue: daysUntil < 0,
        is_due_soon: daysUntil >= 0 && daysUntil <= b.reminder_days,
      };
    })
    .sort((a, b) => a.days_until_due - b.days_until_due);
}

/**
 * Get bills due today or overdue (for cron/reminders)
 */
export async function getDueBills(userId: number): Promise<UpcomingBill[]> {
  const bills = await getActiveRecurringBills(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return bills
    .filter(b => new Date(b.next_due_date) <= today)
    .map(b => {
      const dueDate = new Date(b.next_due_date);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...b,
        days_until_due: daysUntil,
        is_overdue: daysUntil < 0,
        is_due_soon: true,
      };
    });
}

/**
 * Run daily bill processing (advance due bills, auto-pay, send reminders)
 * This should be called by a cron job daily
 */
export async function processDailyBills(userId: number): Promise<{
  advanced: number;
  autoPaid: number;
  errors: string[];
}> {
  const dueBills = await getDueBills(userId);
  const errors: string[] = [];
  let advanced = 0;
  let autoPaid = 0;

  for (const bill of dueBills) {
    try {
      // Process auto-pay if enabled
      if (bill.auto_pay && bill.account_id) {
        const result = await processAutoPay(bill, userId);
        if (result.success) autoPaid++;
        else errors.push(`${bill.name}: ${result.error}`);
      }

      // Advance to next due date
      const next = await advanceRecurringBill(bill);
      if (next) advanced++;
    } catch (e) {
      errors.push(`${bill.name}: ${e instanceof Error ? e.message : "خطأ غير معروف"}`);
    }
  }

  return { advanced, autoPaid, errors };
}

/**
 * Format bill for display
 */
export function formatBillForDisplay(bill: RecurringBill | UpcomingBill): string {
  const freqLabels: Record<RecurringBill['frequency'], string> = {
    weekly: "أسبوعي",
    monthly: "شهري",
    quarterly: "كل 3 شهور",
    yearly: "سنوي",
  };
  
  const dayStr = bill.day_of_month === 31 ? "آخر الشهر" : `${bill.day_of_month} من كل شهر`;
  const amountStr = formatEgp(bill.amount);
  
  return `${bill.name} — ${amountStr} (${freqLabels[bill.frequency]}, ${dayStr})${bill.is_active ? "" : " ⏸️"}`;
}