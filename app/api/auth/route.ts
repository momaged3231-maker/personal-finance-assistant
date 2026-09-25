import { NextRequest, NextResponse } from "next/server";
import { getActiveUserId, getUserById, getUserByEmail } from "@/lib/auth";
import { requireSupabase } from "@/lib/supabase";
import { signValue } from "@/lib/cookie-sign";
import { hashPassword, verifyPassword, isHashedPassword, isWeakPassword } from "@/lib/password";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const impersonateId = cookieStore.get("finance_impersonate_user_id")?.value;
    const isImpersonating = Boolean(impersonateId);

    const activeUserId = await getActiveUserId();
    const user = activeUserId ? await getUserById(activeUserId) : null;

    return NextResponse.json({
      authenticated: Boolean(user),
      user: user ? sanitizeUser(user as unknown as Record<string, unknown>) : null,
      isImpersonating,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error getting session";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Never leak the raw password column to the browser
function sanitizeUser(user: Record<string, unknown>) {
  const safe = { ...user };
  delete safe.password;
  return safe;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const cookieStore = await cookies();

    // 1. LOGIN
    if (action === "login") {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ error: "يرجى إدخال البريد الإلكتروني وكلمة المرور" }, { status: 400 });
      }

      const user = await getUserByEmail(email);
      if (!user) {
        return NextResponse.json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }, { status: 401 });
      }

      // Check password — hashed rows verify via scrypt; legacy plaintext rows are
      // compared once then migrated to a hash on success.
      let passwordOk = false;
      if (isHashedPassword(user.password)) {
        passwordOk = verifyPassword(password, user.password);
      } else {
        passwordOk = Boolean(user.password && user.password === password && password);
        if (passwordOk) {
          // Upgrade the legacy plaintext row to a hash (best-effort; retried on next login)
          try {
            const client = requireSupabase();
            await client.from("users").update({ password: hashPassword(password) }).eq("id", user.id);
          } catch {
            // Non-fatal: login succeeds, migration retries next time
          }
        }
      }

      if (!passwordOk) {
        return NextResponse.json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" }, { status: 401 });
      }

      if (user.is_blocked) {
        return NextResponse.json({ error: "تم حظر هذا الحساب من دخول النظام. يرجى التواصل مع الإدارة." }, { status: 403 });
      }

      // Set cookie
      cookieStore.set("finance_user_id", signValue(String(user.id)), {
        path: "/",
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      cookieStore.delete("finance_impersonate_user_id");

      return NextResponse.json({ success: true, user: sanitizeUser(user as unknown as Record<string, unknown>) });
    }

    // 2. REGISTER / SIGNUP
    if (action === "register") {
      const { name, email, password, phone, plan } = body;
      if (!name || !email || !password) {
        return NextResponse.json({ error: "يرجى تعبئة جميع الحقول الإلزامية" }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: "كلمة المرور يجب ألا تقل عن 6 أحرف" }, { status: 400 });
      }
      if (isWeakPassword(password)) {
        return NextResponse.json({ error: "كلمة مرور ضعيفة جداً. اختر كلمة مرور أقوى." }, { status: 400 });
      }

      const existing = await getUserByEmail(email);
      if (existing) {
        return NextResponse.json({ error: "هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول." }, { status: 400 });
      }

      const client = requireSupabase();
      const now = new Date();
      const planType = plan || "monthly";
      const days = planType === "annual" ? 365 : planType === "semi-annual" ? 180 : 30;
      const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

      const { data: newUser, error } = await client
        .from("users")
        .insert({
          name,
          email: email.trim().toLowerCase(),
          password: hashPassword(password),
          phone: phone || null,
          plan: planType,
          status: "active",
          expires_at: expiresAt,
          is_admin: false,
        })
        .select()
        .single();

      if (error) {
        if (String(error.code) === "23505") {
          return NextResponse.json({ error: "هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول." }, { status: 400 });
        }
        throw error;
      }

      const newUserId = Number((newUser as { id: number }).id);

      // Initialize default accounts for this new tenant
      const defaultAccounts = ["الكاش", "البنك", "فودافون كاش"];
      for (const accName of defaultAccounts) {
        await client.from("accounts").insert({ user_id: newUserId, name: accName, opening_balance: 0 });
      }

      // Initialize default categories for this new tenant
      const defaultCats = [
        { name: "طعام ومشروبات", type: "expense", icon: "Utensils" },
        { name: "مواصلات وبنزين", type: "expense", icon: "Car" },
        { name: "فواتير والتزامات", type: "expense", icon: "Receipt" },
        { name: "تسوق ومشتريات", type: "expense", icon: "ShoppingBag" },
        { name: "صحة وعلاج", type: "expense", icon: "HeartPulse" },
        { name: "أخرى", type: "expense", icon: "MoreHorizontal" },
        { name: "مرتب", type: "income", icon: "Briefcase" },
        { name: "دخل إضافي", type: "income", icon: "Coins" },
      ];
      for (const cat of defaultCats) {
        await client.from("categories").insert({ user_id: newUserId, name: cat.name, type: cat.type, icon: cat.icon });
      }

      // Auto login
      cookieStore.set("finance_user_id", signValue(String(newUserId)), {
        path: "/",
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 30,
      });

      const freshUser = await getUserById(newUserId);
      return NextResponse.json({ success: true, user: freshUser ? sanitizeUser(freshUser as unknown as Record<string, unknown>) : null });
    }

    // 3. IMPERSONATE (restricted: only the current admin may switch, and only while staying the admin)
    if (action === "impersonate") {
      const { targetUserId } = body;
      const callerId = await getActiveUserId();
      if (!callerId) {
        return NextResponse.json({ error: "غير مصرح", status: "unauthorized" }, { status: 401 });
      }
      const caller = await getUserById(callerId);
      if (!caller?.is_admin) {
        return NextResponse.json({ error: "هذا الإجراء متاح للإدارة فقط" }, { status: 403 });
      }

      const targetUser = await getUserById(Number(targetUserId));
      if (!targetUser) {
        return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
      }

      cookieStore.set("finance_impersonate_user_id", signValue(String(targetUser.id)), {
        path: "/",
        httpOnly: true,
      });

      return NextResponse.json({ success: true, user: sanitizeUser(targetUser as unknown as Record<string, unknown>) });
    }

    // 4. EXIT IMPERSONATION
    if (action === "exit_impersonate") {
      cookieStore.delete("finance_impersonate_user_id");
      return NextResponse.json({ success: true });
    }

    // 5. LOGOUT
    if (action === "logout") {
      cookieStore.delete("finance_user_id");
      cookieStore.delete("finance_impersonate_user_id");
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error performing auth action";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}