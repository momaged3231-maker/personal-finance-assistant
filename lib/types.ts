export interface Account {
  id: number;
  user_id?: number;
  name: string;
  opening_balance: number; // in piastres
  balance: number; // calculated in piastres
  created_at: string;
}

export interface Transaction {
  id: number;
  user_id?: number;
  type: "income" | "expense" | "transfer";
  amount: number; // in piastres
  description: string;
  category: string;
  account_id: number;
  account_name?: string;
  to_account_id?: number | null;
  to_account_name?: string | null;
  date: string; // YYYY-MM-DD
  created_at: string;
}

export interface DailySummary {
  date: string;
  income: number; // piastres
  expense: number; // piastres
  net: number; // piastres
  transferCount: number;
  transactionsCount: number;
}

export interface MonthlySummary {
  month: string;
  income: number;
  expense: number;
  net: number;
  maintenanceIncome: number;
  salaryIncome: number;
  otherIncome: number;
}

export type ParsedActionType =
  | "expense"
  | "income"
  | "transfer"
  | "debt_create"
  | "debt_payment"
  | "debt_delete"
  | "savings_goal_create"
  | "savings_deposit"
  | "savings_goal_delete"
  | "bill_create"
  | "budget_set"
  | "transaction_delete"
  | "transaction_update"
  | "gam_eya_create";

export interface ParsedAction {
  type: ParsedActionType;
  amount: number; // in piastres (where meaningful)
  amountEgp: number;
  description: string;
  category: string;
  accountId: number;
  accountName: string;
  toAccountId?: number;
  toAccountName?: string;
  // Entity management fields
  entityId?: number; // debt / goal / bill id (for payments, deletions, updates)
  transactionId?: number; // for transaction_delete / transaction_update
  personName?: string; // debt counter-party
  dueDate?: string; // YYYY-MM-DD
  debtKind?: "gam_eya" | "i_owe" | "owed_to_me";
  frequency?: "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  dayOfMonth?: number;
  monthlyInstallment?: number; // piastres — gam'eya installment per month
  totalMonths?: number; // gam'eya cycle length in months
  receiptMonth?: number; // 1-based month index within the cycle when the user collects the pot
  installmentsPaid?: number; // gam'eya installments already paid
  targetAmount?: number; // piastres (savings goal target)
  newAmount?: number; // piastres (transaction_update new amount)
  newCategory?: string; // transaction_update new category
  requiresConfirmation: boolean;
  confirmationMessage: string;
}

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  plan: "free" | "monthly" | "semi-annual" | "annual" | "lifetime";
  status: "active" | "expired" | "pending" | "suspended";
  is_admin?: boolean | number;
  expires_at?: string;
  device_id?: string;
  is_blocked: number;
  created_at: string;
}

export interface BlockedDeviceRecord {
  id: number;
  device_id: string;
  ip_address?: string;
  reason?: string;
  blocked_at: string;
}

export interface LiveVisitorRecord {
  session_id: string;
  ip_address?: string;
  device_info?: string;
  page?: string;
  last_active_at: string;
}

export interface DebtItem {
  id: number;
  user_id?: number;
  type: "gam_eya" | "i_owe" | "owed_to_me";
  title: string;
  person_name?: string;
  amount: number; // in piastres
  paid_amount: number; // in piastres
  due_date?: string;
  status: "pending" | "paid";
  created_at: string;
}

/** Structured metadata for a gam'eya (جمعية) — stored in settings as JSON under `gam_eya_meta:<debtId>`. */
export interface GamEyaMeta {
  monthlyInstallment: number; // piastres per period
  totalMonths: number; // cycle length (number of collection periods)
  receiptMonth: number; // 1-based period index the user collects the pot (0 = not scheduled)
  installmentDay: number; // day-of-month (monthly) or weekday 1-7 (weekly) for payments (0 = not set)
  startDate?: string; // YYYY-MM-DD of the first installment
  frequency?: "daily" | "weekly" | "monthly"; // collection cadence (defaults to "monthly")
}

export interface GamEyaInstallment {
  label: string; // e.g. "القسط 3"
  monthIndex: number; // 1-based
  dueDate: string | null; // YYYY-MM-DD or null
  amount: number; // piastres
  paid: boolean;
}

export interface SavingsGoalItem {
  id: number;
  user_id?: number;
  title: string;
  target_amount: number; // in piastres
  current_amount: number; // in piastres
  target_date?: string;
  icon?: string;
  created_at: string;
}

export interface CategoryBudgetItem {
  category: string;
  user_id?: number;
  monthly_limit: number; // in piastres
  spent_amount: number; // in piastres
  percentage: number;
  is_warning: boolean;
  is_exceeded: boolean;
}

export interface SmartParsedNotification {
  type: "income" | "expense" | "transfer";
  amount: number; // in piastres
  amountEgp: number;
  description: string;
  category: string;
  accountName: string;
  sourceText: string;
}

export interface AssistantResponse {
  text: string;
  action?: ParsedAction;
  data?: Record<string, unknown>;
  /** True when the local parser didn't recognize the intent (should try the LLM) */
  unhandledByLocal?: boolean;
}

// Convert EGP to Piastres (safe integer)
export function egpToPiastres(egp: number | string): number {
  const num = typeof egp === "string" ? parseFloat(egp) : egp;
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

// Convert Piastres to EGP
export function piastresToEgp(piastres: number): number {
  return (piastres || 0) / 100;
}

// Format EGP display
export function formatEgp(piastres: number, withSymbol = true): string {
  const egp = piastresToEgp(piastres);
  const formatted = new Intl.NumberFormat("ar-EG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(egp);
  return withSymbol ? `${formatted} ج.م` : formatted;
}

// General commission formula: (grossAmount - deduction) * userCutPercent
export function calculateCommission(
  grossAmount: number,
  deductionPercent = 10,
  userCutPercent = 50
) {
  const shopDeduction = grossAmount * (deductionPercent / 100);
  const netLabor = grossAmount - shopDeduction;
  const userCommission = netLabor * (userCutPercent / 100);
  return {
    grossAmount,
    deductionAmount: Math.round(shopDeduction * 100) / 100,
    netAmount: Math.round(netLabor * 100) / 100,
    userCommission: Math.round(userCommission * 100) / 100,
    // Aliases for full backward compatibility
    grossLabor: grossAmount,
    shopDeduction: Math.round(shopDeduction * 100) / 100,
    netLabor: Math.round(netLabor * 100) / 100,
  };
}

// Backward compatibility alias
export const calculateMaintenanceCommission = calculateCommission;

// Get today's local date in YYYY-MM-DD
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
