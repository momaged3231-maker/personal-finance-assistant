-- =========================================================
-- Personal Finance Assistant - SaaS Multi-Tenant Database
-- منصة المساعد المالي اليومي - قاعدة بيانات SaaS متكاملة (Supabase PostgreSQL)
-- =========================================================

-- 1. Global System Settings (إعدادات المنظومة العامة والتحكم السحابي للمدير العام)
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Users Table (سجل مستخدمي الـ SaaS واشتراكاتهم)
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL DEFAULT '123456',
  phone TEXT,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'monthly', 'semi-annual', 'annual', 'lifetime')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending', 'suspended')),
  is_admin BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ,
  device_id TEXT,
  is_blocked SMALLINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Ensure columns exist in case table was previously created
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT '123456';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_blocked SMALLINT DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 3. Accounts Table (حسابات كل مستخدم: كاش، بنك، محفظة، انستاباي)
CREATE TABLE IF NOT EXISTS public.accounts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  opening_balance BIGINT NOT NULL DEFAULT 0, -- Stored in piastres (1 EGP = 100 piastres)
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT accounts_user_name_unique UNIQUE(user_id, name)
);

-- 4. Categories Table (تصنيفات المصروفات والدخل لكل مستخدم)
CREATE TABLE IF NOT EXISTS public.categories (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT categories_user_name_type_unique UNIQUE (user_id, name, type)
);

-- 5. Transactions Table (المعاملات المالية اليومية الخاصة بالمستخدم)
CREATE TABLE IF NOT EXISTS public.transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount BIGINT NOT NULL, -- Stored in piastres
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  account_id BIGINT NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  to_account_id BIGINT REFERENCES public.accounts(id) ON DELETE RESTRICT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. User Settings Table (إعدادات المستخدم الخاصة: الراتب، قواعد العمولة، رمز العملة)
CREATE TABLE IF NOT EXISTS public.settings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  CONSTRAINT settings_user_key_unique UNIQUE(user_id, key)
);

-- 7. Debts & Gam'eya Table (الجمعيات والديون الخاصة بكل مستخدم)
CREATE TABLE IF NOT EXISTS public.debts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('gam_eya', 'i_owe', 'owed_to_me')),
  title TEXT NOT NULL,
  person_name TEXT,
  amount BIGINT NOT NULL, -- Stored in piastres
  paid_amount BIGINT NOT NULL DEFAULT 0, -- Stored in piastres
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Savings Goals Table (أهداف التوفير وصندوق الطوارئ للمستخدم)
CREATE TABLE IF NOT EXISTS public.savings_goals (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_amount BIGINT NOT NULL, -- in piastres
  current_amount BIGINT NOT NULL DEFAULT 0, -- in piastres
  target_date DATE,
  icon TEXT DEFAULT 'Target',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Category Budgets Table (ميزانيات الفئات الشهرية للمستخدم)
CREATE TABLE IF NOT EXISTS public.category_budgets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  monthly_limit BIGINT NOT NULL, -- in piastres
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT category_budgets_user_cat_unique UNIQUE(user_id, category)
);

-- 10. Recurring Bills Table (الفواتير المتكررة والتنبيهات)
CREATE TABLE IF NOT EXISTS public.recurring_bills (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                    -- اسم الفاتورة: "كهرباء", "نت", "مدرسة"
  amount BIGINT NOT NULL,                -- المبلغ بالقرش
  category TEXT NOT NULL DEFAULT 'فواتير والتزامات',
  account_id BIGINT REFERENCES public.accounts(id) ON DELETE SET NULL, -- الحساب اللي يتدفع منه
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  day_of_month SMALLINT NOT NULL DEFAULT 1,  -- يوم الاستحقاق (1-28, أو 31 = آخر الشهر)
  next_due_date DATE NOT NULL,           -- أول استحقاق قادم
  end_date DATE,                         -- تاريخ انتهاء (اختياري)
  reminder_days SMALLINT NOT NULL DEFAULT 3, -- كم يوم قبل الاستحقاق يبعتله تذكير
  auto_pay BOOLEAN NOT NULL DEFAULT false,   -- هل يسجّل مصروف أوتوماتيك يوم الاستحقاق
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_recurring_bills_user_due ON public.recurring_bills(user_id, next_due_date) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_recurring_bills_due_today ON public.recurring_bills(next_due_date) WHERE is_active;

-- 11. AI Messages Table (محادثات المساعد الذكي لكل مستخدم)
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  action_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. Blocked Devices Table (الأجهزة المحظورة في النظام)
CREATE TABLE IF NOT EXISTS public.blocked_devices (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  reason TEXT,
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. Live Visitors Table (زوار الموقع والمنصة لايف)
CREATE TABLE IF NOT EXISTS public.live_visitors (
  session_id TEXT PRIMARY KEY,
  ip_address TEXT,
  device_info TEXT,
  page TEXT,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. Subscription Requests Table (طلبات الاشتراك وتحويلات الأموال عبر انستاباي / فودافون كاش)
CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  amount_paid BIGINT NOT NULL, -- in piastres
  payment_method TEXT NOT NULL, -- 'instapay', 'vodafone_cash', 'fawry', 'card'
  transaction_ref TEXT,
  receipt_image TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. Marketing Leads Table (قائمة الإشعارات وقائمة الإطلاق التسويقية)
CREATE TABLE IF NOT EXISTS public.marketing_leads (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  goal TEXT,
  source TEXT NOT NULL DEFAULT 'waitlist' CHECK (source IN ('waitlist', 'signup', 'google')),
  user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'opted_out', 'converted')),
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 15. User Marketing Profiles Table (بيانات المشتركين لهدف التسويق المستقبلي)
CREATE TABLE IF NOT EXISTS public.user_marketing_profiles (
  user_id BIGINT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  primary_goal TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- =========================================================
-- Performance Indexes
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_debts_user ON public.debts(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON public.savings_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_user ON public.ai_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_bills_user_due ON public.recurring_bills(user_id, next_due_date) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_recurring_bills_due_today ON public.recurring_bills(next_due_date) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_marketing_leads_source ON public.marketing_leads(source);

-- =========================================================
-- Account Balances View (أرصدة الحسابات الجارية)
-- Computes live balances from opening balances + transactions,
-- so the app no longer needs N+1 queries for the dashboard.
-- =========================================================
CREATE OR REPLACE VIEW public.account_balances AS
SELECT
  a.id AS account_id,
  a.user_id,
  a.name,
  a.opening_balance,
  a.opening_balance
    + COALESCE(SUM(
          CASE
            WHEN t.type = 'income' THEN t.amount
            WHEN t.type = 'expense' THEN -t.amount
            WHEN t.type = 'transfer' AND t.account_id = a.id THEN -t.amount
            WHEN t.type = 'transfer' AND t.to_account_id = a.id THEN t.amount
            ELSE 0
          END
        ), 0) AS balance
FROM public.accounts a
LEFT JOIN public.transactions t
  ON t.account_id = a.id OR t.to_account_id = a.id
GROUP BY a.id, a.user_id, a.name, a.opening_balance;

-- =========================================================
-- Row Level Security (RLS) & Policies
-- Access is restricted: the application talks to Postgres ONLY through
-- the Supabase service-role key (server-side in lib/supabase.ts), which
-- bypasses RLS. No anonymous/browser policies are granted here, so the
-- anon/publishable key cannot read or mutate any table if it is ever enabled.
-- =========================================================
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_marketing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_bills ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;

-- =========================================================
-- Initial Seed Data: Super Admin & System Configuration
-- =========================================================

-- Super Admin Global Settings
INSERT INTO public.system_settings (key, value, description)
VALUES
  ('platform_name', 'مساعدك المالي الشخصي', 'اسم المنصة العام'),
  ('maintenance_mode', 'false', 'تفعيل وضع الصيانة وإيقاف الدخول مؤقتاً'),
  ('global_announcement', '', 'رسالة تنبيهية تظهر لجميع العملاء أعلى الشاشة'),
  ('pro_monthly_price', '149', 'سعر الاشتراك الشهري بالجنيه المصري'),
  ('pro_annual_price', '89', 'سعر الاشتراك السنوي الشهري بالجنيه المصري'),
  ('instapay_account', 'fintech@instapay', 'عنوان حساب انستاباي لاستقبال أموال الاشتراكات'),
  ('vodafone_cash_number', '01000000000', 'رقم فودافون كاش لتحويل الاشتراكات'),
  ('free_ai_daily_limit', '15', 'الحد الأقصى لرسائل الذكاء الاصطناعي اليومية للمستخدم المجاني')
ON CONFLICT (key) DO NOTHING;

-- Super Admin User (User 1)
INSERT INTO public.users (id, name, email, password, phone, plan, status, is_admin, expires_at)
VALUES
  (1, 'المدير العام والمالك (Super Admin)', 'admin@fintech.eg', 'admin123', '01099887766', 'lifetime', 'active', true, now() + interval '3650 days')
ON CONFLICT (id) DO UPDATE SET is_admin = excluded.is_admin;

-- Default Accounts for Super Admin
INSERT INTO public.accounts (user_id, name, opening_balance)
VALUES
  (1, 'الكاش', 50000),
  (1, 'البنك', 100000),
  (1, 'فودافون كاش', 25000)
ON CONFLICT (user_id, name) DO NOTHING;

-- Default Categories for Super Admin
INSERT INTO public.categories (user_id, name, type, icon)
VALUES
  (1, 'طعام ومشروبات', 'expense', 'Utensils'),
  (1, 'سجائر', 'expense', 'Cigarette'),
  (1, 'مواصلات وبنزين', 'expense', 'Car'),
  (1, 'فواتير والتزامات', 'expense', 'Receipt'),
  (1, 'تسوق ومشتريات', 'expense', 'ShoppingBag'),
  (1, 'صحة وعلاج', 'expense', 'HeartPulse'),
  (1, 'ترفيه وخروجات', 'expense', 'Smile'),
  (1, 'أخرى', 'expense', 'MoreHorizontal'),
  (1, 'عمولة', 'income', 'Percent'),
  (1, 'مرتب', 'income', 'Briefcase'),
  (1, 'دخل إضافي', 'income', 'DollarSign')
ON CONFLICT (user_id, name, type) DO NOTHING;

-- Default Settings for Super Admin
INSERT INTO public.settings (user_id, key, value)
VALUES
  (1, 'commission_shop_cut', '10'),
  (1, 'commission_user_cut', '50'),
  (1, 'monthly_salary', '15000'),
  (1, 'currency_symbol', 'ج.م'),
  (1, 'current_role', 'admin')
ON CONFLICT (user_id, key) DO NOTHING;
