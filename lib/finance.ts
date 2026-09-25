import { requireSupabase } from "./supabase";
import {
  Account,
  Transaction,
  DailySummary,
  MonthlySummary,
  getTodayDateString,
  egpToPiastres,
  formatEgp,
  piastresToEgp,
} from "./types";

export * from "./types";

type SupabaseClient = ReturnType<typeof requireSupabase>;

function monthBounds(monthStr: string): { start: string; end: string } {
  const [y, m] = monthStr.split("-").map(Number);
  const nextYear = m === 12 ? y + 1 : y;
  const nextMonth = m === 12 ? 1 : m + 1;
  return {
    start: `${monthStr}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}

async function fetchAccountsMap(client: SupabaseClient, userId: number): Promise<Map<number, Account>> {
  const { data, error } = await client.from("accounts").select("*").eq("user_id", userId);
  if (error) throw error;
  const map = new Map<number, Account>();
  for (const acc of (data || []) as Account[]) {
    map.set(acc.id, acc);
  }
  return map;
}

function attachAccountNames(
  rows: Transaction[],
  accountsMap: Map<number, Account>
): Transaction[] {
  return rows.map((t) => ({
    ...t,
    account_name: accountsMap.get(t.account_id)?.name || "غير معروف",
    to_account_name: t.to_account_id ? accountsMap.get(t.to_account_id)?.name || "غير معروف" : null,
  }));
}

// Get all accounts with dynamically computed real-time balances for a specific user
export async function getAccounts(userId = 1): Promise<Account[]> {
  const client = requireSupabase();

  const { data: accounts, error: accError } = await client
    .from("accounts")
    .select("*")
    .eq("user_id", userId)
    .order("id", { ascending: true });
  if (accError) throw accError;

  const { data: transactions, error: txError } = await client
    .from("transactions")
    .select("account_id, to_account_id, amount, type")
    .eq("user_id", userId);
  if (txError) throw txError;

  const balanceMap = new Map<number, number>();
  for (const acc of (accounts || []) as Account[]) {
    balanceMap.set(acc.id, acc.opening_balance || 0);
  }

  for (const t of (transactions || []) as Array<{ account_id: number; to_account_id?: number | null; amount: number; type: string }>) {
    if (t.type === "income") {
      balanceMap.set(t.account_id, (balanceMap.get(t.account_id) || 0) + t.amount);
    } else if (t.type === "expense") {
      balanceMap.set(t.account_id, (balanceMap.get(t.account_id) || 0) - t.amount);
    } else if (t.type === "transfer") {
      balanceMap.set(t.account_id, (balanceMap.get(t.account_id) || 0) - t.amount);
      if (t.to_account_id) {
        balanceMap.set(t.to_account_id, (balanceMap.get(t.to_account_id) || 0) + t.amount);
      }
    }
  }

  return ((accounts || []) as Account[]).map((account) => ({
    ...account,
    balance: balanceMap.get(account.id) || 0,
  }));
}

// Get summary for a specific day
export async function getDailySummary(dateStr = getTodayDateString(), userId = 1): Promise<DailySummary> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("transactions")
    .select("type, amount")
    .eq("user_id", userId)
    .eq("date", dateStr);
  if (error) throw error;

  let income = 0;
  let expense = 0;
  let transferCount = 0;
  for (const t of (data || []) as Array<{ type: string; amount: number }>) {
    if (t.type === "income") income += t.amount;
    else if (t.type === "expense") expense += t.amount;
    else if (t.type === "transfer") transferCount += 1;
  }

  return {
    date: dateStr,
    income,
    expense,
    net: income - expense,
    transferCount,
    transactionsCount: (data || []).length,
  };
}

// Get monthly summary (YYYY-MM)
export async function getMonthlySummary(monthStr?: string, userId = 1): Promise<MonthlySummary> {
  const client = requireSupabase();
  const currentMonth = monthStr || getTodayDateString().substring(0, 7);
  const { start, end } = monthBounds(currentMonth);

  const { data, error } = await client
    .from("transactions")
    .select("type, amount, category")
    .eq("user_id", userId)
    .gte("date", start)
    .lt("date", end);
  if (error) throw error;

  let income = 0;
  let expense = 0;
  let maintenanceIncome = 0;
  let salaryIncome = 0;

  for (const t of (data || []) as Array<{ type: string; amount: number; category: string }>) {
    if (t.type === "income") {
      income += t.amount;
      if (t.category === "عمولة" || t.category === "صيانة") maintenanceIncome += t.amount;
      if (t.category === "مرتب") salaryIncome += t.amount;
    } else if (t.type === "expense") {
      expense += t.amount;
    }
  }

  return {
    month: currentMonth,
    income,
    expense,
    net: income - expense,
    maintenanceIncome,
    salaryIncome,
    otherIncome: income - maintenanceIncome - salaryIncome,
  };
}

// Get recent transactions with account names
export async function getRecentTransactions(limit = 10, userId = 1): Promise<Transaction[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const accountsMap = await fetchAccountsMap(client, userId);
  return attachAccountNames((data || []) as Transaction[], accountsMap);
}

// Get transactions for a specific date or month
export async function getTransactionsByDate(dateStr: string, userId = 1): Promise<Transaction[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("date", dateStr)
    .order("id", { ascending: false });
  if (error) throw error;

  const accountsMap = await fetchAccountsMap(client, userId);
  return attachAccountNames((data || []) as Transaction[], accountsMap);
}

// Get expense breakdown by category for date range or month
export async function getExpenseCategoriesBreakdown(monthStr?: string, userId = 1) {
  const client = requireSupabase();
  const currentMonth = monthStr || getTodayDateString().substring(0, 7);
  const { start, end } = monthBounds(currentMonth);

  const { data, error } = await client
    .from("transactions")
    .select("category, amount")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("date", start)
    .lt("date", end);
  if (error) throw error;

  const breakdownMap = new Map<string, { total: number; count: number }>();
  for (const t of (data || []) as Array<{ category: string; amount: number }>) {
    const cur = breakdownMap.get(t.category) || { total: 0, count: 0 };
    cur.total += t.amount;
    cur.count += 1;
    breakdownMap.set(t.category, cur);
  }

  return Array.from(breakdownMap.entries())
    .map(([category, { total, count }]) => ({ category, total, count }))
    .sort((a, b) => b.total - a.total);
}

// Get categories
export async function getCategories(type?: "expense" | "income", userId = 1) {
  const client = requireSupabase();
  let query = client.from("categories").select("*").eq("user_id", userId);
  if (type) {
    query = query.eq("type", type);
  }
  const { data, error } = await query.order("id", { ascending: true });
  if (error) throw error;
  return (data || []) as Array<{ id: number; user_id?: number; name: string; type: "expense" | "income"; icon?: string }>;
}

async function fetchTransactionById(client: SupabaseClient, id: number, userId: number): Promise<Transaction | null> {
  const { data, error } = await client
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const accountsMap = await fetchAccountsMap(client, userId);
  return attachAccountNames([data as Transaction], accountsMap)[0];
}

// Record an expense
export async function createExpense(data: {
  amount: number; // in piastres
  description: string;
  category?: string;
  accountId: number;
  date?: string;
  userId?: number;
}): Promise<Transaction> {
  const client = requireSupabase();
  const userId = data.userId || 1;
  const now = new Date().toISOString();
  const date = data.date || getTodayDateString();
  const category = data.category || "أخرى";

  const { data: inserted, error } = await client
    .from("transactions")
    .insert({
      user_id: userId,
      type: "expense",
      amount: data.amount,
      description: data.description,
      category,
      account_id: data.accountId,
      to_account_id: null,
      date,
      created_at: now,
    })
    .select()
    .single();

  if (error) throw error;
  const id = Number((inserted as Transaction).id);
  const full = await fetchTransactionById(client, id, userId);
  if (!full) throw error || new Error("Failed to load created expense");
  return full;
}

// Record an income
export async function createIncome(data: {
  amount: number; // in piastres
  description?: string;
  category?: string; // 'مرتب' | 'صيانة' | 'دخل إضافي' | 'أخرى'
  accountId: number;
  date?: string;
  userId?: number;
}): Promise<Transaction> {
  const client = requireSupabase();
  const userId = data.userId || 1;
  const now = new Date().toISOString();
  const date = data.date || getTodayDateString();
  const category = data.category || "دخل إضافي";
  const description = data.description || category;

  const { data: inserted, error } = await client
    .from("transactions")
    .insert({
      user_id: userId,
      type: "income",
      amount: data.amount,
      description,
      category,
      account_id: data.accountId,
      to_account_id: null,
      date,
      created_at: now,
    })
    .select()
    .single();

  if (error) throw error;
  const id = Number((inserted as Transaction).id);
  const full = await fetchTransactionById(client, id, userId);
  if (!full) throw error || new Error("Failed to load created income");
  return full;
}

// Record a transfer
export async function createTransfer(data: {
  amount: number; // in piastres
  description?: string;
  fromAccountId: number;
  toAccountId: number;
  date?: string;
  userId?: number;
}): Promise<Transaction> {
  if (data.fromAccountId === data.toAccountId) {
    throw new Error("لا يمكن التحويل لنفس الحساب");
  }

  const client = requireSupabase();
  const userId = data.userId || 1;
  const now = new Date().toISOString();
  const date = data.date || getTodayDateString();
  const description = data.description || "تحويل بين الحسابات";

  const { data: inserted, error } = await client
    .from("transactions")
    .insert({
      user_id: userId,
      type: "transfer",
      amount: data.amount,
      description,
      category: "تحويل",
      account_id: data.fromAccountId,
      to_account_id: data.toAccountId,
      date,
      created_at: now,
    })
    .select()
    .single();

  if (error) throw error;
  const id = Number((inserted as Transaction).id);
  const full = await fetchTransactionById(client, id, userId);
  if (!full) throw error || new Error("Failed to load created transfer");
  return full;
}

// Delete transaction (scoped to userId)
export async function deleteTransaction(id: number, userId?: number): Promise<boolean> {
  const client = requireSupabase();
  const query = client.from("transactions").delete().eq("id", id);
  if (userId) query.eq("user_id", userId);
  const { error } = await query;
  if (error) throw error;
  return true;
}

// Update transaction (scoped to userId)
export async function updateTransaction(
  id: number,
  data: {
    amount: number; // in piastres
    description: string;
    category?: string;
    accountId: number;
    toAccountId?: number | null;
    date: string;
    userId?: number;
  }
): Promise<Transaction> {
  const client = requireSupabase();
  const category = data.category || "أخرى";
  const userId = data.userId;

  const query = client
    .from("transactions")
    .update({
      amount: data.amount,
      description: data.description,
      category,
      account_id: data.accountId,
      to_account_id: data.toAccountId ?? null,
      date: data.date,
    })
    .eq("id", id);
  if (userId) query.eq("user_id", userId);

  const { error } = await query;
  if (error) throw error;

  const safeUserId = userId || 1;
  const full = await fetchTransactionById(client, id, safeUserId);
  if (!full) throw new Error("العملية غير موجودة");
  return full;
}

// Get general dashboard statistics
export async function getDashboardData(userId = 1) {
  const accounts = await getAccounts(userId);
  const todaySummary = await getDailySummary(undefined, userId);
  const recentTransactions = await getRecentTransactions(10, userId);
  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

  return {
    accounts,
    todaySummary,
    recentTransactions,
    totalBalance,
  };
}

// Settings (scoped to the active user)
export async function getSettings(userId = 1): Promise<Record<string, string>> {
  const client = requireSupabase();
  const { data, error } = await client.from("settings").select("key, value").eq("user_id", userId);
  if (error) throw error;
  const settings: Record<string, string> = {};
  for (const row of (data || []) as Array<{ key: string; value: string }>) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function updateSetting(key: string, value: string, userId = 1): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("settings")
    .upsert({ user_id: userId, key, value }, { onConflict: "user_id,key" });
  if (error) throw error;
}

// Account management
export async function createAccount(data: { name: string; openingBalance: number; userId?: number }): Promise<Account> {
  const client = requireSupabase();
  const userId = data.userId || 1;
  const now = new Date().toISOString();
  const { data: inserted, error } = await client
    .from("accounts")
    .insert({ user_id: userId, name: data.name, opening_balance: data.openingBalance, created_at: now })
    .select()
    .single();
  if (error) throw error;

  const acc = inserted as Account;
  return {
    ...acc,
    balance: acc.opening_balance,
  };
}

export async function updateAccount(id: number, data: { name: string; openingBalance: number; userId?: number }): Promise<void> {
  const client = requireSupabase();
  const query = client
    .from("accounts")
    .update({ name: data.name, opening_balance: data.openingBalance })
    .eq("id", id);
  if (data.userId) query.eq("user_id", data.userId);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteAccount(id: number, userId?: number): Promise<boolean> {
  const client = requireSupabase();
  let query = client.from("transactions").select("id", { count: "exact", head: true }).eq("account_id", id);
  if (userId) query = query.eq("user_id", userId) as typeof query;
  const { count, error: countError } = await query;
  if (countError) throw countError;

  if ((count || 0) > 0) {
    throw new Error(`لا يمكن حذف هذا الحساب لوجود ${count} عملية مرتبطة به.`);
  }

  const del = client.from("accounts").delete().eq("id", id);
  if (userId) del.eq("user_id", userId);
  const { error } = await del;
  if (error) throw error;
  return true;
}

// Category management
export async function createCategory(data: { name: string; type: "expense" | "income"; icon?: string; userId?: number }) {
  const client = requireSupabase();
  const userId = data.userId || 1;
  const { data: inserted, error } = await client
    .from("categories")
    .insert({ user_id: userId, name: data.name, type: data.type, icon: data.icon || "Tag" })
    .select()
    .single();
  if (error) throw error;
  return inserted;
}

export async function deleteCategory(id: number, userId?: number): Promise<boolean> {
  const client = requireSupabase();
  const query = client.from("categories").delete().eq("id", id);
  if (userId) query.eq("user_id", userId);
  const { error } = await query;
  if (error) throw error;
  return true;
}

// Full system export (scoped to active user)
export async function getFullBackup(userId = 1) {
  const client = requireSupabase();
  const accounts = await getAccounts(userId);
  const { data: transactions } = await client
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("id", { ascending: false });
  const { data: categories } = await client.from("categories").select("*").eq("user_id", userId);
  const settings = await getSettings(userId);
  return {
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    userId,
    accounts,
    transactions: transactions || [],
    categories: categories || [],
    settings,
  };
}

// Reset all user's transactions
export async function resetTransactions(userId?: number): Promise<void> {
  const client = requireSupabase();
  const query = client.from("transactions").delete();
  if (userId) query.eq("user_id", userId);
  await query;
}

// Admin: Users management
export async function getAdminUsers() {
  const client = requireSupabase();
  const { data, error } = await client.from("users").select("*").order("id", { ascending: true });
  if (error) throw error;
  return (data || []) as Array<Record<string, unknown>>;
}

export async function updateUserSubscription(
  id: number,
  data: { plan: string; status: string; expiresAt?: string }
): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("users")
    .update({ plan: data.plan, status: data.status, expires_at: data.expiresAt || null })
    .eq("id", id);
  if (error) throw error;
}

export async function toggleBlockUser(id: number, isBlocked: boolean, reason = "حظر أمني بواسطة الإدارة"): Promise<void> {
  const client = requireSupabase();
  const flag = isBlocked ? 1 : 0;
  const { error } = await client.from("users").update({ is_blocked: flag }).eq("id", id);
  if (error) throw error;

  const { data: user } = await client.from("users").select("device_id").eq("id", id).maybeSingle();
  const deviceId = (user as { device_id?: string } | null)?.device_id;
  if (deviceId) {
    if (isBlocked) {
      await client
        .from("blocked_devices")
        .upsert({ device_id: deviceId, ip_address: "127.0.0.1", reason, blocked_at: new Date().toISOString() }, { onConflict: "device_id" });
    } else {
      await client.from("blocked_devices").delete().eq("device_id", deviceId);
    }
  }
}

// Admin: Blocked Devices
export async function getBlockedDevices() {
  const client = requireSupabase();
  const { data, error } = await client.from("blocked_devices").select("*").order("id", { ascending: false });
  if (error) throw error;
  return (data || []) as Array<Record<string, unknown>>;
}

export async function blockDevice(data: { deviceId: string; ipAddress?: string; reason?: string }) {
  const client = requireSupabase();
  const { error } = await client
    .from("blocked_devices")
    .upsert(
      {
        device_id: data.deviceId,
        ip_address: data.ipAddress || null,
        reason: data.reason || "حظر يدوي بواسطة الأدمن",
        blocked_at: new Date().toISOString(),
      },
      { onConflict: "device_id" }
    );
  if (error) throw error;
}

export async function unblockDevice(deviceId: string) {
  const client = requireSupabase();
  const { error } = await client.from("blocked_devices").delete().eq("device_id", deviceId);
  if (error) throw error;
}

// Admin: Live Visitors
export async function getLiveVisitors() {
  const client = requireSupabase();
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from("live_visitors")
    .select("*")
    .gte("last_active_at", tenMinutesAgo)
    .order("last_active_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Array<Record<string, unknown>>;
}

export async function recordLiveVisitor(data: { sessionId: string; ip?: string; deviceInfo?: string; page?: string }) {
  const client = requireSupabase();
  const now = new Date().toISOString();
  const { error } = await client.from("live_visitors").upsert(
    {
      session_id: data.sessionId,
      ip_address: data.ip || "197.35.12.8",
      device_info: data.deviceInfo || "Desktop Browser",
      page: data.page || "/",
      last_active_at: now,
    },
    { onConflict: "session_id" }
  );
  if (error) throw error;
}

// -------------------------------------------------------------
// FEATURE 1: Smart SMS / InstaPay / Bank Notification Parser
// -------------------------------------------------------------
export function parseBankNotification(text: string) {
  const cleaned = text.trim();
  let type: "expense" | "income" | "transfer" = "expense";
  let accountName = "البنك";

  // Detect account
  if (/فودافون|vodafone|vf cash/i.test(cleaned)) {
    accountName = "فودافون كاش";
  } else if (/انستاباي|instapay/i.test(cleaned)) {
    accountName = "البنك";
  }

  // Detect type
  if (/إيداع|استلام|تم استلام|وارد|تحويل من|credited|received|deposit/i.test(cleaned)) {
    type = "income";
  } else if (/تحويل إلى|تحويل لمبلغ|transfer to/i.test(cleaned)) {
    type = "transfer";
  } else {
    type = "expense";
  }

  // Extract amount (supports 1,500.50 or 500 or 75.00 EGP / ج.م / جم)
  const amountMatch = cleaned.match(/(\d{1,3}(,\d{3})*(\.\d+)?|\d+(\.\d+)?)\s*(ج\.م|جم|جنيه|EGP)?/i);
  let amountEgp = 0;
  if (amountMatch) {
    const rawNum = amountMatch[1].replace(/,/g, "");
    amountEgp = parseFloat(rawNum);
  }

  // Extract merchant / description
  let description = "معاملة بنكية";
  const merchantMatch = cleaned.match(/(لدى|في|at|merchant|to|من)\s+([A-Za-z0-9\u0600-\u06FF\s]+)/i);
  if (merchantMatch && merchantMatch[2]) {
    description = merchantMatch[2].split(/[.\n,]/)[0].trim().substring(0, 35);
  } else if (type === "income") {
    description = "تحويل / إيداع بنكي";
  } else if (type === "transfer") {
    description = "تحويل انستاباي / محفظة";
  }

  // Detect category
  let category = "أخرى";
  if (/كارفور|سوبرماركت|هايبر|مترو|خير زمان|ماركت|مطعم|اكل|ماك|كنتاكي/i.test(cleaned)) category = "طعام ومشروبات";
  else if (/بنزين|مصر للبترول|طاقة|توتال|شل|اوبر|كريم/i.test(cleaned)) category = "مواصلات وبنزين";
  else if (/صيدلية|الاجزخانة|دكتور|مستشفى|مختبر/i.test(cleaned)) category = "صحة وعلاج";
  else if (/فواتير|we|فودافون|اورنج|كهرباء|غاز/i.test(cleaned)) category = "فواتير والتزامات";
  else if (/مول|زارا|أمازون|جوميا|noon/i.test(cleaned)) category = "تسوق ومشتريات";

  return {
    type,
    amount: egpToPiastres(amountEgp),
    amountEgp,
    description,
    category,
    accountName,
    sourceText: cleaned,
  };
}

// -------------------------------------------------------------
// FEATURE 2: Gam'eya & Debts / Loans Tracker
// -------------------------------------------------------------
export async function getDebts(userId = 1) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("debts")
    .select("*")
    .eq("user_id", userId)
    .order("status", { ascending: true })
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("id", { ascending: false });
  if (error) throw error;
  return (data || []) as Array<Record<string, unknown>>;
}

export async function createDebt(data: {
  type: "gam_eya" | "i_owe" | "owed_to_me";
  title: string;
  personName?: string;
  amount: number; // in piastres
  dueDate?: string;
  userId?: number;
}) {
  const client = requireSupabase();
  const userId = data.userId || 1;
  const now = new Date().toISOString();
  const { data: inserted, error } = await client
    .from("debts")
    .insert({
      user_id: userId,
      type: data.type,
      title: data.title,
      person_name: data.personName || null,
      amount: data.amount,
      paid_amount: 0,
      due_date: data.dueDate || null,
      status: "pending",
      created_at: now,
    })
    .select()
    .single();
  if (error) throw error;
  return Number((inserted as { id: number }).id);
}

export async function updateDebtPayment(id: number, paidAmount: number, status?: "pending" | "paid", userId?: number) {
  const client = requireSupabase();
  let query = client.from("debts").select("amount").eq("id", id);
  if (userId) query = query.eq("user_id", userId);
  const { data: debt, error: getError } = await query.maybeSingle();
  if (getError) throw getError;
  if (!debt) return;

  const amount = (debt as { amount: number }).amount;
  const finalStatus = status || (paidAmount >= amount ? "paid" : "pending");

  const upd = client.from("debts").update({ paid_amount: paidAmount, status: finalStatus }).eq("id", id);
  if (userId) upd.eq("user_id", userId);
  const { error } = await upd;
  if (error) throw error;
}

export async function updateDebt(
  id: number,
  data: {
    type?: "gam_eya" | "i_owe" | "owed_to_me";
    title?: string;
    personName?: string | null;
    amount?: number;
    dueDate?: string | null;
  },
  userId?: number
) {
  const client = requireSupabase();
  const updateObj: Record<string, unknown> = {};
  if (data.type) updateObj.type = data.type;
  if (data.title) updateObj.title = data.title;
  if ("personName" in data) updateObj.person_name = data.personName ?? null;
  if (data.amount !== undefined) updateObj.amount = data.amount;
  if ("dueDate" in data) updateObj.due_date = data.dueDate ?? null;
  if (Object.keys(updateObj).length === 0) return;
  let query = client.from("debts").update(updateObj).eq("id", id);
  if (userId) query = query.eq("user_id", userId);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteDebt(id: number, userId?: number) {
  const client = requireSupabase();
  const query = client.from("debts").delete().eq("id", id);
  if (userId) query.eq("user_id", userId);
  const { error } = await query;
  if (error) throw error;
}

// -------------------------------------------------------------
// FEATURE 3: Savings Goals & Emergency Fund
// -------------------------------------------------------------
export async function getSavingsGoals(userId = 1) {
  const client = requireSupabase();
  const { data, error } = await client.from("savings_goals").select("*").eq("user_id", userId).order("id", { ascending: true });
  if (error) throw error;
  return (data || []) as Array<Record<string, unknown>>;
}

export async function createSavingsGoal(data: {
  title: string;
  targetAmount: number; // in piastres
  currentAmount?: number; // in piastres
  targetDate?: string;
  icon?: string;
  userId?: number;
}) {
  const client = requireSupabase();
  const userId = data.userId || 1;
  const now = new Date().toISOString();
  const { data: inserted, error } = await client
    .from("savings_goals")
    .insert({
      user_id: userId,
      title: data.title,
      target_amount: data.targetAmount,
      current_amount: data.currentAmount || 0,
      target_date: data.targetDate || null,
      icon: data.icon || "Target",
      created_at: now,
    })
    .select()
    .single();
  if (error) throw error;
  return Number((inserted as { id: number }).id);
}

export async function depositToSavingsGoal(id: number, amountPiastres: number, userId?: number) {
  const client = requireSupabase();
  // Supabase can't do numeric increments via update; fetch-then-set to stay safe & correct.
  let query = client.from("savings_goals").select("current_amount").eq("id", id);
  if (userId) query = query.eq("user_id", userId);
  const { data: goal, error: getError } = await query.maybeSingle();
  if (getError) throw getError;
  if (!goal) return;

  const current = (goal as { current_amount: number }).current_amount || 0;
  const updQ = client.from("savings_goals").update({ current_amount: current + amountPiastres }).eq("id", id);
  if (userId) updQ.eq("user_id", userId);
  const { error } = await updQ;
  if (error) throw error;
}

export async function deleteSavingsGoal(id: number, userId?: number) {
  const client = requireSupabase();
  const query = client.from("savings_goals").delete().eq("id", id);
  if (userId) query.eq("user_id", userId);
  const { error } = await query;
  if (error) throw error;
}

// -------------------------------------------------------------
// FEATURE 4: Smart Category Budgets & Warnings
// -------------------------------------------------------------
export async function getCategoryBudgets(monthStr?: string, userId = 1) {
  const client = requireSupabase();
  const currentMonth = monthStr || getTodayDateString().substring(0, 7);
  const { start, end } = monthBounds(currentMonth);

  const { data: budgets, error: budgetError } = await client
    .from("category_budgets")
    .select("category, monthly_limit")
    .eq("user_id", userId)
    .order("category", { ascending: true });
  if (budgetError) throw budgetError;

  const { data: expenses, error: expenseError } = await client
    .from("transactions")
    .select("category, amount")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("date", start)
    .lt("date", end);
  if (expenseError) throw expenseError;

  const spentMap = new Map<string, number>();
  for (const t of (expenses || []) as Array<{ category: string; amount: number }>) {
    spentMap.set(t.category, (spentMap.get(t.category) || 0) + t.amount);
  }

  return ((budgets || []) as Array<{ category: string; monthly_limit: number }>).map((b) => {
    const spent = spentMap.get(b.category) || 0;
    const percentage = b.monthly_limit > 0 ? Math.round((spent / b.monthly_limit) * 100) : 0;
    return {
      category: b.category,
      monthly_limit: b.monthly_limit,
      spent_amount: spent,
      percentage,
      is_warning: percentage >= 80 && percentage < 100,
      is_exceeded: percentage >= 100,
    };
  });
}

export async function setCategoryBudget(category: string, monthlyLimitPiastres: number, userId = 1) {
  const client = requireSupabase();
  const now = new Date().toISOString();
  const { error } = await client
    .from("category_budgets")
    .upsert(
      { user_id: userId, category, monthly_limit: monthlyLimitPiastres, created_at: now },
      { onConflict: "user_id,category" }
    );
  if (error) throw error;
}

// -------------------------------------------------------------
// FEATURE 5: WhatsApp Summary Generator
// -------------------------------------------------------------
export async function generateWhatsAppSummaryText(dateStr = getTodayDateString(), userId = 1): Promise<string> {
  const summary = await getDailySummary(dateStr, userId);
  const accounts = await getAccounts(userId);
  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

  const accText = accounts.map((a) => `• ${a.name}: ${formatEgp(a.balance)}`).join("\n");

  return encodeURIComponent(
    `📊 *التقرير المالي اليومي (${dateStr})*\n\n` +
      `💰 *دخل اليوم:* ${formatEgp(summary.income)}\n` +
      `💸 *مصروف اليوم:* ${formatEgp(summary.expense)}\n` +
      `✨ *صافي اليوم:* ${summary.net >= 0 ? "+" : ""}${formatEgp(summary.net)}\n\n` +
      `🏦 *تفاصيل الأرصدة الحالية:*\n${accText}\n` +
      `👑 *إجمالي الثروة:* ${formatEgp(totalBalance)}\n\n` +
      `تم الإنشاء عبر مساعدك المالي اليومي 🚀`
  );
}

// -------------------------------------------------------------
// Super Admin System Control Helpers
// -------------------------------------------------------------
export async function getSystemSettings(): Promise<Record<string, string>> {
  const client = requireSupabase();
  const { data, error } = await client.from("system_settings").select("key, value");
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const r of (data || []) as Array<{ key: string; value: string }>) {
    map[r.key] = r.value;
  }
  return map;
}

export async function updateSystemSetting(key: string, value: string, description?: string): Promise<void> {
  const client = requireSupabase();
  const now = new Date().toISOString();
  const { error } = await client
    .from("system_settings")
    .upsert({ key, value, description: description || null, updated_at: now }, { onConflict: "key" });
  if (error) throw error;
}

export async function resetUserPassword(userId: number, newPassword: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("users").update({ password: newPassword }).eq("id", userId);
  if (error) throw error;
}

export async function toggleUserAdmin(userId: number, isAdmin: boolean): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("users").update({ is_admin: isAdmin }).eq("id", userId);
  if (error) throw error;
}

export { egpToPiastres, formatEgp, piastresToEgp };